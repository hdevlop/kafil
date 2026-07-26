import { HttpError, Service } from "najm-core";

import { AuditService } from "../audit/auditService";
import {
  BudgetAccountRepository,
  BudgetLedgerRepository,
} from "../budgets/budgetRepository";
import { FamilyRepository } from "../families/familyRepository";
import { OutboxService } from "../outbox/outboxService";
import {
  calculateCapacity,
  type CapacityBreakdown,
  type FundingCapacityStatus,
} from "./fundingCapacity";
import { FundingRepository } from "./fundingRepository";

export interface FamilyFundingProgress {
  status: "pending_funding" | "active";
  targetMinor: number;
  fundedMinor: number;
  pendingMinor: number;
  remainingMinor: number;
  availableToContributeMinor: number;
  capacityStatus: FundingCapacityStatus;
  nextPendingExpiryAt: string | Date | null;
  activatedAt: Date | null;
}

interface FundingFamily {
  id: string;
  fundingTargetMinor: number;
  fundingStatus: "pending_funding" | "active";
  fundingActivatedAt: Date | null;
}

const MIN_PENDING_RESERVATION = 0;

@Service()
export class FundingService {
  constructor(
    private readonly families: FamilyRepository,
    private readonly accounts: BudgetAccountRepository,
    private readonly ledger: BudgetLedgerRepository,
    private readonly audits: AuditService,
    private readonly outbox: OutboxService,
    private readonly funding: FundingRepository,
  ) {}

  async getProgress(
    familyProfileId: string,
    now: Date = new Date(),
  ): Promise<FamilyFundingProgress | null> {
    const family = await this.families.findById(familyProfileId);
    if (!family) return null;

    const account = await this.accounts.findByFamilyId(familyProfileId);
    const fundedMinor = account
      ? await this.ledger.validatedFundingTotal(account.id)
      : MIN_PENDING_RESERVATION;
    const pending = await this.funding.livePendingTotalForFamily(
      familyProfileId,
      now,
    );
    const earliest = await this.funding.earliestPendingExpiry(
      familyProfileId,
      now,
    );
    const capacity = calculateCapacity({
      targetMinor: family.fundingTargetMinor,
      fundedMinor,
      pendingMinor: pending.amountMinor,
    });

    return {
      status: family.fundingStatus,
      targetMinor: capacity.targetMinor,
      fundedMinor: capacity.fundedMinor,
      pendingMinor: capacity.pendingMinor,
      remainingMinor: capacity.remainingMinor,
      availableToContributeMinor: capacity.availableToContributeMinor,
      capacityStatus: capacity.status,
      nextPendingExpiryAt: earliest?.expiresAt ?? null,
      activatedAt: family.fundingActivatedAt,
    };
  }

  async getProgressForFamilies(
    families: FundingFamily[],
    now: Date = new Date(),
  ): Promise<Map<string, FamilyFundingProgress>> {
    if (families.length === 0) return new Map();

    const familyIds = families.map((family) => family.id);
    const [totals, pendingTotals, expiries] = await Promise.all([
      this.ledger.validatedFundingTotalsByFamily(familyIds),
      this.funding.livePendingTotalsForFamilies(familyIds, now),
      this.funding.earliestPendingExpiries(familyIds, now),
    ]);

    const fundedByFamily = new Map(
      totals.map(({ familyProfileId, amount }) => [
        familyProfileId,
        Math.max(0, Number(amount)),
      ]),
    );
    const pendingByFamily = new Map(
      pendingTotals.map(({ familyProfileId, amountMinor }) => [
        familyProfileId,
        amountMinor,
      ]),
    );
    const expiryByFamily = new Map(
      expiries.map((entry) => [
        entry.familyProfileId,
        { expiresAt: entry.expiresAt, amountMinor: entry.amountMinor },
      ]),
    );

    return new Map(
      families.map((family) => {
        const fundedMinor = fundedByFamily.get(family.id) ?? 0;
        const pendingMinor = pendingByFamily.get(family.id) ?? 0;
        const expiry = expiryByFamily.get(family.id);
        const capacity = calculateCapacity({
          targetMinor: family.fundingTargetMinor,
          fundedMinor,
          pendingMinor,
        });
        return [
          family.id,
          {
            status: family.fundingStatus,
            targetMinor: capacity.targetMinor,
            fundedMinor: capacity.fundedMinor,
            pendingMinor: capacity.pendingMinor,
            remainingMinor: capacity.remainingMinor,
            availableToContributeMinor: capacity.availableToContributeMinor,
            capacityStatus: capacity.status,
            nextPendingExpiryAt: expiry?.expiresAt ?? null,
            activatedAt: family.fundingActivatedAt,
          } satisfies FamilyFundingProgress,
        ];
      }),
    );
  }

  async ensureOrderEligible(familyProfileId: string, now: Date = new Date()) {
    const progress = await this.getProgress(familyProfileId, now);
    if (!progress || progress.status !== "active") {
      HttpError.conflict(
        "Family funding target must be reached before submitting orders",
      );
    }
    return progress;
  }

  async ensureAssignmentCapacity(
    familyProfileId: string,
    now: Date = new Date(),
  ) {
    const progress = await this.getProgress(familyProfileId, now);
    if (!progress) {
      HttpError.notFound("Family funding progress not found");
    }
    if (progress.capacityStatus === "funded") {
      HttpError.conflict("This family has reached its funding target.");
    }
    if (progress.capacityStatus === "reserved") {
      HttpError.conflict(
        "Pending payments already cover this family's remaining target.",
      );
    }
    return progress;
  }

  async ensureContributionFits(
    familyProfileId: string,
    amountMinor: number,
    now: Date = new Date(),
  ) {
    const progress = await this.getProgress(familyProfileId, now);
    if (!progress) {
      HttpError.notFound("Family funding progress not found");
    }
    if (progress.capacityStatus === "funded") {
      HttpError.conflict("This family has reached its funding target.");
    }
    if (amountMinor > progress.availableToContributeMinor) {
      HttpError.conflict(
        `Contribution exceeds the available amount of ${progress.availableToContributeMinor} MAD.`,
      );
    }
    return progress;
  }

  /**
   * Validation-specific capacity check. The contribution being validated
   * already reserves its own amount, so it must not be counted against the
   * available total. We also accept it iff the target is not yet exceeded by
   * validated funding alone (legacy over-cap pending rows may still exist).
   */
  async ensureContributionCanValidate(
    familyProfileId: string,
    amountMinor: number,
  ) {
    const family = await this.families.findById(familyProfileId);
    if (!family) {
      HttpError.notFound("Family funding progress not found");
    }
    const account = await this.accounts.findByFamilyId(familyProfileId);
    const fundedMinor = account
      ? await this.ledger.validatedFundingTotal(account.id)
      : 0;
    if (fundedMinor >= family.fundingTargetMinor) {
      HttpError.conflict("This family has reached its funding target.");
    }
    if (amountMinor + fundedMinor > family.fundingTargetMinor) {
      HttpError.conflict(
        `Contribution exceeds the available amount of ${family.fundingTargetMinor - fundedMinor} MAD.`,
      );
    }
    return { fundedMinor, targetMinor: family.fundingTargetMinor };
  }

  async ensureTargetCanLower(
    familyProfileId: string,
    nextTargetMinor: number,
    now: Date = new Date(),
  ) {
    const progress = await this.getProgress(familyProfileId, now);
    if (!progress) return;
    const committed = progress.fundedMinor + progress.pendingMinor;
    if (nextTargetMinor < committed) {
      HttpError.conflict(
        "Target cannot be lower than validated and live pending contributions.",
      );
    }
    return progress;
  }

  async activateIfEligible(
    familyProfileId: string,
    actorUserId: string,
    now: Date = new Date(),
  ) {
    const progress = await this.getProgress(familyProfileId, now);
    if (!progress || progress.status === "active") return progress;
    if (progress.fundedMinor < progress.targetMinor) return progress;

    const activatedAt = new Date();
    const family = await this.families.activateFunding(
      familyProfileId,
      activatedAt,
    );
    if (!family) return this.getProgress(familyProfileId, now);

    await this.audits.record({
      action: "family.fundingActivated",
      actorUserId,
      metadata: {
        fundedMinor: progress.fundedMinor,
        targetMinor: progress.targetMinor,
      },
      resource: "families",
      resourceId: family.id,
    });
    await this.outbox.enqueue({
      topic: "family.fundingActivated",
      aggregateType: "family",
      aggregateId: family.id,
      payload: {
        fundedMinor: progress.fundedMinor,
        targetMinor: progress.targetMinor,
      },
    });
    return {
      ...progress,
      status: "active" as const,
      remainingMinor: 0,
      activatedAt,
    };
  }

  async activateEligibleFamilies(actorUserId: string) {
    const pendingFamilies = await this.families.listPendingFunding();
    let activatedCount = 0;
    for (const family of pendingFamilies) {
      const progress = await this.activateIfEligible(
        family.id,
        actorUserId,
      );
      if (progress?.status === "active") activatedCount += 1;
    }
    return activatedCount;
  }
}

export type { CapacityBreakdown, FundingCapacityStatus };
