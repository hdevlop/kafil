import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  spyOn,
} from "bun:test";
import { getGuardMetadata } from "najm-guard";
import { getMcpTools } from "najm-mcp";
import { getValidationConfig } from "najm-validation";
import { parseNajmDesignConfig } from "najm-kit";

import { db } from "../src/config/databaseConfig";
import { AuditRepository, AuditService } from "../src/modules/audit";
import {
  AppearanceController,
  type AppearanceWrite,
  AppearanceRepository,
  AppearanceService,
  appearanceDesignConfigDto,
  AppearanceValidator,
  getFactoryDesignConfig,
  MAX_APPEARANCE_CONFIG_BYTES,
  resetAppearanceDto,
  updateAppearanceDto,
} from "../src/modules/settings";

const actorUserId = "admin-user";

function changedPrimary(color: string) {
  const design = getFactoryDesignConfig();
  design.theme.tokens = { ...design.theme.tokens, primary: color };
  return design;
}

describe("appearance validation", () => {
  it("keeps the factory theme valid for both Kafil and the installed Najm Kit contract", () => {
    const factory = getFactoryDesignConfig();

    expect(() => parseNajmDesignConfig(factory)).not.toThrow();
    expect(appearanceDesignConfigDto.parse(factory)).toEqual(factory);
    expect(factory.typography).toEqual({
      fontSans: "var(--font-cairo), Cairo, sans-serif",
      fontHeading: "var(--font-cairo), Cairo, sans-serif",
      fontMono: "ui-monospace, SFMono-Regular, Menlo, monospace",
      baseSize: "14px",
      scale: "default",
      lineHeight: "1.5",
      letterSpacing: "0",
    });
  });

  it("accepts the complete installed customizer shape with strict revisions", () => {
    const designConfig = changedPrimary("#126e45");
    designConfig.theme.overrides = {
      ...designConfig.theme.overrides,
      light: { primary: "rgb(18 110 69)" },
      dark: { ...designConfig.theme.overrides?.dark, primary: "#74c69d" },
    };

    expect(
      updateAppearanceDto.parse({ expectedRevision: 3, designConfig }),
    ).toEqual({ expectedRevision: 3, designConfig });
    expect(
      resetAppearanceDto.parse({ expectedRevision: 3 }),
    ).toEqual({ expectedRevision: 3 });
    expect(
      updateAppearanceDto.safeParse({
        expectedRevision: "3",
        designConfig,
      }).success,
    ).toBe(false);
    expect(
      resetAppearanceDto.safeParse({ expectedRevision: 3, force: true }).success,
    ).toBe(false);
  });

  it("rejects unknown, executable, remote, and uneditable design fields", () => {
    const unknownToken = getFactoryDesignConfig() as unknown as Record<
      string,
      unknown
    >;
    const unknownTheme = unknownToken.theme as Record<string, unknown>;
    (unknownTheme.tokens as Record<string, unknown>).unknown = "#ffffff";

    const slots = getFactoryDesignConfig() as unknown as Record<string, unknown>;
    const slotComponents = slots.components as Record<string, unknown>;
    (slotComponents.input as Record<string, unknown>).slots = {
      root: { className: "fixed inset-0" },
    };

    const remoteFont = getFactoryDesignConfig();
    remoteFont.typography = {
      ...remoteFont.typography,
      fontSans: "https://fonts.example.test/unsafe.woff2",
    };

    const dataColor = getFactoryDesignConfig();
    dataColor.components = {
      ...dataColor.components,
      table: {
        ...dataColor.components?.table,
        headerColor: "url(data:image/svg+xml,unsafe)",
      },
    };

    for (const designConfig of [unknownToken, slots, remoteFont, dataColor]) {
      expect(
        updateAppearanceDto.safeParse({ expectedRevision: 1, designConfig })
          .success,
      ).toBe(false);
    }
  });

  it("requires version 1, supported values, strict override objects, and a bounded payload", () => {
    const invalidVersion = {
      ...getFactoryDesignConfig(),
      version: 2,
    };
    const invalidRadius = getFactoryDesignConfig();
    (invalidRadius.theme as Record<string, unknown>).radius = "999px";
    const invalidOverride = getFactoryDesignConfig();
    (invalidOverride.theme as Record<string, unknown>).overrides = {
      sepia: { primary: "#ffffff" },
    };
    const oversized = {
      ...getFactoryDesignConfig(),
      unsupported: "x".repeat(MAX_APPEARANCE_CONFIG_BYTES),
    };

    for (const designConfig of [
      invalidVersion,
      invalidRadius,
      invalidOverride,
    ]) {
      expect(appearanceDesignConfigDto.safeParse(designConfig).success).toBe(
        false,
      );
    }

    const oversizedResult = appearanceDesignConfigDto.safeParse(oversized);
    expect(oversizedResult.success).toBe(false);
    if (!oversizedResult.success) {
      expect(oversizedResult.error.issues.map(({ message }) => message)).toContain(
        "Appearance design exceeds the size limit",
      );
    }
  });
});

describe("appearance service", () => {
  let originalTransaction: typeof db.transaction;

  beforeEach(() => {
    const transactionalDb = db as unknown as {
      transaction: (...args: unknown[]) => Promise<unknown>;
    };
    originalTransaction = db.transaction;
    transactionalDb.transaction = (async (callback: unknown) =>
      (callback as (tx: unknown) => Promise<unknown>)({})) as never;
  });

  afterEach(() => {
    (db as { transaction: typeof db.transaction }).transaction =
      originalTransaction;
  });

  it("locks, preserves typography and uneditable fields, increments revision, and audits changed groups", async () => {
    const calls: string[] = [];
    const writes: AppearanceWrite[] = [];
    const audits: Record<string, unknown>[] = [];
    const current = getFactoryDesignConfig();
    current.typography = {
      ...current.typography,
      fontSans: "system-ui, sans-serif",
    };
    const candidate = changedPrimary("#126e45");
    candidate.theme.mode = "dark";
    candidate.typography = { ...candidate.typography, fontSans: "serif" };
    candidate.components = {
      ...candidate.components,
      sidebar: {
        ...candidate.components?.sidebar,
        expandedWidth: 300,
      },
    };

    const service = new AppearanceService(
      {
        lock: async () => {
          calls.push("lock");
          return { appearanceRevision: 4, designConfig: current };
        },
        write: async (input: AppearanceWrite) => {
          calls.push("write");
          writes.push(input);
          return input;
        },
      } as unknown as AppearanceRepository,
      {
        record: async (input: Record<string, unknown>) => {
          calls.push("audit");
          audits.push(input);
          return input;
        },
      } as unknown as AuditService,
      new AppearanceValidator(),
    );

    const result = await service.save(
      { expectedRevision: 4, designConfig: candidate },
      actorUserId,
    );
    const factory = getFactoryDesignConfig();

    expect(calls).toEqual(["lock", "write", "audit"]);
    expect(result.revision).toBe(5);
    expect(result.designConfig.theme.tokens?.primary).toBe("#126e45");
    expect(result.designConfig.theme.mode).toBe(factory.theme.mode);
    expect(result.designConfig.typography).toEqual(current.typography);
    expect(result.designConfig.components?.sidebar?.expandedWidth).toEqual(
      factory.components?.sidebar?.expandedWidth,
    );
    expect(writes).toEqual([
      {
        appearanceRevision: 5,
        designConfig: result.designConfig,
        updatedByUserId: actorUserId,
      },
    ]);
    expect(audits).toEqual([
      {
        action: "appearance.themeUpdated",
        actorUserId,
        metadata: {
          previousRevision: 4,
          newRevision: 5,
          changedGroups: ["brand"],
        },
        resource: "platformSettings",
        resourceId: "platform",
      },
    ]);
  });

  it("rejects a stale write before updating or auditing", async () => {
    let writes = 0;
    let audits = 0;
    const service = new AppearanceService(
      {
        lock: async () => ({
          appearanceRevision: 9,
          designConfig: getFactoryDesignConfig(),
        }),
        write: async () => {
          writes += 1;
          return undefined;
        },
      } as unknown as AppearanceRepository,
      {
        record: async () => {
          audits += 1;
          return undefined;
        },
      } as unknown as AuditService,
      new AppearanceValidator(),
    );

    await expect(
      service.save(
        { expectedRevision: 8, designConfig: changedPrimary("#126e45") },
        actorUserId,
      ),
    ).rejects.toMatchObject({ status: 409 });
    expect(writes).toBe(0);
    expect(audits).toBe(0);
  });

  it("clears the override, increments revision, and returns the factory theme", async () => {
    const writes: AppearanceWrite[] = [];
    const audits: Record<string, unknown>[] = [];
    const service = new AppearanceService(
      {
        lock: async () => ({
          appearanceRevision: 7,
          designConfig: changedPrimary("#126e45"),
        }),
        write: async (input: AppearanceWrite) => {
          writes.push(input);
          return input;
        },
      } as unknown as AppearanceRepository,
      {
        record: async (input: Record<string, unknown>) => {
          audits.push(input);
          return input;
        },
      } as unknown as AuditService,
      new AppearanceValidator(),
    );

    const result = await service.reset({ expectedRevision: 7 }, actorUserId);

    expect(result).toEqual({
      designConfig: getFactoryDesignConfig(),
      revision: 8,
    });
    expect(writes).toEqual([
      {
        appearanceRevision: 8,
        designConfig: null,
        updatedByUserId: actorUserId,
      },
    ]);
    expect(audits).toEqual([
      expect.objectContaining({
        action: "appearance.themeReset",
        metadata: {
          previousRevision: 7,
          newRevision: 8,
          changedGroups: ["brand"],
        },
      }),
    ]);
  });

  it("uses the factory fallback for missing, invalid, or unavailable storage", async () => {
    const warning = spyOn(console, "warn").mockImplementation(() => undefined);
    const validator = new AppearanceValidator();
    const missing = new AppearanceService(
      { find: async () => undefined } as unknown as AppearanceRepository,
      {} as AuditService,
      validator,
    );
    const invalid = new AppearanceService(
      {
        find: async () => ({
          appearanceRevision: 12,
          designConfig: { version: 2 },
        }),
      } as unknown as AppearanceRepository,
      {} as AuditService,
      validator,
    );
    const unavailable = new AppearanceService(
      {
        find: async () => {
          throw new Error("postgresql://secret@database/kafil");
        },
      } as unknown as AppearanceRepository,
      {} as AuditService,
      validator,
    );

    await expect(missing.get()).resolves.toEqual({
      designConfig: getFactoryDesignConfig(),
      revision: 1,
    });
    await expect(invalid.get()).resolves.toEqual({
      designConfig: getFactoryDesignConfig(),
      revision: 12,
    });
    await expect(unavailable.get()).resolves.toEqual({
      designConfig: getFactoryDesignConfig(),
      revision: 1,
    });
    expect(warning).toHaveBeenCalledTimes(2);
    const warningText = warning.mock.calls.flat().join(" ");
    expect(warningText).toContain("revision 12");
    expect(warningText).not.toContain("secret");
    warning.mockRestore();
  });
});

describe("appearance controller", () => {
  it("exposes a public read and admin-only validated save/reset tools", () => {
    expect(
      getMcpTools(AppearanceController).map(({ methodKey }) => methodKey),
    ).toEqual(["getAppearance", "updateAppearance", "resetAppearance"]);
    expect(getGuardMetadata(AppearanceController, "getAppearance")).toEqual([]);
    for (const method of ["updateAppearance", "resetAppearance"]) {
      expect(
        getGuardMetadata(AppearanceController, method).map(
          ({ guardClass }) => guardClass.name,
        ),
      ).toContain("AdminRoleGuard");
    }
    expect(
      getValidationConfig(AppearanceController.prototype, "updateAppearance")
        ?.body,
    ).toBe(updateAppearanceDto);
    expect(
      getValidationConfig(AppearanceController.prototype, "resetAppearance")
        ?.body,
    ).toBe(resetAppearanceDto);
  });

  it("returns only the public appearance projection", async () => {
    const projection = {
      designConfig: getFactoryDesignConfig(),
      revision: 3,
    };
    const controller = new AppearanceController({
      get: async () => projection,
    } as AppearanceService);

    await expect(controller.getAppearance()).resolves.toEqual(projection);
    expect(await controller.getAppearance()).not.toHaveProperty(
      "updatedByUserId",
    );
  });

  it("retains safe changed-group arrays in persisted audit metadata", async () => {
    const records: Record<string, unknown>[] = [];
    const audits = new AuditService({
      create: async (input: Record<string, unknown>) => {
        records.push(input);
        return input;
      },
    } as unknown as AuditRepository);

    await audits.record({
      action: "appearance.themeUpdated",
      metadata: {
        previousRevision: 2,
        newRevision: 3,
        changedGroups: ["brand", "layout"],
        nested: { unsafe: true },
      },
      resource: "platformSettings",
      resourceId: "platform",
    });

    expect(records).toEqual([
      expect.objectContaining({
        metadata: {
          previousRevision: 2,
          newRevision: 3,
          changedGroups: ["brand", "layout"],
        },
      }),
    ]);
  });
});
