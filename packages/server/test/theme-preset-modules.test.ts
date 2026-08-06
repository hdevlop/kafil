import { describe, expect, it } from "bun:test";
import { getGuardMetadata } from "najm-guard";
import { getMcpTools } from "najm-mcp";
import { getValidationConfig } from "najm-validation";

import { AuditRepository, AuditService } from "../src/modules/audit";
import {
  type AppearanceWrite,
  AppearanceRepository,
  AppearanceService,
  AppearanceValidator,
  applyThemePresetDto,
  createThemePresetDto,
  getFactoryDesignConfig,
  MAX_THEME_PRESETS,
  ThemePresetController,
  ThemePresetRepository,
  ThemePresetService,
  themePresetIdParams,
  themePresetSlug,
} from "../src/modules/settings";

const actorUserId = "admin-user";
const presetId = "3f7d4a2e-1c5b-4f9a-8d6e-2b0c9a1f7e33";

function silentAudits() {
  return new AuditService({
    create: async (input: Record<string, unknown>) => input,
  } as unknown as AuditRepository);
}

function recordingAudits(sink: Record<string, unknown>[]) {
  return new AuditService({
    create: async (input: Record<string, unknown>) => {
      sink.push(input);
      return input;
    },
  } as unknown as AuditRepository);
}

function storedPreset(overrides: Record<string, unknown> = {}) {
  return {
    id: presetId,
    slug: "sable",
    name: "Sable",
    designConfig: getFactoryDesignConfig(),
    isBuiltIn: false,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

describe("theme preset slugs", () => {
  it("collapses case, spacing, and punctuation into one stable key", () => {
    expect(themePresetSlug("Sable")).toBe("sable");
    expect(themePresetSlug("  SABLE  ")).toBe("sable");
    expect(themePresetSlug("Nuit — Indigo")).toBe("nuit-indigo");
    expect(themePresetSlug("Ardoise")).toBe(themePresetSlug("ardoise"));
  });

  it("still produces a non-empty key for a non-latin name", () => {
    const slug = themePresetSlug("مظهر");
    expect(slug.length).toBeGreaterThan(0);
    expect(slug).toBe(themePresetSlug("مظهر"));
    expect(slug).not.toBe(themePresetSlug("مظهر آخر"));
  });
});

describe("theme preset validation", () => {
  it("requires a non-empty trimmed name and a valid design", () => {
    const designConfig = getFactoryDesignConfig();

    expect(createThemePresetDto.parse({ name: " Sable ", designConfig }).name)
      .toBe("Sable");
    expect(() => createThemePresetDto.parse({ name: "   ", designConfig }))
      .toThrow();
    expect(() => createThemePresetDto.parse({ name: "x".repeat(81), designConfig }))
      .toThrow();
    expect(() => createThemePresetDto.parse({ name: "Sable" })).toThrow();
  });

  it("rejects a design the appearance validator would not accept", () => {
    const designConfig = getFactoryDesignConfig();
    designConfig.theme.radius = "0.75rem";

    expect(() => createThemePresetDto.parse({ name: "Bad", designConfig }))
      .toThrow();
  });

  it("rejects unknown fields and non-positive revisions", () => {
    expect(() =>
      createThemePresetDto.parse({
        name: "Sable",
        designConfig: getFactoryDesignConfig(),
        isBuiltIn: true,
      }),
    ).toThrow();
    expect(() => applyThemePresetDto.parse({ expectedRevision: 0 })).toThrow();
    expect(applyThemePresetDto.parse({ expectedRevision: 4 })).toEqual({
      expectedRevision: 4,
    });
  });
});

describe("theme preset service", () => {
  it("rejects a duplicate name before writing", async () => {
    let inserted = false;
    const service = new ThemePresetService(
      {
        findBySlug: async () => storedPreset(),
        count: async () => 0,
        insert: async () => {
          inserted = true;
          return storedPreset();
        },
      } as unknown as ThemePresetRepository,
      {} as AppearanceService,
      silentAudits(),
      new AppearanceValidator(),
    );

    await expect(
      service.create(
        { name: "Sable", designConfig: getFactoryDesignConfig() },
        actorUserId,
      ),
    ).rejects.toThrow(/already exists/i);
    expect(inserted).toBe(false);
  });

  it("refuses to grow the library past the cap", async () => {
    const service = new ThemePresetService(
      {
        findBySlug: async () => undefined,
        count: async () => MAX_THEME_PRESETS,
        insert: async () => storedPreset(),
      } as unknown as ThemePresetRepository,
      {} as AppearanceService,
      silentAudits(),
      new AppearanceValidator(),
    );

    await expect(
      service.create(
        { name: "Another", designConfig: getFactoryDesignConfig() },
        actorUserId,
      ),
    ).rejects.toThrow(new RegExp(String(MAX_THEME_PRESETS)));
  });

  it("deletes a built-in preset and records that it was one", async () => {
    const records: Record<string, unknown>[] = [];
    const service = new ThemePresetService(
      {
        findById: async () => storedPreset({ isBuiltIn: true }),
        delete: async () => storedPreset({ isBuiltIn: true }),
      } as unknown as ThemePresetRepository,
      {} as AppearanceService,
      recordingAudits(records),
      new AppearanceValidator(),
    );

    await expect(
      service.remove(presetId, actorUserId),
    ).resolves.toMatchObject({ slug: "sable", isBuiltIn: true });
    expect(records[0]!.action).toBe("appearance.presetDeleted");
    expect(records[0]!.metadata).toMatchObject({
      presetSlug: "sable",
      wasBuiltIn: true,
    });
  });

  it("rejects deleting a preset that no longer exists", async () => {
    const service = new ThemePresetService(
      { findById: async () => undefined } as unknown as ThemePresetRepository,
      {} as AppearanceService,
      silentAudits(),
      new AppearanceValidator(),
    );

    await expect(service.remove(presetId, actorUserId)).rejects.toThrow(
      /not found/i,
    );
  });

  it("skips a stored preset that no longer validates instead of failing the list", async () => {
    const service = new ThemePresetService(
      {
        list: async () => [
          storedPreset(),
          storedPreset({ id: "broken", slug: "broken", designConfig: { nope: 1 } }),
        ],
      } as unknown as ThemePresetRepository,
      {} as AppearanceService,
      silentAudits(),
      new AppearanceValidator(),
    );

    const presets = await service.list();
    expect(presets.map(({ slug }) => slug)).toEqual(["sable"]);
    expect(presets[0]!.createdAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("applies a preset by replacing the whole design and bumping the revision", async () => {
    const writes: AppearanceWrite[] = [];
    const records: Record<string, unknown>[] = [];
    const design = getFactoryDesignConfig();
    design.theme.tokens = { ...design.theme.tokens, primary: "#126e45" };

    const appearance = new AppearanceService(
      {
        lock: async () => ({ appearanceRevision: 4, designConfig: null }),
        write: async (input: AppearanceWrite) => {
          writes.push(input);
          return input;
        },
      } as unknown as AppearanceRepository,
      recordingAudits(records),
      new AppearanceValidator(),
    );

    const service = new ThemePresetService(
      {
        findById: async () => storedPreset({ designConfig: design }),
      } as unknown as ThemePresetRepository,
      appearance,
      silentAudits(),
      new AppearanceValidator(),
    );

    await expect(
      service.apply(presetId, { expectedRevision: 4 }, actorUserId),
    ).resolves.toEqual({ designConfig: design, revision: 5 });

    expect(writes).toHaveLength(1);
    expect(writes[0]!.designConfig).toEqual(design);
    expect(writes[0]!.appearanceRevision).toBe(5);
    expect(records[0]!.action).toBe("appearance.presetApplied");
    expect(records[0]!.metadata).toMatchObject({
      presetSlug: "sable",
      presetName: "Sable",
      previousRevision: 4,
      newRevision: 5,
    });
  });

  it("refuses to apply against a stale revision", async () => {
    const writes: AppearanceWrite[] = [];
    const appearance = new AppearanceService(
      {
        lock: async () => ({ appearanceRevision: 9, designConfig: null }),
        write: async (input: AppearanceWrite) => {
          writes.push(input);
          return input;
        },
      } as unknown as AppearanceRepository,
      silentAudits(),
      new AppearanceValidator(),
    );

    const service = new ThemePresetService(
      { findById: async () => storedPreset() } as unknown as ThemePresetRepository,
      appearance,
      silentAudits(),
      new AppearanceValidator(),
    );

    await expect(
      service.apply(presetId, { expectedRevision: 4 }, actorUserId),
    ).rejects.toThrow(/reload/i);
    expect(writes).toHaveLength(0);
  });

  it("refuses to apply a preset whose stored design has gone invalid", async () => {
    const service = new ThemePresetService(
      {
        findById: async () => storedPreset({ designConfig: { version: 9 } }),
      } as unknown as ThemePresetRepository,
      {} as AppearanceService,
      silentAudits(),
      new AppearanceValidator(),
    );

    await expect(
      service.apply(presetId, { expectedRevision: 1 }, actorUserId),
    ).rejects.toThrow(/no longer valid/i);
  });
});

describe("theme preset controller", () => {
  it("keeps every endpoint admin-only and validated", () => {
    expect(
      getMcpTools(ThemePresetController).map(({ methodKey }) => methodKey),
    ).toEqual(["listPresets", "createPreset", "applyPreset", "deletePreset"]);

    for (const method of [
      "listPresets",
      "createPreset",
      "applyPreset",
      "deletePreset",
    ]) {
      expect(
        getGuardMetadata(ThemePresetController, method).map(
          ({ guardClass }) => guardClass.name,
        ),
        `${method} must be admin-only`,
      ).toContain("AdminRoleGuard");
    }

    expect(
      getValidationConfig(ThemePresetController.prototype, "createPreset")?.body,
    ).toBe(createThemePresetDto);
    expect(
      getValidationConfig(ThemePresetController.prototype, "applyPreset")?.body,
    ).toBe(applyThemePresetDto);
    expect(
      getValidationConfig(ThemePresetController.prototype, "applyPreset")?.params,
    ).toBe(themePresetIdParams);
    expect(
      getValidationConfig(ThemePresetController.prototype, "deletePreset")
        ?.params,
    ).toBe(themePresetIdParams);
  });
});
