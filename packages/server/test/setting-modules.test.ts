import { describe, expect, it } from "bun:test";
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
  FundingService,
  SettingController,
  SettingRepository,
  SettingService,
  updateFundingSettingDto,
} from "../src/modules/settings";

const householdId = "00000000-0000-4000-8000-000000000091";
const familyId = "00000000-0000-4000-8000-000000000092";

describe("configurable family funding contracts", () => {
  it("accepts a positive target and strips unknown business fields", () => {
    expect(
      updateFundingSettingDto.parse({
        familyFundingTargetMinor: "500000",
        reason: "Update the platform funding policy",
        currency: "EUR",
      }),
    ).toEqual({
      familyFundingTargetMinor: 500000,
      reason: "Update the platform funding policy",
    });
    expect(
      updateFundingSettingDto.safeParse({
        familyFundingTargetMinor: 0,
        reason: "Invalid target",
      }).success,
    ).toBe(false);
  });

  it("exposes read and audited update commands only", () => {
    expect(getMcpTools(SettingController).map((tool) => tool.methodKey)).toEqual([
      "getFunding",
      "updateFunding",
    ]);
    expect(
      getValidationConfig(SettingController.prototype, "updateFunding")?.body,
    ).toBe(updateFundingSettingDto);
  });
});

describe("configurable family funding workflow", () => {
  it("derives progress from the persisted target and validated contribution ledger", async () => {
    const service = fundingService({ targetMinor: 500000, fundedMinor: 325000 });

    await expect(service.getProgress(householdId)).resolves.toEqual({
      status: "pending_funding",
      targetMinor: 500000,
      fundedMinor: 325000,
      remainingMinor: 175000,
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

    expect(progress).toMatchObject({ status: "active", remainingMinor: 0 });
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

  it("updates the default used only when a new family omits a target", async () => {
    const audits: Record<string, unknown>[] = [];
    const service = new SettingService(
      {
        lock: async () => settingRecord(500000),
        updateFundingTarget: async (target: number) => settingRecord(target),
      } as unknown as SettingRepository,
      {
        record: async (event: Record<string, unknown>) => {
          audits.push(event);
          return event;
        },
      } as unknown as AuditService,
    );

    const result = await service.updateFunding(
      {
        familyFundingTargetMinor: 300000,
        reason: "Set the new-family default target",
      },
      "operator-user",
    );

    expect(result).toMatchObject({
      familyFundingTargetMinor: 300000,
    });
    expect(audits).toEqual([
      expect.objectContaining({
        action: "settings.familyFundingTargetUpdated",
        metadata: expect.objectContaining({
          previousTargetMinor: 500000,
          targetMinor: 300000,
        }),
      }),
    ]);
  });
});

function fundingService({
  targetMinor,
  fundedMinor,
  onActivate,
  audits = [],
  events = [],
}: {
  targetMinor: number;
  fundedMinor: number;
  onActivate?: (familyProfileId: string) => void;
  audits?: Record<string, unknown>[];
  events?: Record<string, unknown>[];
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
  );
}

function settingRecord(familyFundingTargetMinor: number) {
  return {
    id: "platform",
    familyFundingTargetMinor,
    currency: "MAD",
    updatedByUserId: null,
    createdAt: new Date("2026-07-18T00:00:00.000Z"),
    updatedAt: new Date("2026-07-18T00:00:00.000Z"),
  };
}
