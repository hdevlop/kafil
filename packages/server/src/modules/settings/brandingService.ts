import { existsSync } from "node:fs";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";

import { HttpError, Service } from "najm-core";
import { Transaction } from "najm-database";

import { envConfig } from "../../config/envConfig";
import { writeManagedImage } from "../../storage/managedImages";
import { AuditService } from "../audit/auditService";
import {
  BRANDING_ASSET_FILENAME_PATTERN,
  BRANDING_ASSET_PATH_PATTERN,
  BRANDING_ASSET_ROUTE_PREFIX,
} from "./brandingConstants";
import {
  type ResetBrandingDto,
  resetBrandingDto,
  type UpdateBrandingDto,
  updateBrandingDto,
} from "./brandingDto";
import { getFactoryBranding } from "./brandingFactory";
import { BrandingRepository } from "./brandingRepository";
import {
  PLATFORM_SETTINGS_ID,
  DEFAULT_BRANDING_REVISION,
} from "./settingSchema";
import {
  assertBrandingBytesWithinSlotLimit,
  assertBrandingExtensionMatchesMime,
} from "./brandingStorage";
import type {
  AdminBrandingConfig,
  BrandingSlot,
  PublicBranding,
  StoredBranding,
} from "./brandingTypes";

const BRANDING_STORAGE_DIRECTORY = "branding";

const EXTENSION_TO_MIME: Record<string, string> = {
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

function brandingStorageBasePath() {
  /* turbopackIgnore: true */
  return envConfig.storage.basePath;
}

function brandingDirectory() {
  return join(brandingStorageBasePath(), BRANDING_STORAGE_DIRECTORY);
}

export function brandingAssetServePrefix() {
  return BRANDING_ASSET_ROUTE_PREFIX;
}

export function brandingStorageDirectory() {
  return brandingDirectory();
}

function brandingMimeForExtension(extension: string): string | undefined {
  return EXTENSION_TO_MIME[extension.toLowerCase()];
}

function brandingMimeForFileName(fileName: string): string {
  const mime = brandingMimeForExtension(extname(fileName));
  if (!mime) HttpError.create(400, "Invalid branding asset file name");
  return mime;
}

function fileNameOfPath(path: string): string {
  return decodeURIComponent(path.slice(brandingAssetServePrefix().length));
}

function isBrandingFileName(fileName: string): boolean {
  return BRANDING_ASSET_FILENAME_PATTERN.test(fileName);
}

export function decodeBrandingFileName(raw: string): string {
  const fileName = decodeURIComponent(raw);
  if (!isBrandingFileName(fileName)) {
    HttpError.create(400, "Invalid branding asset file name");
  }
  return fileName;
}

export function brandingAssetFileNameRegex() {
  return BRANDING_ASSET_FILENAME_PATTERN;
}

export function brandingAssetPath(fileName: string): string {
  return `${brandingAssetServePrefix()}${encodeURIComponent(fileName)}`;
}

export function assertBrandingAssetPath(path: string) {
  if (!BRANDING_ASSET_PATH_PATTERN.test(path)) {
    HttpError.create(400, "Branding asset must reference a managed upload");
  }
  const fileName = fileNameOfPath(path);
  return { directory: brandingDirectory(), fileName };
}

export function isBrandingAssetFileOnDisk(fileName: string) {
  return existsSync(resolve(brandingDirectory(), fileName));
}

/**
 * Rejects a slot that points at a file managed storage does not have.
 *
 * Only when the path is *new*. A path identical to the committed one is not a
 * new reference — the caller is simply not touching that slot, and a full-slot
 * PUT resubmits all four every time. Enforcing existence there made a record
 * whose file had vanished permanently unsaveable: the only way to clear a dead
 * slot is to save, and one dead slot rejected the whole request, including the
 * slots the admin was trying to fix.
 *
 * The read path already resolves this way — `resolveStoredPath` falls back to
 * the factory image when the file is missing, which is why such a record still
 * renders. This keeps the write path to the same rule.
 */
function assertSubmittedPathExists(
  path: string | null | undefined,
  committedPath: string | null | undefined,
) {
  if (path === null || path === undefined) return;
  if (path === committedPath) return;
  const { directory, fileName } = assertBrandingAssetPath(path);
  if (!existsSync(resolve(directory, fileName))) {
    HttpError.create(
      422,
      "Branding asset is not present in managed storage",
    );
  }
}

function collectNonNullPaths(
  record: Record<string, string | null | undefined>,
): string[] {
  const values: (string | null | undefined)[] = Object.values(record);
  return values.filter(
    (value): value is string => typeof value === "string" && value.length > 0,
  );
}

async function readBrandingBytes(fileName: string) {
  return new Uint8Array(await readFile(resolve(brandingDirectory(), fileName)));
}

async function removeBrandingFile(fileName: string): Promise<boolean> {
  try {
    await unlink(resolve(brandingDirectory(), fileName));
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

@Service()
export class BrandingService {
  constructor(
    private readonly branding: BrandingRepository,
    private readonly audits: AuditService,
  ) {}

  async get(): Promise<PublicBranding> {
    try {
      const setting = await this.branding.find();
      if (!setting) return getFactoryBranding(DEFAULT_BRANDING_REVISION);
      return this.project(setting);
    } catch {
      console.warn(
        "[branding] failed to read platform branding; using factory assets",
      );
      return getFactoryBranding(DEFAULT_BRANDING_REVISION);
    }
  }

  async getAdminConfig(): Promise<AdminBrandingConfig> {
    try {
      const setting = await this.branding.find();
      if (!setting) {
        const factory = getFactoryBranding(DEFAULT_BRANDING_REVISION);
        return {
          sidebarLogoExpandedPath: null,
          sidebarLogoCollapsedPath: null,
          authLogoPath: null,
          authHeroImagePath: null,
          resolved: factory,
          revision: factory.revision,
        };
      }
      return {
        sidebarLogoExpandedPath: setting.sidebarLogoExpandedPath,
        sidebarLogoCollapsedPath: setting.sidebarLogoCollapsedPath,
        authLogoPath: setting.authLogoPath,
        authHeroImagePath: setting.authHeroImagePath,
        resolved: this.project(setting),
        revision: setting.brandingRevision,
      };
    } catch {
      console.warn(
        "[branding] failed to read admin branding config; using factory assets",
      );
      const factory = getFactoryBranding(DEFAULT_BRANDING_REVISION);
      return {
        sidebarLogoExpandedPath: null,
        sidebarLogoCollapsedPath: null,
        authLogoPath: null,
        authHeroImagePath: null,
        resolved: factory,
        revision: factory.revision,
      };
    }
  }

  async isAssetReferenced(path: string): Promise<boolean> {
    const references = await this.branding.readReferences();
    if (!references) return false;
    return Object.values(references).some((value) => value === path);
  }

  @Transaction({ retries: 2 })
  async save(
    data: UpdateBrandingDto,
    actorUserId: string,
  ): Promise<PublicBranding> {
    const input = updateBrandingDto.parse(data);
    const committed = await this.branding.readReferences();
    assertSubmittedPathExists(
      input.sidebarLogoExpandedPath,
      committed?.sidebarLogoExpandedPath,
    );
    assertSubmittedPathExists(
      input.sidebarLogoCollapsedPath,
      committed?.sidebarLogoCollapsedPath,
    );
    assertSubmittedPathExists(input.authLogoPath, committed?.authLogoPath);
    assertSubmittedPathExists(
      input.authHeroImagePath,
      committed?.authHeroImagePath,
    );

    const submittedPaths = collectNonNullPaths({
      sidebarLogoExpandedPath: input.sidebarLogoExpandedPath,
      sidebarLogoCollapsedPath: input.sidebarLogoCollapsedPath,
      authLogoPath: input.authLogoPath,
      authHeroImagePath: input.authHeroImagePath,
    });

    let previous: StoredBranding | undefined;
    let updated: StoredBranding | undefined;

    try {
      previous = await this.branding.lock();
      if (!previous) HttpError.notFound("Platform settings not found");
      ensureExpectedRevision(previous.brandingRevision, input.expectedRevision);

      const nextRevision = previous.brandingRevision + 1;
      updated = await this.branding.write({
        sidebarLogoExpandedPath: input.sidebarLogoExpandedPath,
        sidebarLogoCollapsedPath: input.sidebarLogoCollapsedPath,
        authLogoPath: input.authLogoPath,
        authHeroImagePath: input.authHeroImagePath,
        brandingRevision: nextRevision,
        updatedByUserId: actorUserId,
      });
      if (!updated) HttpError.notFound("Platform settings not found");

      const changedSlots = this.changedSlots(previous, input);
      await this.audits.record({
        action: "branding.assetsUpdated",
        actorUserId,
        metadata: {
          previousRevision: previous.brandingRevision,
          newRevision: nextRevision,
          changedSlots,
        },
        resource: "platformSettings",
        resourceId: PLATFORM_SETTINGS_ID,
      });
    } catch (error) {
      const previouslyCommitted = previous
        ? this.collectStoredPaths(previous)
        : [];
      await this.removeNewCandidates(submittedPaths, previouslyCommitted).catch(
        () => undefined,
      );
      throw error;
    }

    if (previous && updated) {
      await this.cleanupReplacedFiles(previous, updated).catch(
        (cleanupError) => {
          console.warn(
            "[branding] failed to clean up replaced files",
            cleanupError,
          );
        },
      );
    }

    return this.project(updated!);
  }

  @Transaction({ retries: 2 })
  async reset(
    data: ResetBrandingDto,
    actorUserId: string,
  ): Promise<PublicBranding> {
    const input = resetBrandingDto.parse(data);
    const previous = await this.branding.lock();
    if (!previous) HttpError.notFound("Platform settings not found");
    ensureExpectedRevision(previous.brandingRevision, input.expectedRevision);

    const nextRevision = previous.brandingRevision + 1;
    const updated = await this.branding.write({
      sidebarLogoExpandedPath: null,
      sidebarLogoCollapsedPath: null,
      authLogoPath: null,
      authHeroImagePath: null,
      brandingRevision: nextRevision,
      updatedByUserId: actorUserId,
    });
    if (!updated) HttpError.notFound("Platform settings not found");

    const changedSlots = this.changedSlots(previous, {
      sidebarLogoExpandedPath: null,
      sidebarLogoCollapsedPath: null,
      authLogoPath: null,
      authHeroImagePath: null,
    });
    await this.audits.record({
      action: "branding.assetsReset",
      actorUserId,
      metadata: {
        previousRevision: previous.brandingRevision,
        newRevision: nextRevision,
        changedSlots,
      },
      resource: "platformSettings",
      resourceId: PLATFORM_SETTINGS_ID,
    });

    await this.cleanupReplacedFiles(previous, updated).catch((error) => {
      console.warn("[branding] failed to clean up reset files", error);
    });

    return getFactoryBranding(nextRevision);
  }

  assertUploadValid(
    slot: BrandingSlot,
    fileName: string,
    declaredMime: string,
    bytes: Uint8Array,
  ): void {
    decodeBrandingFileName(fileName);
    assertBrandingBytesWithinSlotLimit(slot, bytes.byteLength);
    assertBrandingExtensionMatchesMime(fileName, declaredMime);
  }

  async uploadAsset(input: {
    slot: BrandingSlot;
    fileName: string;
    declaredMime: string;
    bytes: Uint8Array;
  }): Promise<{ path: string }> {
    const decodedFileName = decodeBrandingFileName(input.fileName);
    this.assertUploadValid(
      input.slot,
      decodedFileName,
      input.declaredMime,
      input.bytes,
    );
    const normalized = await writeManagedImage({
      bytes: input.bytes,
      declaredMime: input.declaredMime,
      directory: brandingDirectory(),
      profile: input.slot === "authHeroImage" ? "brandingHero" : "brandingLogo",
      requestedFileName: decodedFileName,
      servePrefix: brandingAssetServePrefix(),
    });
    return { path: normalized.path };
  }

  async deleteCandidateByFileName(
    fileName: string,
  ): Promise<{ deleted: boolean; referenced: boolean }> {
    const decodedFileName = decodeBrandingFileName(fileName);
    const path = brandingAssetPath(decodedFileName);
    const referenced = await this.isAssetReferenced(path);
    if (referenced) {
      HttpError.create(
        409,
        "Branding asset is still referenced by a committed slot",
      );
    }
    const deleted = await removeBrandingFile(decodedFileName);
    return { deleted, referenced: false };
  }

  async deleteCandidatesByPath(
    paths: string[],
  ): Promise<{ deleted: number; skipped: number }> {
    let deleted = 0;
    let skipped = 0;
    for (const path of paths) {
      if (!BRANDING_ASSET_PATH_PATTERN.test(path)) {
        skipped += 1;
        continue;
      }
      const referenced = await this.isAssetReferenced(path);
      if (referenced) {
        skipped += 1;
        continue;
      }
      const fileName = fileNameOfPath(path);
      if (!isBrandingFileName(fileName)) {
        skipped += 1;
        continue;
      }
      const ok = await removeBrandingFile(fileName);
      if (ok) deleted += 1;
    }
    return { deleted, skipped };
  }

  async readPublicAsset(
    fileName: string,
  ): Promise<{ bytes: Uint8Array; mime: string } | undefined> {
    decodeBrandingFileName(fileName);
    if (!existsSync(resolve(brandingDirectory(), fileName))) {
      return undefined;
    }
    return {
      bytes: await readBrandingBytes(fileName),
      mime: brandingMimeForFileName(fileName),
    };
  }

  async writeCandidate(
    fileName: string,
    bytes: Uint8Array,
  ): Promise<{ path: string }> {
    decodeBrandingFileName(fileName);
    const directory = brandingDirectory();
    await mkdir(directory, { recursive: true });
    await writeFile(resolve(directory, fileName), bytes, { flag: "wx" });
    return { path: brandingAssetPath(fileName) };
  }

  private project(setting: StoredBranding): PublicBranding {
    const factory = getFactoryBranding(DEFAULT_BRANDING_REVISION);
    const expanded = this.resolveStoredPath(
      setting.sidebarLogoExpandedPath,
      factory.sidebarLogoExpandedPath,
    );
    return {
      sidebarLogoExpandedPath: expanded,
      sidebarLogoCollapsedPath: this.resolveStoredPath(
        setting.sidebarLogoCollapsedPath,
        expanded,
      ),
      authLogoPath: this.resolveStoredPath(setting.authLogoPath, expanded),
      authHeroImagePath: this.resolveStoredPath(
        setting.authHeroImagePath,
        factory.authHeroImagePath,
      ),
      revision: setting.brandingRevision,
    };
  }

  private resolveStoredPath(path: string | null, fallback: string): string {
    if (!path || !BRANDING_ASSET_PATH_PATTERN.test(path)) return fallback;
    return isBrandingAssetFileOnDisk(fileNameOfPath(path)) ? path : fallback;
  }

  private changedSlots(
    previous: StoredBranding,
    next: {
      sidebarLogoExpandedPath: string | null;
      sidebarLogoCollapsedPath: string | null;
      authLogoPath: string | null;
      authHeroImagePath: string | null;
    },
  ): string[] {
    const changes: string[] = [];
    if (previous.sidebarLogoExpandedPath !== next.sidebarLogoExpandedPath) {
      changes.push("sidebarLogoExpanded");
    }
    if (previous.sidebarLogoCollapsedPath !== next.sidebarLogoCollapsedPath) {
      changes.push("sidebarLogoCollapsed");
    }
    if (previous.authLogoPath !== next.authLogoPath) {
      changes.push("authLogo");
    }
    if (previous.authHeroImagePath !== next.authHeroImagePath) {
      changes.push("authHeroImage");
    }
    return changes;
  }

  private collectStoredPaths(setting: StoredBranding): string[] {
    return [
      setting.sidebarLogoExpandedPath,
      setting.sidebarLogoCollapsedPath,
      setting.authLogoPath,
      setting.authHeroImagePath,
    ].filter((value): value is string => Boolean(value));
  }

  private async cleanupReplacedFiles(
    previous: StoredBranding,
    updated: StoredBranding,
  ) {
    const oldPaths = this.collectStoredPaths(previous);
    const keep = new Set<string>(this.collectStoredPaths(updated));

    for (const oldPath of oldPaths) {
      if (keep.has(oldPath)) continue;
      const fileName = fileNameOfPath(oldPath);
      if (!isBrandingFileName(fileName)) continue;
      await removeBrandingFile(fileName).catch(() => undefined);
    }
  }

  private async removeNewCandidates(
    candidates: string[],
    previouslyCommitted: string[],
  ) {
    const keep = new Set<string>(previouslyCommitted);
    for (const candidate of candidates) {
      if (keep.has(candidate)) continue;
      if (!BRANDING_ASSET_PATH_PATTERN.test(candidate)) continue;
      const fileName = fileNameOfPath(candidate);
      if (!isBrandingFileName(fileName)) continue;
      await removeBrandingFile(fileName).catch(() => undefined);
    }
  }
}

function ensureExpectedRevision(actual: number, expected: number) {
  if (actual !== expected) {
    HttpError.conflict("Platform branding changed; reload and try again");
  }
}
