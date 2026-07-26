import { describe, expect, it } from "bun:test";
import { getGuardMetadata } from "najm-guard";
import { getMcpTools } from "najm-mcp";
import { getValidationConfig } from "najm-validation";

import { AuditService } from "../src/modules/audit";
import {
  BudgetAccountRepository,
  BudgetLedgerRepository,
} from "../src/modules/budgets";
import { FamilyRepository } from "../src/modules/families";
import { OutboxService } from "../src/modules/outbox";
import {
  FundingRepository,
  FundingService,
  SettingController,
  SettingRepository,
  SettingService,
  updateSettingsDto,
  type PlatformSettingsPatch,
} from "../src/modules/settings";
import {
  DEFAULT_PENDING_CONTRIBUTION_EXPIRY_HOURS,
} from "../src/modules/settings/settingSchema";

const householdId = "00000000-0000-4000-8000-000000000091";
const familyId = "00000000-0000-4000-8000-000000000092";

describe("configurable family funding contracts", () => {
  it("accepts a positive target, expiry hours, and explicit form-fill flag, stripping unknown fields", () => {
    expect(
      updateSettingsDto.parse({
        familyFundingTargetMinor: "500000",
        pendingContributionExpiryHours: "72",
        formFillEnabled: true,
        reason: "unused",
        currency: "EUR",
      }),
    ).toEqual({
      familyFundingTargetMinor: 500000,
      pendingContributionExpiryHours: 72,
      formFillEnabled: true,
    });
    expect(
      updateSettingsDto.safeParse({
        familyFundingTargetMinor: 0,
        pendingContributionExpiryHours: 72,
        formFillEnabled: true,
      }).success,
    ).toBe(false);
  });

  it("requires an explicit boolean form-fill flag", () => {
    expect(
      updateSettingsDto.safeParse({
        familyFundingTargetMinor: 500000,
        pendingContributionExpiryHours: 72,
        formFillEnabled: "true",
      }).success,
    ).toBe(false);
  });

  it("validates the pending contribution expiry hour window 1..720", () => {
    for (const hours of [1, 72, 720]) {
      expect(
        updateSettingsDto.safeParse({
          familyFundingTargetMinor: 500000,
          pendingContributionExpiryHours: hours,
          formFillEnabled: false,
        }).success,
      ).toBe(true);
    }
    for (const hours of [0, -1, 721, 1.5, "garbage"]) {
      expect(
        updateSettingsDto.safeParse({
          familyFundingTargetMinor: 500000,
          pendingContributionExpiryHours: hours,
          formFillEnabled: false,
        }).success,
      ).toBe(false);
    }
  });

  it("exposes read and update commands only", () => {
    expect(getMcpTools(SettingController).map((tool) => tool.methodKey)).toEqual([
      "getSettings",
      "getFormFill",
      "updateSettings",
    ]);
    expect(
      getValidationConfig(SettingController.prototype, "updateSettings")?.body,
    ).toBe(updateSettingsDto);
    expect(
      getGuardMetadata(SettingController, "updateSettings").map(
        (guard) => guard.guardClass.name,
      ),
    ).toContain("OperatorRoleGuard");
  });
});

describe("configurable family funding workflow", () => {
  it("derives progress from the persisted target and validated contribution ledger", async () => {
    const service = fundingService({ targetMinor: 500000, fundedMinor: 325000 });

    await expect(service.getProgress(householdId)).resolves.toEqual({
      status: "pending_funding",
      targetMinor: 500000,
      fundedMinor: 325000,
      pendingMinor: 0,
      remainingMinor: 175000,
      availableToContributeMinor: 175000,
      capacityStatus: "open",
      nextPendingExpiryAt: null,
      activatedAt: null,
    });
  });

  it("activates once at the configured target and records safe effects", async () => {
    const activated: string[] = [];
    const audits: Record<string, unknown>[] = [];
    const events: Record<string, unknown>[] = [];
    const service = fundingService({
      targetMinor: 250000,
      fundedMinor: 250000,
      onActivate: (id) => activated.push(id),
      audits,
      events,
    });

    const progress = await service.activateIfEligible(
      householdId,
      "operator-user",
    );

    expect(progress).toMatchObject({
      status: "active",
      remainingMinor: 0,
      availableToContributeMinor: 0,
      capacityStatus: "funded",
    });
    expect(activated).toEqual([householdId]);
    expect(audits).toEqual([
      expect.objectContaining({ action: "family.fundingActivated" }),
    ]);
    expect(events).toEqual([
      expect.objectContaining({ topic: "family.fundingActivated" }),
    ]);
  });

  it("keeps order submission locked below the configured target", async () => {
    const service = fundingService({ targetMinor: 250000, fundedMinor: 249999 });

    await expect(service.ensureOrderEligible(householdId)).rejects.toMatchObject({
      status: 409,
    });
  });

  it("persists the patch through the repository and audits expiry hour changes", async () => {
    const updates: unknown[] = [];
    const audits: unknown[] = [];
    const service = new SettingService(
      {
        find: async () => settingRecord(500000, false, 72),
        update: async (patch: PlatformSettingsPatch) => {
          updates.push(patch);
          return settingRecord(
            patch.familyFundingTargetMinor,
            patch.formFillEnabled,
            patch.pendingContributionExpiryHours,
            patch.updatedByUserId,
          );
        },
      } as unknown as SettingRepository,
      {
        record: async (event: Record<string, unknown>) => {
          audits.push(event);
          return event;
        },
      } as unknown as AuditService,
    );

    const result = await service.update(
      {
        familyFundingTargetMinor: 300000,
        pendingContributionExpiryHours: 96,
        formFillEnabled: true,
      },
      "operator-user",
    );

    expect(result).toMatchObject({
      familyFundingTargetMinor: 300000,
      pendingContributionExpiryHours: 96,
      formFillEnabled: true,
      updatedByUserId: "operator-user",
    });
    expect(updates).toEqual([
      {
        familyFundingTargetMinor: 300000,
        pendingContributionExpiryHours: 96,
        formFillEnabled: true,
        updatedByUserId: "operator-user",
      },
    ]);
    expect(audits).toEqual([
      expect.objectContaining({
        action: "settings.pendingContributionExpiryUpdated",
        metadata: { previousHours: 72, expiryHours: 96 },
      }),
    ]);
  });

  it("does not audit when the expiry hours are unchanged", async () => {
    const audits: unknown[] = [];
    const service = new SettingService(
      {
        find: async () => settingRecord(500000, false, 72),
        update: async (patch: PlatformSettingsPatch) =>
          settingRecord(
            patch.familyFundingTargetMinor,
            patch.formFillEnabled,
            patch.pendingContributionExpiryHours,
          ),
      } as unknown as SettingRepository,
      {
        record: async (event: Record<string, unknown>) => {
          audits.push(event);
          return event;
        },
      } as unknown as AuditService,
    );

    await service.update(
      {
        familyFundingTargetMinor: 600000,
        pendingContributionExpiryHours: 72,
        formFillEnabled: false,
      },
      "operator-user",
    );

    expect(audits).toEqual([]);
  });
});

function fundingService({
  targetMinor,
  fundedMinor,
  onActivate,
  audits = [],
  events = [],
  pendingMinor = 0,
}: {
  targetMinor: number;
  fundedMinor: number;
  onActivate?: (familyProfileId: string) => void;
  audits?: Record<string, unknown>[];
  events?: Record<string, unknown>[];
  pendingMinor?: number;
}) {
  return new FundingService(
    {
      findById: async () => ({
        id: familyId,
        fundingStatus: "pending_funding",
        fundingTargetMinor: targetMinor,
        fundingActivatedAt: null,
      }),
      activateFunding: async (id: string) => {
        onActivate?.(id);
        return { id: familyId };
      },
    } as unknown as FamilyRepository,
    {
      findByFamilyId: async () => ({ id: "budget-account" }),
    } as unknown as BudgetAccountRepository,
    {
      validatedFundingTotal: async () => fundedMinor,
    } as unknown as BudgetLedgerRepository,
    {
      record: async (event: Record<string, unknown>) => {
        audits.push(event);
        return event;
      },
    } as unknown as AuditService,
    {
      enqueue: async (event: Record<string, unknown>) => {
        events.push(event);
        return event;
      },
    } as unknown as OutboxService,
    {
      livePendingTotalForFamily: async () => ({ amountMinor: pendingMinor }),
      earliestPendingExpiry: async () => null,
    } as unknown as FundingRepository,
  );
}

function settingRecord(
  familyFundingTargetMinor: number,
  formFillEnabled = false,
  pendingContributionExpiryHours: number = DEFAULT_PENDING_CONTRIBUTION_EXPIRY_HOURS,
  updatedByUserId: string | null = null,
) {
  return {
    id: "platform",
    familyFundingTargetMinor,
    pendingContributionExpiryHours,
    formFillEnabled,
    currency: "MAD",
    updatedByUserId,
    createdAt: new Date("2026-07-18T00:00:00.000Z"),
    updatedAt: new Date("2026-07-18T00:00:00.000Z"),
  };
}
