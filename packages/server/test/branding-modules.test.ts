import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  spyOn,
} from "bun:test";
import { existsSync } from "node:fs";
import { readFileSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getGuardMetadata } from "najm-guard";
import { getMcpTools } from "najm-mcp";
import { getValidationConfig } from "najm-validation";
import sharp from "sharp";

import { db } from "../src/config/databaseConfig";
import { AuditRepository, AuditService } from "../src/modules/audit";
import {
  BRANDING_ASSET_PATH_PATTERN,
  BrandingController,
  type BrandingWrite,
  BrandingRepository,
  BrandingService,
  DEFAULT_BRANDING_REVISION,
  assertBrandingAssetPath,
  brandingAssetFileNameRegex,
  brandingAssetPath,
  brandingAssetServePrefix,
  brandingStorageDirectory,
  decodeBrandingFileName,
  FACTORY_AUTH_HERO_IMAGE_PATH,
  FACTORY_SIDEBAR_LOGO_COLLAPSED_PATH,
  FACTORY_SIDEBAR_LOGO_EXPANDED_PATH,
  getFactoryBranding,
  resetBrandingDto,
  updateBrandingDto,
} from "../src/modules/settings";

const actorUserId = "admin-user";

const VALID_LOGO_NAME = "11111111-1111-4111-8111-111111111111.png";
const VALID_COLLAPSED_NAME = "22222222-2222-4222-8222-222222222222.webp";
const VALID_AUTH_LOGO_NAME = "33333333-3333-4333-8333-333333333333.png";
const VALID_HERO_NAME = "44444444-4444-4444-8444-444444444444.jpg";
const REPLACED_NAME = "99999999-9999-4999-8999-999999999999.png";

const validLogoPath = brandingAssetPath(VALID_LOGO_NAME);
const validCollapsedPath = brandingAssetPath(VALID_COLLAPSED_NAME);
const validAuthLogoPath = brandingAssetPath(VALID_AUTH_LOGO_NAME);
const validHeroPath = brandingAssetPath(VALID_HERO_NAME);

const PNG_BYTES = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
]);
const JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
async function realImageBytes(format: "avif" | "jpeg" | "png" | "webp") {
  const image = sharp({
    create: {
      width: 32,
      height: 24,
      channels: 4,
      background: { r: 24, g: 96, b: 160, alpha: 0.7 },
    },
  });
  if (format === "avif") return new Uint8Array(await image.avif().toBuffer());
  if (format === "jpeg") return new Uint8Array(await image.jpeg().toBuffer());
  if (format === "webp") return new Uint8Array(await image.webp().toBuffer());
  return new Uint8Array(await image.png().toBuffer());
}

describe("branding factory", () => {
  it("returns the documented factory asset paths and the default revision", () => {
    const factory = getFactoryBranding();

    expect(factory).toEqual({
      sidebarLogoExpandedPath: FACTORY_SIDEBAR_LOGO_EXPANDED_PATH,
      sidebarLogoCollapsedPath: FACTORY_SIDEBAR_LOGO_COLLAPSED_PATH,
      authLogoPath: FACTORY_SIDEBAR_LOGO_EXPANDED_PATH,
      authHeroImagePath: FACTORY_AUTH_HERO_IMAGE_PATH,
      revision: DEFAULT_BRANDING_REVISION,
    });
    expect(DEFAULT_BRANDING_REVISION).toBe(1);
  });

  it("returns independent projections for each call", () => {
    const first = getFactoryBranding();
    const second = getFactoryBranding();
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
  });

  it("builds the public asset path from a uuid+extension filename", () => {
    expect(brandingAssetPath("abc-123.png")).toBe(
      `${brandingAssetServePrefix()}abc-123.png`,
    );
    expect(brandingAssetServePrefix()).toBe("/api/branding/assets/serve/");
  });
});

describe("branding asset path validation", () => {
  it("accepts managed upload paths and rejects external URLs and arbitrary strings", () => {
    expect(BRANDING_ASSET_PATH_PATTERN.test(validLogoPath)).toBe(true);
    expect(
      BRANDING_ASSET_PATH_PATTERN.test("https://example.test/logo.png"),
    ).toBe(false);
    expect(
      BRANDING_ASSET_PATH_PATTERN.test("/logoExpanded.png"),
    ).toBe(false);
    expect(
      BRANDING_ASSET_PATH_PATTERN.test(
        `${brandingAssetServePrefix()}../escape.png`,
      ),
    ).toBe(false);
    expect(
      BRANDING_ASSET_PATH_PATTERN.test(
        `${brandingAssetServePrefix()}not-a-uuid.png`,
      ),
    ).toBe(false);
  });

  it("decodes a managed filename but rejects any other filename shape", () => {
    expect(
      decodeBrandingFileName("55555555-5555-4555-8555-555555555555.PNG"),
    ).toBe("55555555-5555-4555-8555-555555555555.PNG");
    expect(() => decodeBrandingFileName("not-a-uuid.png")).toThrow(
      "Invalid branding asset file name",
    );
    expect(() => decodeBrandingFileName("../escape.png")).toThrow(
      "Invalid branding asset file name",
    );
    expect(() =>
      decodeBrandingFileName("55555555-5555-4555-8555-555555555555.exe"),
    ).toThrow("Invalid branding asset file name");
  });

  it("resolves a managed path to a storage directory + filename", () => {
    const result = assertBrandingAssetPath(validLogoPath);
    expect(result.fileName).toBe(VALID_LOGO_NAME);
    expect(result.directory).toBe(brandingStorageDirectory());
    expect(brandingAssetFileNameRegex().test(result.fileName)).toBe(true);
  });
});

describe("branding DTO validation", () => {
  it("accepts a complete update payload with strict expected revision", () => {
    const result = updateBrandingDto.parse({
      sidebarLogoExpandedPath: validLogoPath,
      sidebarLogoCollapsedPath: validCollapsedPath,
      authLogoPath: validAuthLogoPath,
      authHeroImagePath: validHeroPath,
      expectedRevision: 2,
    });
    expect(result).toEqual({
      sidebarLogoExpandedPath: validLogoPath,
      sidebarLogoCollapsedPath: validCollapsedPath,
      authLogoPath: validAuthLogoPath,
      authHeroImagePath: validHeroPath,
      expectedRevision: 2,
    });
  });

  it("accepts a partial update with nullable paths", () => {
    const result = updateBrandingDto.parse({
      sidebarLogoExpandedPath: validLogoPath,
      expectedRevision: 1,
    });
    expect(result.sidebarLogoCollapsedPath).toBeNull();
    expect(result.authLogoPath).toBeNull();
    expect(result.authHeroImagePath).toBeNull();
  });

  it("rejects unknown fields, negative revisions, and external URLs", () => {
    expect(
      updateBrandingDto.safeParse({
        sidebarLogoExpandedPath: validLogoPath,
        expectedRevision: 1,
        unknown: "extra",
      }).success,
    ).toBe(false);
    expect(
      updateBrandingDto.safeParse({
        sidebarLogoExpandedPath: validLogoPath,
        expectedRevision: 0,
      }).success,
    ).toBe(false);
    expect(
      updateBrandingDto.safeParse({
        sidebarLogoExpandedPath: "https://example.test/evil.png",
        expectedRevision: 1,
      }).success,
    ).toBe(false);
    expect(
      updateBrandingDto.safeParse({
        sidebarLogoExpandedPath: "/logoExpanded.png",
        expectedRevision: 1,
      }).success,
    ).toBe(false);
    expect(
      updateBrandingDto.safeParse({
        sidebarLogoExpandedPath: `${brandingAssetServePrefix()}../escape.png`,
        expectedRevision: 1,
      }).success,
    ).toBe(false);
  });

  it("rejects non-integer and non-numeric revisions on both DTOs", () => {
    expect(
      updateBrandingDto.safeParse({
        sidebarLogoExpandedPath: validLogoPath,
        expectedRevision: "1",
      }).success,
    ).toBe(false);
    expect(
      resetBrandingDto.safeParse({ expectedRevision: "1" }).success,
    ).toBe(false);
    expect(
      resetBrandingDto.safeParse({ expectedRevision: 1, force: true }).success,
    ).toBe(false);
  });

  it("accepts the documented reset payload", () => {
    expect(
      resetBrandingDto.parse({ expectedRevision: 3 }),
    ).toEqual({ expectedRevision: 3 });
  });
});

describe("branding service", () => {
  let originalTransaction: typeof db.transaction;
  let originalStoragePath: string | undefined;
  let storageDirectory: string;
  let brandingDirectory: string;

  beforeEach(async () => {
    const transactionalDb = db as unknown as {
      transaction: (...args: unknown[]) => Promise<unknown>;
    };
    originalTransaction = db.transaction;
    transactionalDb.transaction = (async (callback: unknown) =>
      (callback as (tx: unknown) => Promise<unknown>)({})) as never;

    originalStoragePath = process.env.KAFIL_STORAGE_PATH;
    storageDirectory = await mkdtemp(
      join(tmpdir(), "kafil-branding-service-"),
    );
    process.env.KAFIL_STORAGE_PATH = storageDirectory;
    brandingDirectory = join(storageDirectory, "branding");
    await mkdir(brandingDirectory, { recursive: true });
  });

  afterEach(async () => {
    (db as { transaction: typeof db.transaction }).transaction =
      originalTransaction;
    if (originalStoragePath === undefined) {
      delete process.env.KAFIL_STORAGE_PATH;
    } else {
      process.env.KAFIL_STORAGE_PATH = originalStoragePath;
    }
    await rm(storageDirectory, { force: true, recursive: true });
  });

  async function seedFile(fileName: string, bytes: Uint8Array) {
    await writeFile(join(brandingDirectory, fileName), bytes);
  }

  function buildService(
    overrides: Partial<{
      find: BrandingRepository["find"];
      lock: BrandingRepository["lock"];
      write: BrandingRepository["write"];
      readReferences: BrandingRepository["readReferences"];
    }> = {},
    auditOverrides: {
      record?: (input: Record<string, unknown>) => Promise<unknown>;
    } = {},
  ) {
    const repository = {
      find: async () => ({
        sidebarLogoExpandedPath: null,
        sidebarLogoCollapsedPath: null,
        authLogoPath: null,
        authHeroImagePath: null,
        brandingRevision: 1,
      }),
      lock: async () => ({
        sidebarLogoExpandedPath: null,
        sidebarLogoCollapsedPath: null,
        authLogoPath: null,
        authHeroImagePath: null,
        brandingRevision: 1,
      }),
      write: async (input: BrandingWrite) => input,
      readReferences: async () => undefined,
      ...overrides,
    } as unknown as BrandingRepository;
    const auditService = {
      record: async (input: Record<string, unknown>) => {
        if (auditOverrides.record) {
          return auditOverrides.record(input);
        }
        return input;
      },
    } as unknown as AuditService;
    return {
      repository,
      auditService,
      service: new BrandingService(repository, auditService),
    };
  }

  it("projects factory fallbacks when no branding row is stored", async () => {
    const { service } = buildService({
      find: async () => undefined,
    });
    await expect(service.get()).resolves.toEqual(getFactoryBranding());
  });

  it("uses the factory sidebar expanded path as the auth logo fallback", async () => {
    const customExpandedName = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.png";
    const customExpanded = brandingAssetPath(customExpandedName);
    await seedFile(customExpandedName, PNG_BYTES);
    const { service } = buildService({
      find: async () => ({
        sidebarLogoExpandedPath: customExpanded,
        sidebarLogoCollapsedPath: null,
        authLogoPath: null,
        authHeroImagePath: null,
        brandingRevision: 4,
      }),
    });

    await expect(service.get()).resolves.toEqual({
      sidebarLogoExpandedPath: customExpanded,
      sidebarLogoCollapsedPath: customExpanded,
      authLogoPath: customExpanded,
      authHeroImagePath: FACTORY_AUTH_HERO_IMAGE_PATH,
      revision: 4,
    });
  });

  it("projects factory fallbacks when stored branding files are missing", async () => {
    const { service } = buildService({
      find: async () => ({
        sidebarLogoExpandedPath: validLogoPath,
        sidebarLogoCollapsedPath: validCollapsedPath,
        authLogoPath: validAuthLogoPath,
        authHeroImagePath: validHeroPath,
        brandingRevision: 11,
      }),
    });

    await expect(service.get()).resolves.toEqual({
      ...getFactoryBranding(),
      revision: 11,
    });
  });

  it("returns the stored revision, falls back to the factory when storage fails, and never logs secrets", async () => {
    const warning = spyOn(console, "warn").mockImplementation(() => undefined);
    const { service: missing } = buildService({ find: async () => undefined });
    const { service: unavailable } = buildService({
      find: async () => {
        throw new Error("postgresql://secret@database/kafil");
      },
    });

    await expect(missing.get()).resolves.toEqual(getFactoryBranding());
    await expect(unavailable.get()).resolves.toEqual(getFactoryBranding());

    const warningText = warning.mock.calls.flat().join(" ");
    expect(warningText).toContain("factory assets");
    expect(warningText).not.toContain("secret");
    warning.mockRestore();
  });

  it("locks, validates revision, increments, audits changed slots, and projects the public response", async () => {
    await seedFile(VALID_LOGO_NAME, PNG_BYTES);
    await seedFile(VALID_HERO_NAME, JPEG_BYTES);
    const calls: string[] = [];
    const writes: BrandingWrite[] = [];
    const audits: Record<string, unknown>[] = [];

    const { service } = buildService(
      {
        lock: async () => {
          calls.push("lock");
          return {
            sidebarLogoExpandedPath: null,
            sidebarLogoCollapsedPath: null,
            authLogoPath: null,
            authHeroImagePath: null,
            brandingRevision: 3,
          };
        },
        write: async (input) => {
          calls.push("write");
          writes.push(input);
          return { ...input };
        },
      },
      {
        record: async (input) => {
          calls.push("audit");
          audits.push(input as unknown as Record<string, unknown>);
          return input;
        },
      },
    );

    const result = await service.save(
      {
        sidebarLogoExpandedPath: validLogoPath,
        sidebarLogoCollapsedPath: null,
        authLogoPath: null,
        authHeroImagePath: validHeroPath,
        expectedRevision: 3,
      },
      actorUserId,
    );

    expect(calls).toEqual(["lock", "write", "audit"]);
    expect(result.revision).toBe(4);
    expect(result.sidebarLogoExpandedPath).toBe(validLogoPath);
    expect(result.sidebarLogoCollapsedPath).toBe(validLogoPath);
    expect(result.authLogoPath).toBe(validLogoPath);
    expect(result.authHeroImagePath).toBe(validHeroPath);
    expect(writes).toEqual([
      {
        sidebarLogoExpandedPath: validLogoPath,
        sidebarLogoCollapsedPath: null,
        authLogoPath: null,
        authHeroImagePath: validHeroPath,
        brandingRevision: 4,
        updatedByUserId: actorUserId,
      },
    ]);
    expect(audits).toEqual([
      {
        action: "branding.assetsUpdated",
        actorUserId,
        metadata: {
          previousRevision: 3,
          newRevision: 4,
          changedSlots: ["sidebarLogoExpanded", "authHeroImage"],
        },
        resource: "platformSettings",
        resourceId: "platform",
      },
    ]);
  });

  it("rejects a stale write before touching the database", async () => {
    await seedFile(VALID_LOGO_NAME, PNG_BYTES);
    const calls: string[] = [];
    const { service } = buildService(
      {
        lock: async () => {
          calls.push("lock");
          return {
            sidebarLogoExpandedPath: null,
            sidebarLogoCollapsedPath: null,
            authLogoPath: null,
            authHeroImagePath: null,
            brandingRevision: 5,
          };
        },
        write: async () => {
          calls.push("write");
          return undefined;
        },
      },
      {
        record: async () => {
          calls.push("audit");
        },
      },
    );

    await expect(
      service.save(
        {
          sidebarLogoExpandedPath: validLogoPath,
          sidebarLogoCollapsedPath: null,
          authLogoPath: null,
          authHeroImagePath: null,
          expectedRevision: 4,
        },
        actorUserId,
      ),
    ).rejects.toMatchObject({ status: 409 });
    expect(calls).toEqual(["lock"]);
  });

  it("rejects save when a submitted path is missing from storage", async () => {
    const { service } = buildService({
      lock: async () => ({
        sidebarLogoExpandedPath: null,
        sidebarLogoCollapsedPath: null,
        authLogoPath: null,
        authHeroImagePath: null,
        brandingRevision: 1,
      }),
    });

    await expect(
      service.save(
        {
          sidebarLogoExpandedPath: validLogoPath,
          sidebarLogoCollapsedPath: null,
          authLogoPath: null,
          authHeroImagePath: null,
          expectedRevision: 1,
        },
        actorUserId,
      ),
    ).rejects.toMatchObject({ status: 422 });
  });

  it("cleans up new candidate files when the commit fails", async () => {
    await seedFile(VALID_LOGO_NAME, PNG_BYTES);
    const { service } = buildService({
      lock: async () => {
        throw new Error("forced");
      },
    });

    await expect(
      service.save(
        {
          sidebarLogoExpandedPath: validLogoPath,
          sidebarLogoCollapsedPath: null,
          authLogoPath: null,
          authHeroImagePath: null,
          expectedRevision: 1,
        },
        actorUserId,
      ),
    ).rejects.toThrow("forced");
    expect(existsSync(join(brandingDirectory, VALID_LOGO_NAME))).toBe(false);
  });

  it("keeps committed images when a save fails after upload", async () => {
    const committedName = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.png";
    const committedPath = brandingAssetPath(committedName);
    await seedFile(committedName, PNG_BYTES);
    await seedFile(VALID_LOGO_NAME, PNG_BYTES);
    const { service } = buildService({
      lock: async () => ({
        sidebarLogoExpandedPath: committedPath,
        sidebarLogoCollapsedPath: null,
        authLogoPath: null,
        authHeroImagePath: null,
        brandingRevision: 2,
      }),
    });

    await expect(
      service.save(
        {
          sidebarLogoExpandedPath: validLogoPath,
          sidebarLogoCollapsedPath: null,
          authLogoPath: null,
          authHeroImagePath: null,
          expectedRevision: 1,
        },
        actorUserId,
      ),
    ).rejects.toMatchObject({ status: 409 });
    expect(existsSync(join(brandingDirectory, committedName))).toBe(true);
    expect(existsSync(join(brandingDirectory, VALID_LOGO_NAME))).toBe(false);
  });

  it("keeps committed images when a save re-submits them unchanged", async () => {
    const committedName = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.png";
    const committedPath = brandingAssetPath(committedName);
    await seedFile(committedName, PNG_BYTES);
    const { service } = buildService(
      {
        lock: async () => ({
          sidebarLogoExpandedPath: committedPath,
          sidebarLogoCollapsedPath: null,
          authLogoPath: null,
          authHeroImagePath: null,
          brandingRevision: 1,
        }),
        write: async (input) => ({ ...input }),
      },
    );

    await service.save(
      {
        sidebarLogoExpandedPath: committedPath,
        sidebarLogoCollapsedPath: null,
        authLogoPath: null,
        authHeroImagePath: null,
        expectedRevision: 1,
      },
      actorUserId,
    );
    expect(existsSync(join(brandingDirectory, committedName))).toBe(true);
  });

  it("removes replaced old files when the commit succeeds and the file is no longer referenced", async () => {
    await seedFile(VALID_LOGO_NAME, PNG_BYTES);
    await seedFile(REPLACED_NAME, PNG_BYTES);
    const writes: BrandingWrite[] = [];
    const { service } = buildService(
      {
        lock: async () => ({
          sidebarLogoExpandedPath: brandingAssetPath(REPLACED_NAME),
          sidebarLogoCollapsedPath: null,
          authLogoPath: null,
          authHeroImagePath: null,
          brandingRevision: 4,
        }),
        write: async (input) => {
          writes.push(input);
          return { ...input };
        },
      },
    );

    await service.save(
      {
        sidebarLogoExpandedPath: validLogoPath,
        sidebarLogoCollapsedPath: null,
        authLogoPath: null,
        authHeroImagePath: null,
        expectedRevision: 4,
      },
      actorUserId,
    );

    expect(writes).toHaveLength(1);
    expect(existsSync(join(brandingDirectory, VALID_LOGO_NAME))).toBe(true);
    expect(existsSync(join(brandingDirectory, REPLACED_NAME))).toBe(false);
  });

  it("keeps replaced files when the new value reuses the same path", async () => {
    const keptName = "55555555-5555-4555-8555-555555555555.png";
    const keptPath = brandingAssetPath(keptName);
    await seedFile(keptName, PNG_BYTES);
    const { service } = buildService({
      lock: async () => ({
        sidebarLogoExpandedPath: keptPath,
        sidebarLogoCollapsedPath: keptPath,
        authLogoPath: null,
        authHeroImagePath: null,
        brandingRevision: 2,
      }),
    });

    await service.save(
      {
        sidebarLogoExpandedPath: keptPath,
        sidebarLogoCollapsedPath: null,
        authLogoPath: null,
        authHeroImagePath: null,
        expectedRevision: 2,
      },
      actorUserId,
    );

    expect(existsSync(join(brandingDirectory, keptName))).toBe(true);
  });

  it("resets to factory assets, increments revision, and audits changed slots", async () => {
    const writes: BrandingWrite[] = [];
    const audits: Record<string, unknown>[] = [];
    const customPath = brandingAssetPath(REPLACED_NAME);
    await seedFile(REPLACED_NAME, PNG_BYTES);
    const { service } = buildService(
      {
        lock: async () => ({
          sidebarLogoExpandedPath: customPath,
          sidebarLogoCollapsedPath: customPath,
          authLogoPath: customPath,
          authHeroImagePath: customPath,
          brandingRevision: 7,
        }),
        write: async (input) => {
          writes.push(input);
          return { ...input };
        },
      },
      {
        record: async (input) => {
          audits.push(input as unknown as Record<string, unknown>);
          return input;
        },
      },
    );

    const result = await service.reset({ expectedRevision: 7 }, actorUserId);

    expect(result).toEqual(getFactoryBranding(8));
    expect(writes).toEqual([
      {
        sidebarLogoExpandedPath: null,
        sidebarLogoCollapsedPath: null,
        authLogoPath: null,
        authHeroImagePath: null,
        brandingRevision: 8,
        updatedByUserId: actorUserId,
      },
    ]);
    expect(audits).toEqual([
      expect.objectContaining({
        action: "branding.assetsReset",
        metadata: {
          previousRevision: 7,
          newRevision: 8,
          changedSlots: [
            "sidebarLogoExpanded",
            "sidebarLogoCollapsed",
            "authLogo",
            "authHeroImage",
          ],
        },
      }),
    ]);
    expect(existsSync(join(brandingDirectory, REPLACED_NAME))).toBe(false);
  });

  it("treats deleteCandidate as a no-op when the file is already missing", async () => {
    const { service } = buildService({
      readReferences: async () => ({
        sidebarLogoExpandedPath: null,
        sidebarLogoCollapsedPath: null,
        authLogoPath: null,
        authHeroImagePath: null,
      }),
    });

    const result = await service.deleteCandidateByFileName(VALID_LOGO_NAME);
    expect(result).toEqual({ deleted: false, referenced: false });
  });

  it("refuses to delete a still-referenced asset", async () => {
    const path = brandingAssetPath(VALID_LOGO_NAME);
    const { service } = buildService({
      readReferences: async () => ({
        sidebarLogoExpandedPath: path,
        sidebarLogoCollapsedPath: null,
        authLogoPath: null,
        authHeroImagePath: null,
      }),
    });

    await expect(
      service.deleteCandidateByFileName(VALID_LOGO_NAME),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("removes unreferenced candidate files on request", async () => {
    await seedFile(VALID_LOGO_NAME, PNG_BYTES);
    const { service } = buildService({
      readReferences: async () => ({
        sidebarLogoExpandedPath: null,
        sidebarLogoCollapsedPath: null,
        authLogoPath: null,
        authHeroImagePath: null,
      }),
    });

    const result = await service.deleteCandidateByFileName(VALID_LOGO_NAME);
    expect(result).toEqual({ deleted: true, referenced: false });
    expect(existsSync(join(brandingDirectory, VALID_LOGO_NAME))).toBe(false);
  });

  it("reads public asset bytes for committed assets", async () => {
    await seedFile(VALID_LOGO_NAME, PNG_BYTES);
    const { service } = buildService();
    const asset = await service.readPublicAsset(VALID_LOGO_NAME);
    expect(asset?.mime).toBe("image/png");
    expect(Array.from(asset?.bytes ?? [])).toEqual(Array.from(PNG_BYTES));
  });

  it("returns undefined for missing public assets", async () => {
    const { service } = buildService();
    const asset = await service.readPublicAsset(VALID_LOGO_NAME);
    expect(asset).toBeUndefined();
  });

  it("writes candidate assets through the validated slot pipeline", async () => {
    const { service } = buildService();
    const result = await service.uploadAsset({
      slot: "sidebarLogoExpanded",
      fileName: VALID_LOGO_NAME,
      declaredMime: "image/png",
      bytes: await realImageBytes("png"),
    });
    const normalizedName = VALID_LOGO_NAME.replace(/\.png$/, ".webp");
    expect(result.path).toBe(brandingAssetPath(normalizedName));
    expect(existsSync(join(brandingDirectory, normalizedName))).toBe(true);
  });

  it("rejects uploads with mismatched declared mime and detected format", async () => {
    const { service } = buildService();
    let captured: unknown;
    try {
      await service.uploadAsset({
        slot: "sidebarLogoExpanded",
        fileName: VALID_LOGO_NAME,
        declaredMime: "image/png",
        bytes: await realImageBytes("jpeg"),
      });
    } catch (error) {
      captured = error;
    }
    expect(captured).toBeDefined();
    const errorLike = captured as {
      status?: number;
      code?: string;
      message?: string;
    };
    expect(errorLike.status).toBe(415);
    expect(errorLike.message).toContain("declared content type");
  });

  it("rejects uploads that exceed the slot byte limit", async () => {
    const { service } = buildService();
    const oversize = new Uint8Array(2_000_001);
    await expect(
      service.uploadAsset({
        slot: "sidebarLogoExpanded",
        fileName: VALID_LOGO_NAME,
        declaredMime: "image/png",
        bytes: oversize,
      }),
    ).rejects.toMatchObject({ status: 413 });
  });

  it("accepts webp, jpeg, and avif bytes when the extension matches", async () => {
    const { service } = buildService();
    await service.uploadAsset({
      slot: "authLogo",
      fileName: VALID_AUTH_LOGO_NAME,
      declaredMime: "image/png",
      bytes: await realImageBytes("png"),
    });
    await service.uploadAsset({
      slot: "sidebarLogoCollapsed",
      fileName: VALID_COLLAPSED_NAME,
      declaredMime: "image/webp",
      bytes: await realImageBytes("webp"),
    });
    await service.uploadAsset({
      slot: "authHeroImage",
      fileName: VALID_HERO_NAME,
      declaredMime: "image/jpeg",
      bytes: await realImageBytes("jpeg"),
    });
    expect(existsSync(join(brandingDirectory, VALID_AUTH_LOGO_NAME.replace(/\.png$/, ".webp")))).toBe(
      true,
    );
    expect(existsSync(join(brandingDirectory, VALID_COLLAPSED_NAME))).toBe(
      true,
    );
    expect(existsSync(join(brandingDirectory, VALID_HERO_NAME.replace(/\.jpg$/, ".webp")))).toBe(true);
  });

  it("rejects uploads with an undecodable body", async () => {
    const { service } = buildService();
    await expect(
      service.uploadAsset({
        slot: "sidebarLogoExpanded",
        fileName: VALID_LOGO_NAME,
        declaredMime: "image/png",
        bytes: new Uint8Array([0x00, 0x01, 0x02, 0x03]),
      }),
    ).rejects.toMatchObject({ status: 415 });
  });

  it("detects avif bytes via the iso-bmff ftyp brand", async () => {
    const { service } = buildService();
    const avifName = "66666666-6666-4666-8666-666666666666.avif";
    await service.uploadAsset({
      slot: "authHeroImage",
      fileName: avifName,
      declaredMime: "image/avif",
      bytes: await realImageBytes("avif"),
    });
    expect(existsSync(join(brandingDirectory, avifName.replace(/\.avif$/, ".webp")))).toBe(true);
  });

  it("returns an admin config with customPath and resolvedPath projections", async () => {
    const committedName = "cccccccc-cccc-4ccc-8ccc-cccccccccccc.png";
    const committedPath = brandingAssetPath(committedName);
    await seedFile(committedName, PNG_BYTES);
    const { service } = buildService({
      find: async () => ({
        sidebarLogoExpandedPath: committedPath,
        sidebarLogoCollapsedPath: null,
        authLogoPath: null,
        authHeroImagePath: null,
        brandingRevision: 9,
      }),
    });

    const config = await service.getAdminConfig();
    expect(config).toEqual({
      sidebarLogoExpandedPath: committedPath,
      sidebarLogoCollapsedPath: null,
      authLogoPath: null,
      authHeroImagePath: null,
      resolved: {
        sidebarLogoExpandedPath: committedPath,
        sidebarLogoCollapsedPath: committedPath,
        authLogoPath: committedPath,
        authHeroImagePath: FACTORY_AUTH_HERO_IMAGE_PATH,
        revision: 9,
      },
      revision: 9,
    });
  });

  it("deletes multiple candidates in one request and skips referenced paths", async () => {
    const committedName = "dddddddd-dddd-4ddd-8ddd-dddddddddddd.png";
    const committedPath = brandingAssetPath(committedName);
    const orphanName = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee.png";
    const orphanPath = brandingAssetPath(orphanName);
    await seedFile(committedName, PNG_BYTES);
    await seedFile(orphanName, PNG_BYTES);
    const { service } = buildService({
      readReferences: async () => ({
        sidebarLogoExpandedPath: committedPath,
        sidebarLogoCollapsedPath: null,
        authLogoPath: null,
        authHeroImagePath: null,
      }),
    });

    const result = await service.deleteCandidatesByPath([
      committedPath,
      orphanPath,
    ]);
    expect(result).toEqual({ deleted: 1, skipped: 1 });
    expect(existsSync(join(brandingDirectory, committedName))).toBe(true);
    expect(existsSync(join(brandingDirectory, orphanName))).toBe(false);
  });
});

describe("branding controller", () => {
  it("exposes public read, admin update, admin reset, and admin asset endpoints", () => {
    expect(
      getMcpTools(BrandingController).map(({ methodKey }) => methodKey),
    ).toEqual([
      "getBranding",
      "getBrandingConfig",
      "updateBranding",
      "resetBranding",
      "deleteAsset",
    ]);
    expect(getGuardMetadata(BrandingController, "getBranding")).toEqual([]);
    expect(getGuardMetadata(BrandingController, "serveAsset")).toEqual([]);
    for (const method of [
      "updateBranding",
      "resetBranding",
      "uploadAsset",
      "deleteAsset",
      "deleteAssets",
      "getBrandingConfig",
    ]) {
      expect(
        getGuardMetadata(BrandingController, method).map(
          ({ guardClass }) => guardClass.name,
        ),
      ).toContain("AdminRoleGuard");
    }
    expect(
      getValidationConfig(BrandingController.prototype, "updateBranding")
        ?.body,
    ).toBe(updateBrandingDto);
    expect(
      getValidationConfig(BrandingController.prototype, "resetBranding")
        ?.body,
    ).toBe(resetBrandingDto);
  });

  it("returns only the public branding projection from the public read", async () => {
    const projection = {
      ...getFactoryBranding(2),
    };
    const controller = new BrandingController({
      get: async () => projection,
    } as unknown as BrandingService);

    await expect(controller.getBranding()).resolves.toEqual(projection);
    const response = await controller.getBranding();
    expect(response).not.toHaveProperty("brandingRevision");
    expect(response).not.toHaveProperty("updatedByUserId");
  });

  it("keeps audit metadata safe by dropping unknown keys and nested objects", async () => {
    const records: Record<string, unknown>[] = [];
    const audits = new AuditService({
      create: async (input: Record<string, unknown>) => {
        records.push(input);
        return input as unknown as Awaited<
          ReturnType<AuditRepository["create"]>
        >;
      },
    } as unknown as AuditRepository);

    await audits.record({
      action: "branding.assetsUpdated",
      metadata: {
        previousRevision: 1,
        newRevision: 2,
        changedSlots: ["sidebarLogoExpanded"],
        unsafePath: { secret: "/etc/passwd" },
        nested: { hidden: true },
      },
      resource: "platformSettings",
      resourceId: "platform",
    });

    expect(records).toEqual([
      expect.objectContaining({
        metadata: {
          previousRevision: 1,
          newRevision: 2,
          changedSlots: ["sidebarLogoExpanded"],
        },
      }),
    ]);
  });
});

describe("branding storage on disk", () => {
  it("creates the branding directory under KAFIL_STORAGE_PATH", () => {
    const source = readFileSync(
      new URL("../../src/modules/settings/brandingService.ts", import.meta.url),
      "utf8",
    );
    expect(source).toContain("brandingStorageDirectory");
    expect(source).toContain('"branding"');
  });
});
