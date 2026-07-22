import { describe, expect, it } from "bun:test";
import { getMcpTools } from "najm-mcp";
import { getValidationConfig } from "najm-validation";

import { AuditService } from "../src/modules/audit";
import {
  BudgetAccountRepository,
  BudgetController,
  BudgetLedgerRepository,
  budgetFamilyIdParams,
  budgetLedgerListQuery,
  BudgetService,
  BudgetValidator,
  manualBudgetAdjustmentDto,
  MonthlyBudgetLimitRepository,
  setMonthlyBudgetLimitDto,
} from "../src/modules/budgets";
import { FamilyRepository } from "../src/modules/families";
import { FundingService } from "../src/modules/settings";

const householdId = "00000000-0000-4000-8000-000000000050";
const accountId = "00000000-0000-4000-8000-000000000051";
const ledgerId = "00000000-0000-4000-8000-000000000052";

describe("Phase 3 budget route boundaries", () => {
  it("accepts only command-specific limit and manual-adjustment input", () => {
    expect(
      setMonthlyBudgetLimitDto.parse({
        month: "2026-08-01",
        limitMinor: "15000",
        reason: "August allocation",
        availableMinor: 0,
      }),
    ).toEqual({
      month: "2026-08-01",
      limitMinor: 15000,
      reason: "August allocation",
    });
    expect(
      setMonthlyBudgetLimitDto.safeParse({
        month: "2026-08-02",
        limitMinor: 15000,
        reason: "Invalid month",
      }).success,
    ).toBe(false);
    expect(
      manualBudgetAdjustmentDto.parse({
        amountMinor: -250,
        idempotencyKey: "operator-adjustment-001",
        reason: "Correct duplicate entry",
        entryType: "contribution_credit",
      }),
    ).toEqual({
      amountMinor: -250,
      idempotencyKey: "operator-adjustment-001",
      reason: "Correct duplicate entry",
    });
  });

  it("exposes only budget reads and command-specific mutations", () => {
    expect(getMcpTools(BudgetController).map((tool) => tool.methodKey)).toEqual([
      "getOwnSummary",
      "listOwnLedger",
      "getSummary",
      "listLedger",
      "reconcile",
      "setMonthlyLimit",
      "adjust",
    ]);
    expect(
      getValidationConfig(BudgetController.prototype, "getSummary")?.params,
    ).toBe(budgetFamilyIdParams);
    expect(
      getValidationConfig(BudgetController.prototype, "listLedger"),
    ).toMatchObject({
      params: budgetFamilyIdParams,
      query: budgetLedgerListQuery,
    });
    expect(
      getValidationConfig(BudgetController.prototype, "setMonthlyLimit"),
    ).toMatchObject({
      body: setMonthlyBudgetLimitDto,
      params: budgetFamilyIdParams,
    });
    expect(getValidationConfig(BudgetController.prototype, "adjust")).toMatchObject(
      {
        body: manualBudgetAdjustmentDto,
        params: budgetFamilyIdParams,
      },
    );
  });
});

describe("Phase 3 budget mutation workflow", () => {
  it("returns a family-safe ledger projection without internal operational fields", async () => {
    const service = new BudgetService(
      {} as BudgetAccountRepository,
      {
        listByAccountId: async () => [
          ledgerRecord({
            sponsorName: "Sponsor Name",
            sponsorImage: "https://example.com/sponsor.png",
            sponsorGender: "F",
          }),
        ],
      } as unknown as BudgetLedgerRepository,
      {} as MonthlyBudgetLimitRepository,
      {
        findByUserId: async () => ({
          role: "family",
          familyProfileId: householdId,
        }),
      } as unknown as FamilyRepository,
      {} as AuditService,
      {
        ensureAccountForFamily: async () => accountRecord(),
      } as unknown as BudgetValidator,
      {} as FundingService,
    );

    const [entry] = await service.listOwnLedger("family-user", {
      limit: 25,
      offset: 0,
    });

    expect(entry).toMatchObject({
      id: ledgerId,
      entryType: "manual_credit",
      amountMinor: 500,
    });
    expect(entry).not.toHaveProperty("actorUserId");
    expect(entry).not.toHaveProperty("budgetAccountId");
    expect(entry).not.toHaveProperty("idempotencyKey");
    expect(entry).not.toHaveProperty("reason");
    expect(entry).not.toHaveProperty("reversesEntryId");
    expect(entry).not.toHaveProperty("sourceId");
    expect(entry).not.toHaveProperty("sponsorName");
    expect(entry).not.toHaveProperty("sponsorImage");
    expect(entry).not.toHaveProperty("sponsorGender");
  });

  it("keeps the contributing sponsor on the operator ledger", async () => {
    const service = new BudgetService(
      {} as BudgetAccountRepository,
      {
        listByAccountId: async () => [
          ledgerRecord({
            sponsorName: "Sponsor Name",
            sponsorImage: "https://example.com/sponsor.png",
            sponsorGender: "F",
          }),
        ],
      } as unknown as BudgetLedgerRepository,
      {} as MonthlyBudgetLimitRepository,
      {} as FamilyRepository,
      {} as AuditService,
      {
        ensureAccountForFamily: async () => accountRecord(),
      } as unknown as BudgetValidator,
      {} as FundingService,
    );

    const [entry] = await service.listLedger(householdId, {
      limit: 25,
      offset: 0,
    });

    expect(entry).toMatchObject({
      id: ledgerId,
      sponsorName: "Sponsor Name",
      sponsorImage: "https://example.com/sponsor.png",
      sponsorGender: "F",
    });
  });

  it("serializes a manual credit through the account and append-only ledger", async () => {
    const balances: Record<string, unknown>[] = [];
    const entries: Record<string, unknown>[] = [];
    const audits: Record<string, unknown>[] = [];
    const service = new BudgetService(
      {
        lockByFamilyId: async () => accountRecord(),
        updateBalances: async (_id: string, balance: Record<string, unknown>) => {
          balances.push(balance);
          return accountRecord(balance);
        },
      } as unknown as BudgetAccountRepository,
      {
        findByIdempotencyKey: async () => undefined,
        append: async (entry: Record<string, unknown>) => {
          entries.push(entry);
          return { id: ledgerId, ...entry };
        },
      } as unknown as BudgetLedgerRepository,
      {} as MonthlyBudgetLimitRepository,
      {} as FamilyRepository,
      {
        record: async (event: Record<string, unknown>) => {
          audits.push(event);
          return event;
        },
      } as unknown as AuditService,
      {} as BudgetValidator,
      {} as FundingService,
    );

    await service.adjust(
      householdId,
      {
        amountMinor: 500,
        idempotencyKey: "operator-adjustment-002",
        reason: "Correct validated cash receipt",
      },
      "operator-user",
    );

    expect(balances).toEqual([
      { availableMinor: 1500, reservedMinor: 0, spentMinor: 0 },
    ]);
    expect(entries).toEqual([
      expect.objectContaining({
        budgetAccountId: accountId,
        entryType: "manual_credit",
        amountMinor: 500,
        availableAfterMinor: 1500,
        idempotencyKey: "operator-adjustment-002",
        sourceType: "manual_adjustment",
      }),
    ]);
    expect(audits).toEqual([
      expect.objectContaining({
        action: "budget.manuallyAdjusted",
        actorUserId: "operator-user",
        resource: "budgetLedgerEntries",
        resourceId: ledgerId,
      }),
    ]);
  });

  it("rejects a manual debit that would make the spendable balance negative", async () => {
    const service = new BudgetService(
      {
        lockByFamilyId: async () => accountRecord({ availableMinor: 100 }),
      } as unknown as BudgetAccountRepository,
      {
        findByIdempotencyKey: async () => undefined,
      } as unknown as BudgetLedgerRepository,
      {} as MonthlyBudgetLimitRepository,
      {} as FamilyRepository,
      {} as AuditService,
      {} as BudgetValidator,
      {} as FundingService,
    );

    await expect(
      service.adjust(
        householdId,
        {
          amountMinor: -101,
          idempotencyKey: "operator-adjustment-003",
          reason: "Attempted over-debit",
        },
        "operator-user",
      ),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("records a monthly limit with operator identity and a required reason", async () => {
    const limits: Record<string, unknown>[] = [];
    const audits: Record<string, unknown>[] = [];
    const service = new BudgetService(
      {} as BudgetAccountRepository,
      {} as BudgetLedgerRepository,
      {
        set: async (input: Record<string, unknown>) => {
          limits.push(input);
          return { id: "00000000-0000-4000-8000-000000000053", ...input };
        },
      } as unknown as MonthlyBudgetLimitRepository,
      {} as FamilyRepository,
      {
        record: async (event: Record<string, unknown>) => {
          audits.push(event);
          return event;
        },
      } as unknown as AuditService,
      {
        ensureAccountForFamily: async () => accountRecord(),
      } as unknown as BudgetValidator,
      {} as FundingService,
    );

    await service.setMonthlyLimit(
      householdId,
      {
        month: "2026-08-01",
        limitMinor: 12000,
        reason: "August family spending cap",
      },
      "operator-user",
    );

    expect(limits).toEqual([
      {
        budgetAccountId: accountId,
        limitMinor: 12000,
        month: "2026-08-01",
        reason: "August family spending cap",
        setByUserId: "operator-user",
      },
    ]);
    expect(audits).toEqual([
      expect.objectContaining({
        action: "budget.monthlyLimitSet",
        resource: "monthlyBudgetLimits",
      }),
    ]);
  });
});

function accountRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: accountId,
    familyProfileId: householdId,
    currency: "MAD",
    availableMinor: 1000,
    reservedMinor: 0,
    spentMinor: 0,
    version: 0,
    createdAt: new Date("2026-07-16T00:00:00.000Z"),
    updatedAt: new Date("2026-07-16T00:00:00.000Z"),
    ...overrides,
  };
}

function ledgerRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: ledgerId,
    budgetAccountId: accountId,
    entryType: "manual_credit",
    amountMinor: 500,
    availableAfterMinor: 1500,
    reservedAfterMinor: 0,
    spentAfterMinor: 0,
    sourceType: "manual_adjustment",
    sourceId: accountId,
    idempotencyKey: "operator-adjustment-004",
    actorUserId: "operator-user",
    reason: "Internal correction note",
    reversesEntryId: null,
    createdAt: new Date("2026-07-17T00:00:00.000Z"),
    ...overrides,
  };
}
