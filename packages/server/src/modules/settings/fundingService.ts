import { HttpError, Service } from "najm-core";

import { AuditService } from "../audit/auditService";
import {
  BudgetAccountRepository,
  BudgetLedgerRepository,
} from "../budgets/budgetRepository";
import { FamilyRepository } from "../families/familyRepository";
import { OutboxService } from "../outbox/outboxService";

export interface FamilyFundingProgress {
  status: "pending_funding" | "active";
  targetMinor: number;
  fundedMinor: number;
  remainingMinor: number;
  activatedAt: Date | null;
}

interface FundingFamily {
  id: string;
  fundingTargetMinor: number;
  fundingStatus: "pending_funding" | "active";
  fundingActivatedAt: Date | null;
}

@Service()
export class FundingService {
  constructor(
    private readonly families: FamilyRepository,
    private readonly accounts: BudgetAccountRepository,
    private readonly ledger: BudgetLedgerRepository,
    private readonly audits: AuditService,
    private readonly outbox: OutboxService,
  ) {}

  async getProgress(
    familyProfileId: string,
  ): Promise<FamilyFundingProgress | null> {
    const family = await this.families.findById(familyProfileId);
    if (!family) return null;

    const account = await this.accounts.findByFamilyId(familyProfileId);
    const fundedMinor = account
      ? await this.ledger.validatedFundingTotal(account.id)
      : 0;
    return {
      status: family.fundingStatus,
      targetMinor: family.fundingTargetMinor,
      fundedMinor,
      remainingMinor: Math.max(
        0,
        family.fundingTargetMinor - fundedMinor,
      ),
      activatedAt: family.fundingActivatedAt,
    };
  }

  async getProgressForFamilies(families: FundingFamily[]) {
    if (families.length === 0) return new Map<string, FamilyFundingProgress>();

    const totals = await this.ledger.validatedFundingTotalsByFamily(
      families.map((family) => family.id),
    );
    const fundedByFamily = new Map(
      totals.map(({ familyProfileId, amount }) => [
        familyProfileId,
        Math.max(0, Number(amount)),
      ]),
    );

    return new Map(
      families.map((family) => {
        const fundedMinor = fundedByFamily.get(family.id) ?? 0;
        return [
          family.id,
          {
            status: family.fundingStatus,
            targetMinor: family.fundingTargetMinor,
            fundedMinor,
            remainingMinor: Math.max(
              0,
              family.fundingTargetMinor - fundedMinor,
            ),
            activatedAt: family.fundingActivatedAt,
          },
        ];
      }),
    );
  }

  async ensureOrderEligible(familyProfileId: string) {
    const progress = await this.getProgress(familyProfileId);
    if (!progress || progress.status !== "active") {
      HttpError.conflict(
        "Family funding target must be reached before submitting orders",
      );
    }
    return progress;
  }

  async activateIfEligible(
    familyProfileId: string,
    actorUserId: string,
  ) {
    const progress = await this.getProgress(familyProfileId);
    if (!progress || progress.status === "active") return progress;
    if (progress.fundedMinor < progress.targetMinor) return progress;

    const activatedAt = new Date();
    const family = await this.families.activateFunding(
      familyProfileId,
      activatedAt,
    );
    if (!family) return this.getProgress(familyProfileId);

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
