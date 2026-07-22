import { describe, expect, it } from "bun:test";
import { drizzle } from "drizzle-orm/node-postgres";
import { getMcpTools } from "najm-mcp";
import pg from "pg";

import { AuditService } from "../src/modules/audit";
import {
  BudgetAccountRepository,
  BudgetLedgerRepository,
  BudgetService,
  BudgetValidator,
} from "../src/modules/budgets";
import {
  bulkDeleteContributionsDto,
  contributionReasonDto,
  ContributionController,
  ContributionPlanRepository,
  ContributionRepository,
  ContributionService,
  ContributionValidator,
  contributionListQuery,
  createContributionDto,
  createContributionPlanDto,
  recordContributionDto,
} from "../src/modules/contributions";
import { FamilyRepository } from "../src/modules/families";
import { FundingService } from "../src/modules/settings";

const contributionId = "00000000-0000-4000-8000-000000000061";
const secondContributionId = "00000000-0000-4000-8000-000000000066";
const accountId = "00000000-0000-4000-8000-000000000062";
const householdId = "00000000-0000-4000-8000-000000000063";

describe("Phase 3 contribution contracts", () => {
  it("limits sponsor input to command-specific plans and contributions", () => {
    expect(
      createContributionPlanDto.parse({
        supportAssignmentId: "00000000-0000-4000-8000-000000000064",
        kind: "monthly",
        amountMinor: "5000",
      }),
    ).toMatchObject({ kind: "monthly", amountMinor: 5000 });
    expect(
      createContributionDto.safeParse({
        supportAssignmentId: "00000000-0000-4000-8000-000000000064",
        amountMinor: 0,
        paymentMethod: "cash",
      }).success,
    ).toBe(false);
    expect(
      contributionReasonDto.safeParse({ reason: "no" }).success,
    ).toBe(false);
    expect(
      contributionListQuery.parse({ familyProfileId: householdId }),
    ).toMatchObject({ familyProfileId: householdId, limit: 50, offset: 0 });
    expect(
      bulkDeleteContributionsDto.parse({
        ids: [contributionId, secondContributionId],
      }),
    ).toEqual({ ids: [contributionId, secondContributionId] });
    expect(
      bulkDeleteContributionsDto.safeParse({
        ids: [contributionId, contributionId],
      }).success,
    ).toBe(false);
    expect(
      recordContributionDto.parse({
        supportAssignmentId: "00000000-0000-4000-8000-000000000064",
        amountMinor: 5000,
        paymentMethod: "cash",
        paidAt: "2026-07-18",
      }),
    ).toMatchObject({ amountMinor: 5000, paymentMethod: "cash" });
    expect(
      recordContributionDto.safeParse({
        supportAssignmentId: "00000000-0000-4000-8000-000000000064",
        amountMinor: 5000,
        paymentMethod: "cash",
        paidAt: "2999-01-01",
      }).success,
    ).toBe(false);
  });

  it("exposes explicit contribution commands without generic state updates", () => {
    expect(getMcpTools(ContributionController).map((tool) => tool.methodKey)).toEqual([
      "list",
      "listRecordingOptions",
      "listPlans",
      "listOwn",
      "getOwnSummary",
      "listOwnPlans",
      "getOwnPlan",
      "getOwn",
      "get",
      "createPlan",
      "pausePlan",
      "resumePlan",
      "stopPlan",
      "submit",
      "record",
      "validate",
      "reject",
      "refund",
      "bulkDelete",
      "delete",
    ]);
  });
});

describe("Phase 3 contribution transactions", () => {
  it("lists only active assignment options for operator recording", async () => {
    const database = drizzle(
      new pg.Pool({ connectionString: "postgresql://localhost/not-used" }),
    );
    const repository = new ContributionRepository();
    Object.assign(repository, { db: database });

    const query = repository.listRecordingOptions();
    const contributionListQuery = repository.list(25, 0, {});
    const familyContributionQuery = repository.list(25, 0, {
      familyProfileId: householdId,
    });

    expect(query.toSQL()).toMatchObject({ params: ["active"] });
    expect(query.toSQL().sql).toContain('inner join "sponsor_profiles"');
    expect(query.toSQL().sql).toContain('inner join "family_profiles"');
    expect(contributionListQuery.toSQL().sql).toContain(
      'inner join "sponsor_profiles"',
    );
    expect(contributionListQuery.toSQL().sql).toContain(
      'inner join "family_profiles"',
    );
    expect(contributionListQuery.toSQL().sql).toContain('"users"."image"');
    expect(contributionListQuery.toSQL().sql).toContain(
      '"sponsor_profiles"."gender"',
    );
    expect(familyContributionQuery.toSQL().sql).toContain(
      '"contributions"."family_profile_id"',
    );
    await database.$client.end();
  });

  it("records an offline payment as pending with operator audit ownership", async () => {
    const created: Record<string, unknown>[] = [];
    const audits: Record<string, unknown>[] = [];
    const outbox: Record<string, unknown>[] = [];
    const service = new ContributionService(
      {
        create: async (data: Record<string, unknown>) => {
          created.push(data);
          return contributionRecord(data);
        },
      } as unknown as ContributionRepository,
      {} as ContributionPlanRepository,
      {} as BudgetAccountRepository,
      {} as BudgetLedgerRepository,
      {
        record: async (event: Record<string, unknown>) => {
          audits.push(event);
          return event;
        },
      } as unknown as AuditService,
      {
        enqueue: async (event: Record<string, unknown>) => {
          outbox.push(event);
        },
      } as never,
      {
        ensureActiveAssignment: async () => ({
          id: "00000000-0000-4000-8000-000000000064",
          sponsorProfileId: "00000000-0000-4000-8000-000000000065",
          familyProfileId: householdId,
          status: "active",
        }),
      } as unknown as ContributionValidator,
      {} as FundingService,
    );

    const result = await service.record(
      {
        supportAssignmentId: "00000000-0000-4000-8000-000000000064",
        amountMinor: 12500,
        paymentMethod: "bank_transfer",
        externalReference: "BANK-42",
        paidAt: "2026-07-18",
      },
      "operator-user",
    );

    expect(created).toEqual([
      expect.objectContaining({
        amountMinor: 12500,
        paymentMethod: "bank_transfer",
        status: "pending",
      }),
    ]);
    expect(result).toMatchObject({ status: "pending", amountMinor: 12500 });
    expect(audits).toEqual([
      expect.objectContaining({
        action: "contribution.recorded",
        actorUserId: "operator-user",
      }),
    ]);
    expect(outbox).toEqual([
      expect.objectContaining({ topic: "contribution.recorded" }),
    ]);
  });

  it("limits sponsor budget summaries to active assignments", async () => {
    const database = drizzle(
      new pg.Pool({ connectionString: "postgresql://localhost/not-used" }),
    );
    const repository = new ContributionRepository();
    Object.assign(repository, { db: database });

    const query = repository.listOwnBudgetSummaries("sponsor-user");

    expect(query.toSQL()).toMatchObject({
      params: ["sponsor-user", "active"],
    });
    expect(query.toSQL().sql).toContain(
      '"support_assignments"."status" = $2',
    );
    await database.$client.end();
  });

  it("locks, credits, and validates a pending contribution exactly once", async () => {
    const balanceUpdates: Record<string, unknown>[] = [];
    const entries: Record<string, unknown>[] = [];
    const audits: Record<string, unknown>[] = [];
    const service = new ContributionService(
      {
        lockById: async () => contributionRecord(),
        validate: async () => ({ ...contributionRecord(), status: "validated" }),
      } as unknown as ContributionRepository,
      { findById: async () => undefined } as unknown as ContributionPlanRepository,
      {
        createForFamily: async () => accountRecord(),
        lockByFamilyId: async () => accountRecord(),
        updateBalances: async (_id: string, balance: Record<string, unknown>) => {
          balanceUpdates.push(balance);
          return accountRecord(balance);
        },
      } as unknown as BudgetAccountRepository,
      {
        findByIdempotencyKey: async () => undefined,
        append: async (entry: Record<string, unknown>) => {
          entries.push(entry);
          return { id: "ledger-credit", ...entry };
        },
      } as unknown as BudgetLedgerRepository,
      {
        record: async (event: Record<string, unknown>) => {
          audits.push(event);
          return event;
        },
      } as unknown as AuditService,
      { enqueue: async () => undefined } as never,
      {
        ensurePending: () => undefined,
        ensureHistoricalAssignment: async () => undefined,
      } as unknown as ContributionValidator,
      {
        activateIfEligible: async () => ({ status: "pending_funding" }),
      } as unknown as FundingService,
    );

    const result = await service.validate(contributionId, "operator-user");

    expect(balanceUpdates).toEqual([
      { availableMinor: 1500, reservedMinor: 0, spentMinor: 0 },
    ]);
    expect(entries).toEqual([
      expect.objectContaining({
        entryType: "contribution_credit",
        amountMinor: 500,
        idempotencyKey: `contribution:${contributionId}:credit`,
      }),
    ]);
    expect(result).toMatchObject({ contribution: { status: "validated" } });
    expect(audits).toEqual([
      expect.objectContaining({ action: "contribution.validated", actorUserId: "operator-user" }),
    ]);
  });

  it("returns an already-validated contribution without issuing a second credit", async () => {
    const service = new ContributionService(
      { lockById: async () => contributionRecord({ status: "validated" }) } as unknown as ContributionRepository,
      {} as ContributionPlanRepository,
      {} as BudgetAccountRepository,
      {} as BudgetLedgerRepository,
      {} as AuditService,
      {} as never,
      {} as ContributionValidator,
      {} as FundingService,
    );

    await expect(service.validate(contributionId, "operator-user")).resolves.toMatchObject({
      status: "validated",
    });
  });

  it("permanently deletes a mistaken pending contribution and records the admin action", async () => {
    const deleted: string[] = [];
    const audits: Record<string, unknown>[] = [];
    const service = new ContributionService(
      {
        lockById: async () => contributionRecord(),
        delete: async (id: string) => {
          deleted.push(id);
          return contributionRecord();
        },
      } as unknown as ContributionRepository,
      {} as ContributionPlanRepository,
      {} as BudgetAccountRepository,
      {} as BudgetLedgerRepository,
      { record: async (event: Record<string, unknown>) => audits.push(event) } as unknown as AuditService,
      {} as never,
      {} as ContributionValidator,
      {} as FundingService,
    );

    await service.delete(contributionId, "admin-user");

    expect(deleted).toEqual([contributionId]);
    expect(audits).toEqual([
      expect.objectContaining({
        action: "contribution.deleted",
        actorUserId: "admin-user",
        metadata: expect.objectContaining({
          permanent: true,
          previousStatus: "pending",
          ledgerEntriesRemoved: false,
        }),
      }),
    ]);
  });

  it("permanently deletes selected contributions in a stable order", async () => {
    const deleted: string[] = [];
    const audits: Record<string, unknown>[] = [];
    const service = new ContributionService(
      {
        lockById: async (id: string) => contributionRecord({ id }),
        delete: async (id: string) => {
          deleted.push(id);
          return contributionRecord({ id });
        },
      } as unknown as ContributionRepository,
      {} as ContributionPlanRepository,
      {} as BudgetAccountRepository,
      {} as BudgetLedgerRepository,
      { record: async (event: Record<string, unknown>) => audits.push(event) } as unknown as AuditService,
      {} as never,
      {} as ContributionValidator,
      {} as FundingService,
    );

    await service.deleteMany([secondContributionId, contributionId], "admin-user");

    expect(deleted).toEqual([contributionId, secondContributionId]);
    expect(audits).toEqual([
      expect.objectContaining({
        action: "contribution.deleted",
        resourceId: contributionId,
      }),
      expect.objectContaining({
        action: "contribution.deleted",
        resourceId: secondContributionId,
      }),
    ]);
  });

  it("removes a refunded contribution's linked ledger pair and rebuilds the family balance", async () => {
    const balanceUpdates: Record<string, unknown>[] = [];
    const erased: Record<string, unknown>[] = [];
    const service = new ContributionService(
      {
        lockById: async () => contributionRecord({ status: "refunded" }),
        delete: async () => contributionRecord({ status: "refunded" }),
      } as unknown as ContributionRepository,
      {} as ContributionPlanRepository,
      {
        lockByFamilyId: async () => accountRecord(),
        updateBalances: async (_id: string, balance: Record<string, unknown>) => {
          balanceUpdates.push(balance);
          return accountRecord(balance);
        },
      } as unknown as BudgetAccountRepository,
      {
        findByIdempotencyKey: async (key: string) =>
          key.endsWith(":credit")
            ? { id: "credit-ledger", budgetAccountId: accountId }
            : {
                id: "refund-ledger",
                budgetAccountId: accountId,
                reversesEntryId: "credit-ledger",
              },
        eraseContributionEntries: async (input: Record<string, unknown>) => {
          erased.push(input);
          return { availableMinor: 0, reservedMinor: 0, spentMinor: 0 };
        },
      } as unknown as BudgetLedgerRepository,
      { record: async () => undefined } as unknown as AuditService,
      {} as never,
      {} as ContributionValidator,
      {} as FundingService,
    );

    await service.delete(contributionId, "admin-user");

    expect(erased).toEqual([
      {
        budgetAccountId: accountId,
        creditEntryId: "credit-ledger",
        refundEntryId: "refund-ledger",
      },
    ]);
    expect(balanceUpdates).toEqual([
      { availableMinor: 0, reservedMinor: 0, spentMinor: 0 },
    ]);
  });

  it("requires a validated contribution to be refunded before permanent deletion", async () => {
    const service = new ContributionService(
      { lockById: async () => contributionRecord({ status: "validated" }) } as unknown as ContributionRepository,
      {} as ContributionPlanRepository,
      {} as BudgetAccountRepository,
      {} as BudgetLedgerRepository,
      {} as AuditService,
      {} as never,
      {} as ContributionValidator,
      {} as FundingService,
    );

    await expect(service.delete(contributionId, "admin-user")).rejects.toMatchObject({
      status: 409,
    });
  });

  it("returns sponsor budget totals without household identifiers or duplicate households", async () => {
    const service = new ContributionService(
      {
        ownValidatedTotal: async () => 900,
        listOwnBudgetSummaries: async () => [
          {
            supportAssignmentId: "aaaaaaaa-0000-4000-8000-000000000001",
            familyProfileId: householdId,
            availableMinor: 700,
            reservedMinor: 100,
            spentMinor: 200,
            currency: "MAD",
          },
          {
            supportAssignmentId: "bbbbbbbb-0000-4000-8000-000000000002",
            familyProfileId: householdId,
            availableMinor: 700,
            reservedMinor: 100,
            spentMinor: 200,
            currency: "MAD",
          },
        ],
      } as unknown as ContributionRepository,
      {} as ContributionPlanRepository,
      {} as BudgetAccountRepository,
      {} as BudgetLedgerRepository,
      {} as AuditService,
      {} as never,
      {} as ContributionValidator,
      { getProgress: async () => null } as unknown as FundingService,
    );

    const summary = await service.getOwnSummary("sponsor-user");

    expect(summary).toEqual({
      currency: "MAD",
      validatedMinor: 900,
      supportedBudgets: [
        {
          supportReference: "Support aaaaaaaa",
          availableMinor: 700,
          reservedMinor: 100,
          spentMinor: 200,
          remainingMinor: 700,
          currency: "MAD",
          funding: null,
        },
      ],
    });
    expect(JSON.stringify(summary)).not.toContain(householdId);
  });

  it("rejects a pending contribution without invoking a budget ledger", async () => {
    const rejected: string[] = [];
    const service = new ContributionService(
      {
        lockById: async () => contributionRecord(),
        reject: async () => {
          rejected.push("rejected");
          return { ...contributionRecord(), status: "rejected" };
        },
      } as unknown as ContributionRepository,
      {} as ContributionPlanRepository,
      {} as BudgetAccountRepository,
      {} as BudgetLedgerRepository,
      { record: async () => undefined } as unknown as AuditService,
      { enqueue: async () => undefined } as never,
      { ensurePending: () => undefined } as unknown as ContributionValidator,
      {} as FundingService,
    );

    await service.reject(
      contributionId,
      { reason: "Payment evidence is incomplete" },
      "operator-user",
    );
    expect(rejected).toEqual(["rejected"]);
  });

  it("reports reconciliation from the immutable latest ledger snapshot", async () => {
    const service = new BudgetService(
      {} as BudgetAccountRepository,
      {
        findLatestByAccountId: async () => ({
          availableAfterMinor: 1500,
          reservedAfterMinor: 0,
          spentAfterMinor: 0,
        }),
      } as unknown as BudgetLedgerRepository,
      {} as never,
      {} as FamilyRepository,
      {} as AuditService,
      {
        ensureAccountForFamily: async () => accountRecord({ availableMinor: 1500 }),
      } as unknown as BudgetValidator,
      {} as FundingService,
    );

    await expect(service.reconcile(householdId)).resolves.toMatchObject({
      reconciled: true,
    });
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
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function contributionRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: contributionId,
    contributionPlanId: null,
    supportAssignmentId: "00000000-0000-4000-8000-000000000064",
    sponsorProfileId: "00000000-0000-4000-8000-000000000065",
    familyProfileId: householdId,
    amountMinor: 500,
    currency: "MAD",
    paymentMethod: "cash",
    externalReference: null,
    status: "pending",
    submittedAt: new Date(),
    paidAt: null,
    validatedByUserId: null,
    validatedAt: null,
    rejectedByUserId: null,
    rejectedAt: null,
    rejectionReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
