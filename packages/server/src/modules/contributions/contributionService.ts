import { HttpError, Service } from "najm-core";
import { Transaction } from "najm-database";

import { AuditService } from "../audit/auditService";
import {
  BudgetAccountRepository,
  BudgetLedgerRepository,
} from "../budgets/budgetRepository";
import { applyBudgetBalanceDelta } from "../budgets/money";
import { OutboxService } from "../outbox/outboxService";
import { FundingService } from "../settings/fundingService";
import {
  type ContributionListQuery,
  contributionListQuery,
  type ContributionPlanListQuery,
  contributionPlanListQuery,
  type ContributionReasonDto,
  contributionReasonDto,
  type CreateContributionDto,
  createContributionDto,
  type CreateContributionPlanDto,
  createContributionPlanDto,
  type RecordContributionDto,
  recordContributionDto,
} from "./contributionDto";
import {
  ContributionPlanRepository,
  ContributionRepository,
} from "./contributionRepository";
import { ContributionValidator } from "./contributionValidator";

@Service()
export class ContributionService {
  constructor(
    private readonly contributions: ContributionRepository,
    private readonly plans: ContributionPlanRepository,
    private readonly accounts: BudgetAccountRepository,
    private readonly ledger: BudgetLedgerRepository,
    private readonly audits: AuditService,
    private readonly outbox: OutboxService,
    private readonly validator: ContributionValidator,
    private readonly funding: FundingService,
  ) {}

  list(query: ContributionListQuery) {
    const { limit, offset, ...filters } = contributionListQuery.parse(query ?? {});
    return this.contributions.list(limit, offset, filters);
  }

  listRecordingOptions() {
    return this.contributions.listRecordingOptions();
  }

  get(id: string) {
    return this.validator.ensureContributionExists(id);
  }

  async listOwn(userId: string, query: ContributionListQuery) {
    const { limit, offset, ...filters } = contributionListQuery.parse(query ?? {});
    return this.contributions.listOwn(userId, limit, offset, filters);
  }

  getOwn(id: string, userId: string) {
    return this.validator.ensureContributionOwnedBy(id, userId);
  }

  listPlans(query: ContributionPlanListQuery) {
    const { limit, offset, ...filters } = contributionPlanListQuery.parse(
      query ?? {},
    );
    return this.plans.list(limit, offset, filters);
  }

  async listOwnPlans(userId: string, query: ContributionPlanListQuery) {
    const { limit, offset, ...filters } = contributionPlanListQuery.parse(
      query ?? {},
    );
    return this.plans.listOwn(userId, limit, offset, filters);
  }

  getOwnPlan(id: string, userId: string) {
    return this.validator.ensurePlanOwnedBy(id, userId);
  }

  async getOwnSummary(userId: string) {
    const [validatedMinor, supportedBudgets] = await Promise.all([
      this.contributions.ownValidatedTotal(userId),
      this.contributions.listOwnBudgetSummaries(userId),
    ]);
    const householdBudgets = new Map<
      string,
      (typeof supportedBudgets)[number]
    >();
    for (const budget of supportedBudgets) {
      if (!householdBudgets.has(budget.familyProfileId)) {
        householdBudgets.set(budget.familyProfileId, budget);
      }
    }
    const summaries = await Promise.all(
      [...householdBudgets.values()].map(async (budget) => ({
        supportReference: `Support ${budget.supportAssignmentId.slice(0, 8)}`,
        availableMinor: budget.availableMinor,
        reservedMinor: budget.reservedMinor,
        spentMinor: budget.spentMinor,
        remainingMinor: budget.availableMinor,
        currency: budget.currency,
        funding: await this.funding.getProgress(budget.familyProfileId),
      })),
    );
    return {
      currency: "MAD" as const,
      validatedMinor,
      supportedBudgets: summaries,
    };
  }

  @Transaction({ retries: 2 })
  async createPlan(
    data: CreateContributionPlanDto,
    sponsorUserId: string,
  ) {
    const input = createContributionPlanDto.parse(data);
    await this.validator.ensureActiveOwnedAssignment(
      input.supportAssignmentId,
      sponsorUserId,
    );
    const startsAt = input.startsAt ?? new Date();
    const plan = await this.plans.create({
      supportAssignmentId: input.supportAssignmentId,
      kind: input.kind,
      amountMinor: input.amountMinor,
      currency: "MAD",
      status: "active",
      startsAt,
      nextDueAt: input.kind === "monthly" ? (input.nextDueAt ?? startsAt) : null,
      endedAt: null,
    });
    await this.audits.record({
      action: "contributionPlan.created",
      actorUserId: sponsorUserId,
      metadata: { kind: input.kind, amountMinor: input.amountMinor },
      resource: "contributionPlans",
      resourceId: plan.id,
    });
    return plan;
  }

  @Transaction({ retries: 2 })
  async pausePlan(id: string, data: ContributionReasonDto, sponsorUserId: string) {
    const plan = await this.validator.ensurePlanOwnedBy(id, sponsorUserId);
    const { reason } = contributionReasonDto.parse(data);
    if (plan.status !== "active") {
      HttpError.conflict("Only active contribution plans can be paused");
    }
    const updated = await this.plans.setStatus(id, "paused", null);
    await this.audits.record({
      action: "contributionPlan.paused",
      actorUserId: sponsorUserId,
      metadata: { reason },
      resource: "contributionPlans",
      resourceId: id,
    });
    return updated;
  }

  @Transaction({ retries: 2 })
  async resumePlan(id: string, data: ContributionReasonDto, sponsorUserId: string) {
    const plan = await this.validator.ensurePlanOwnedBy(id, sponsorUserId);
    const { reason } = contributionReasonDto.parse(data);
    if (plan.status !== "paused") {
      HttpError.conflict("Only paused contribution plans can be resumed");
    }
    const updated = await this.plans.setStatus(id, "active", null);
    await this.audits.record({
      action: "contributionPlan.resumed",
      actorUserId: sponsorUserId,
      metadata: { reason },
      resource: "contributionPlans",
      resourceId: id,
    });
    return updated;
  }

  @Transaction({ retries: 2 })
  async stopPlan(id: string, data: ContributionReasonDto, sponsorUserId: string) {
    const plan = await this.validator.ensurePlanOwnedBy(id, sponsorUserId);
    const { reason } = contributionReasonDto.parse(data);
    if (plan.status === "stopped" || plan.status === "completed") {
      HttpError.conflict("Contribution plan is already closed");
    }
    const updated = await this.plans.setStatus(id, "stopped", new Date());
    await this.audits.record({
      action: "contributionPlan.stopped",
      actorUserId: sponsorUserId,
      metadata: { reason },
      resource: "contributionPlans",
      resourceId: id,
    });
    return updated;
  }

  @Transaction({ retries: 2 })
  async submit(data: CreateContributionDto, sponsorUserId: string) {
    const input = createContributionDto.parse(data);
    const assignment = await this.validator.ensureActiveOwnedAssignment(
      input.supportAssignmentId,
      sponsorUserId,
    );
    if (input.contributionPlanId) {
      const plan = await this.validator.ensurePlanMatchesAssignment(
        input.contributionPlanId,
        input.supportAssignmentId,
        sponsorUserId,
      );
      if (plan.amountMinor !== input.amountMinor) {
        HttpError.conflict("Contribution amount must match the active plan");
      }
    }
    const contribution = await this.contributions.create({
      contributionPlanId: input.contributionPlanId ?? null,
      supportAssignmentId: assignment.id,
      sponsorProfileId: assignment.sponsorProfileId,
      familyProfileId: assignment.familyProfileId,
      amountMinor: input.amountMinor,
      currency: "MAD",
      paymentMethod: input.paymentMethod,
      externalReference: input.externalReference ?? null,
      status: "pending",
      paidAt: input.paidAt ?? null,
    });
    await this.audits.record({
      action: "contribution.submitted",
      actorUserId: sponsorUserId,
      metadata: { amountMinor: input.amountMinor },
      resource: "contributions",
      resourceId: contribution.id,
    });
    await this.outbox.enqueue({
      topic: "contribution.submitted",
      aggregateType: "contribution",
      aggregateId: contribution.id,
      payload: { amountMinor: contribution.amountMinor },
    });
    return contribution;
  }

  @Transaction({ retries: 2 })
  async record(data: RecordContributionDto, actorUserId: string) {
    const input = recordContributionDto.parse(data);
    const assignment = await this.validator.ensureActiveAssignment(
      input.supportAssignmentId,
    );
    if (input.contributionPlanId) {
      const plan = await this.validator.ensureOperatorPlanMatchesAssignment(
        input.contributionPlanId,
        input.supportAssignmentId,
      );
      if (plan.amountMinor !== input.amountMinor) {
        HttpError.conflict("Contribution amount must match the active plan");
      }
    }
    const contribution = await this.contributions.create({
      contributionPlanId: input.contributionPlanId ?? null,
      supportAssignmentId: assignment.id,
      sponsorProfileId: assignment.sponsorProfileId,
      familyProfileId: assignment.familyProfileId,
      amountMinor: input.amountMinor,
      currency: "MAD",
      paymentMethod: input.paymentMethod,
      externalReference: input.externalReference ?? null,
      status: "pending",
      paidAt: input.paidAt,
    });
    await this.audits.record({
      action: "contribution.recorded",
      actorUserId,
      metadata: {
        amountMinor: input.amountMinor,
        paymentMethod: input.paymentMethod,
      },
      resource: "contributions",
      resourceId: contribution.id,
    });
    await this.outbox.enqueue({
      topic: "contribution.recorded",
      aggregateType: "contribution",
      aggregateId: contribution.id,
      payload: { amountMinor: contribution.amountMinor },
    });
    return contribution;
  }

  @Transaction({ retries: 2 })
  async validate(id: string, actorUserId: string) {
    const contribution = await this.contributions.lockById(id);
    if (!contribution) {
      HttpError.notFound("Contribution not found");
    }
    if (contribution.status === "validated") {
      return contribution;
    }
    this.validator.ensurePending(contribution.status);
    await this.validator.ensureHistoricalAssignment(contribution);

    await this.accounts.createForFamily(contribution.familyProfileId);
    const account = await this.accounts.lockByFamilyId(
      contribution.familyProfileId,
    );
    if (!account) {
      HttpError.notFound("Budget account not found");
    }
    const idempotencyKey = `contribution:${contribution.id}:credit`;
    if (await this.ledger.findByIdempotencyKey(idempotencyKey)) {
      HttpError.conflict("Contribution credit already exists");
    }

    const balance = applyBudgetBalanceDelta(account, {
      availableMinor: contribution.amountMinor,
    });
    const updatedAccount = await this.accounts.updateBalances(account.id, balance);
    if (!updatedAccount) {
      HttpError.notFound("Budget account not found");
    }
    const entry = await this.ledger.append({
      budgetAccountId: account.id,
      entryType: "contribution_credit",
      amountMinor: contribution.amountMinor,
      availableAfterMinor: updatedAccount.availableMinor,
      reservedAfterMinor: updatedAccount.reservedMinor,
      spentAfterMinor: updatedAccount.spentMinor,
      sourceType: "contribution",
      sourceId: contribution.id,
      idempotencyKey,
      actorUserId,
      reason: null,
    });
    const validated = await this.contributions.validate(id, actorUserId);
    if (contribution.contributionPlanId) {
      const plan = await this.plans.findById(contribution.contributionPlanId);
      if (plan?.kind === "one_time") {
        await this.plans.completeOneTime(plan.id);
      }
    }
    await this.audits.record({
      action: "contribution.validated",
      actorUserId,
      metadata: { amountMinor: contribution.amountMinor },
      resource: "contributions",
      resourceId: contribution.id,
    });
    await this.outbox.enqueue({
      topic: "contribution.validated",
      aggregateType: "contribution",
      aggregateId: contribution.id,
      payload: { amountMinor: contribution.amountMinor },
    });
    const funding = await this.funding.activateIfEligible(
      contribution.familyProfileId,
      actorUserId,
    );
    return { contribution: validated, ledgerEntry: entry, funding };
  }

  @Transaction({ retries: 2 })
  async reject(
    id: string,
    data: ContributionReasonDto,
    actorUserId: string,
  ) {
    const contribution = await this.contributions.lockById(id);
    if (!contribution) {
      HttpError.notFound("Contribution not found");
    }
    this.validator.ensurePending(contribution.status);
    const { reason } = contributionReasonDto.parse(data);
    const rejected = await this.contributions.reject(id, actorUserId, reason);
    await this.audits.record({
      action: "contribution.rejected",
      actorUserId,
      metadata: { reason },
      resource: "contributions",
      resourceId: id,
    });
    await this.outbox.enqueue({
      topic: "contribution.rejected",
      aggregateType: "contribution",
      aggregateId: id,
    });
    return rejected;
  }

  @Transaction({ retries: 2 })
  async refund(
    id: string,
    data: ContributionReasonDto,
    actorUserId: string,
  ) {
    const contribution = await this.contributions.lockById(id);
    if (!contribution) {
      HttpError.notFound("Contribution not found");
    }
    if (contribution.status === "refunded") {
      return contribution;
    }
    this.validator.ensureValidated(contribution.status);
    await this.validator.ensureHistoricalAssignment(contribution);
    const { reason } = contributionReasonDto.parse(data);

    const original = await this.ledger.findByIdempotencyKey(
      `contribution:${contribution.id}:credit`,
    );
    if (!original) {
      HttpError.conflict("Validated contribution credit is missing");
    }
    await this.accounts.createForFamily(contribution.familyProfileId);
    const account = await this.accounts.lockByFamilyId(
      contribution.familyProfileId,
    );
    if (!account) {
      HttpError.notFound("Budget account not found");
    }
    const idempotencyKey = `contribution:${contribution.id}:refund`;
    if (await this.ledger.findByIdempotencyKey(idempotencyKey)) {
      HttpError.conflict("Contribution refund already exists");
    }
    let balance;
    try {
      balance = applyBudgetBalanceDelta(account, {
        availableMinor: -contribution.amountMinor,
      });
    } catch {
      HttpError.conflict("Contribution refund would make the budget invalid");
    }
    const updatedAccount = await this.accounts.updateBalances(account.id, balance);
    if (!updatedAccount) {
      HttpError.notFound("Budget account not found");
    }
    const entry = await this.ledger.append({
      budgetAccountId: account.id,
      entryType: "contribution_refund",
      amountMinor: -contribution.amountMinor,
      availableAfterMinor: updatedAccount.availableMinor,
      reservedAfterMinor: updatedAccount.reservedMinor,
      spentAfterMinor: updatedAccount.spentMinor,
      sourceType: "contribution",
      sourceId: contribution.id,
      idempotencyKey,
      actorUserId,
      reason,
      reversesEntryId: original.id,
    });
    const refunded = await this.contributions.refund(id);
    await this.audits.record({
      action: "contribution.refunded",
      actorUserId,
      metadata: { reason, amountMinor: contribution.amountMinor },
      resource: "contributions",
      resourceId: id,
    });
    await this.outbox.enqueue({
      topic: "contribution.refunded",
      aggregateType: "contribution",
      aggregateId: id,
      payload: { amountMinor: contribution.amountMinor },
    });
    return { contribution: refunded, ledgerEntry: entry };
  }

  /** Bootstrap-admin correction for a contribution entered by mistake. */
  @Transaction({ retries: 2 })
  async delete(id: string, actorUserId: string) {
    return this.deleteOne(id, actorUserId);
  }

  /** Atomic bootstrap-admin correction for multiple mistaken contributions. */
  @Transaction({ retries: 2 })
  async deleteMany(ids: string[], actorUserId: string) {
    const deleted = [];
    for (const id of [...ids].sort()) {
      deleted.push(await this.deleteOne(id, actorUserId));
    }
    return deleted;
  }

  private async deleteOne(id: string, actorUserId: string) {
    const contribution = await this.contributions.lockById(id);
    if (!contribution) {
      HttpError.notFound("Contribution not found");
    }

    if (contribution.status === "validated") {
      HttpError.conflict(
        "Refund this contribution before permanently deleting it",
      );
    }

    let ledgerEntriesRemoved = false;
    if (contribution.status === "refunded") {
      const original = await this.ledger.findByIdempotencyKey(
        `contribution:${contribution.id}:credit`,
      );
      const refund = await this.ledger.findByIdempotencyKey(
        `contribution:${contribution.id}:refund`,
      );
      if (!original || !refund || refund.reversesEntryId !== original.id) {
        HttpError.conflict("Contribution refund ledger pair is incomplete");
      }

      const account = await this.accounts.lockByFamilyId(
        contribution.familyProfileId,
      );
      if (!account || original.budgetAccountId !== account.id || refund.budgetAccountId !== account.id) {
        HttpError.conflict("Contribution refund ledger account is invalid");
      }
      const balance = await this.ledger.eraseContributionEntries({
        budgetAccountId: account.id,
        creditEntryId: original.id,
        refundEntryId: refund.id,
      });
      await this.accounts.updateBalances(account.id, balance);
      ledgerEntriesRemoved = true;
    }

    const deleted = await this.contributions.delete(id);
    if (!deleted) {
      HttpError.notFound("Contribution not found");
    }
    if (contribution.contributionPlanId) {
      const plan = await this.plans.findById(contribution.contributionPlanId);
      if (plan?.kind === "one_time" && plan.status === "completed") {
        await this.plans.setStatus(plan.id, "active", null);
      }
    }
    await this.audits.record({
      action: "contribution.deleted",
      actorUserId,
      metadata: {
        permanent: true,
        previousStatus: contribution.status,
        ledgerEntriesRemoved,
      },
      resource: "contributions",
      resourceId: id,
    });
    return deleted;
  }
}
