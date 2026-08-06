import { HttpError, Service } from "najm-core";
import { Transaction } from "najm-database";

import { AuditService } from "../audit/auditService";
import { AppearanceService } from "./appearanceService";
import type { PublicAppearance } from "./appearanceTypes";
import { AppearanceValidator } from "./appearanceValidator";
import {
  type ApplyThemePresetDto,
  applyThemePresetDto,
  type CreateThemePresetDto,
  createThemePresetDto,
} from "./themePresetDto";
import { ThemePresetRepository } from "./themePresetRepository";
import { MAX_THEME_PRESETS } from "./themePresetSchema";
import {
  type PublicThemePreset,
  themePresetSlug,
} from "./themePresetTypes";

interface StoredThemePreset {
  id: string;
  slug: string;
  name: string;
  designConfig: unknown;
  isBuiltIn: boolean;
  createdAt: Date;
}

@Service()
export class ThemePresetService {
  constructor(
    private readonly presets: ThemePresetRepository,
    private readonly appearance: AppearanceService,
    private readonly audits: AuditService,
    private readonly validator: AppearanceValidator,
  ) {}

  async list(): Promise<PublicThemePreset[]> {
    const rows = (await this.presets.list()) as StoredThemePreset[];
    return rows
      .map((row) => this.project(row))
      .filter((preset): preset is PublicThemePreset => preset !== null);
  }

  @Transaction({ retries: 2 })
  async create(
    data: CreateThemePresetDto,
    actorUserId: string,
  ): Promise<PublicThemePreset> {
    const input = createThemePresetDto.parse(data);
    const slug = themePresetSlug(input.name);

    const existing = await this.presets.findBySlug(slug);
    if (existing) {
      HttpError.conflict("A theme preset with that name already exists");
    }

    const total = await this.presets.count();
    if (total >= MAX_THEME_PRESETS) {
      HttpError.conflict(
        `The theme library is limited to ${MAX_THEME_PRESETS} presets`,
      );
    }

    const created = await this.presets.insert({
      slug,
      name: input.name,
      designConfig: input.designConfig,
      createdByUserId: actorUserId,
    });
    if (!created) HttpError.badRequest("Could not save the theme preset");

    await this.audits.record({
      action: "appearance.presetCreated",
      actorUserId,
      metadata: { presetSlug: slug, presetName: input.name },
      resource: "themePreset",
      resourceId: created.id,
    });

    return this.projectOrThrow(created as StoredThemePreset);
  }

  /**
   * Deletes any saved theme, built-in included. A removed built-in comes back
   * only if someone re-runs `seed:themes` or `setup`.
   */
  @Transaction({ retries: 2 })
  async remove(id: string, actorUserId: string): Promise<PublicThemePreset> {
    const preset = await this.presets.findById(id);
    if (!preset) HttpError.notFound("Theme preset not found");

    const deleted = await this.presets.delete(id);
    if (!deleted) HttpError.notFound("Theme preset not found");

    await this.audits.record({
      action: "appearance.presetDeleted",
      actorUserId,
      metadata: {
        presetSlug: deleted.slug,
        presetName: deleted.name,
        wasBuiltIn: deleted.isBuiltIn,
      },
      resource: "themePreset",
      resourceId: id,
    });

    return this.projectOrThrow(deleted as StoredThemePreset);
  }

  /** Makes a saved preset the active platform theme. */
  async apply(
    id: string,
    data: ApplyThemePresetDto,
    actorUserId: string,
  ): Promise<PublicAppearance> {
    const input = applyThemePresetDto.parse(data);
    const preset = await this.presets.findById(id);
    if (!preset) HttpError.notFound("Theme preset not found");

    const parsed = this.validator.safeParse(preset.designConfig);
    if (!parsed.success) {
      HttpError.badRequest("This theme preset is no longer valid");
    }

    return this.appearance.replaceDesign(
      parsed.data,
      input.expectedRevision,
      actorUserId,
      {
        action: "appearance.presetApplied",
        metadata: {
          presetId: preset.id,
          presetSlug: preset.slug,
          presetName: preset.name,
        },
      },
    );
  }

  private project(row: StoredThemePreset): PublicThemePreset | null {
    const parsed = this.validator.safeParse(row.designConfig);
    if (!parsed.success) {
      console.warn(
        `[themePresets] skipping invalid stored preset ${row.slug}`,
      );
      return null;
    }

    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      designConfig: parsed.data,
      isBuiltIn: row.isBuiltIn,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private projectOrThrow(row: StoredThemePreset): PublicThemePreset {
    const preset = this.project(row);
    if (!preset) HttpError.badRequest("Theme preset is not a valid design");
    return preset;
  }
}
