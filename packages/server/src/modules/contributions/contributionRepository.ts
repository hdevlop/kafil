import { and, asc, desc, eq, sql } from "drizzle-orm";
import { Repository } from "najm-core";
import { DB } from "najm-database";
import { usersTable } from "najm-auth/pg";

import type { KafilDatabase } from "../../database/types";
import { budgetAccounts } from "../budgets/budgetSchema";
import { familyProfiles } from "../families/familySchema";
import { sponsorProfiles } from "../sponsors/sponsorSchema";
import { supportAssignments } from "../supportAssignments/supportAssignmentSchema";
import {
  contributionPlans,
  contributions,
  type NewContribution,
  type NewContributionPlan,
} from "./contributionSchema";

export interface ContributionFilters {
  familyProfileId?: string;
  status?: "pending" | "validated" | "rejected" | "refunded";
}

export interface ContributionPlanFilters {
  status?: "active" | "paused" | "stopped" | "completed";
}

const ownContributionSelection = {
  id: contributions.id,
  contributionPlanId: contributions.contributionPlanId,
  supportAssignmentId: contributions.supportAssignmentId,
  amountMinor: contributions.amountMinor,
  currency: contributions.currency,
  paymentMethod: contributions.paymentMethod,
  externalReference: contributions.externalReference,
  status: contributions.status,
  submittedAt: contributions.submittedAt,
  paidAt: contributions.paidAt,
  validatedAt: contributions.validatedAt,
  rejectedAt: contributions.rejectedAt,
  createdAt: contributions.createdAt,
};

const operatorContributionSelection = {
  id: contributions.id,
  contributionPlanId: contributions.contributionPlanId,
  supportAssignmentId: contributions.supportAssignmentId,
  sponsorProfileId: contributions.sponsorProfileId,
  familyProfileId: contributions.familyProfileId,
  amountMinor: contributions.amountMinor,
  currency: contributions.currency,
  paymentMethod: contributions.paymentMethod,
  externalReference: contributions.externalReference,
  status: contributions.status,
  submittedAt: contributions.submittedAt,
  paidAt: contributions.paidAt,
  validatedByUserId: contributions.validatedByUserId,
  validatedAt: contributions.validatedAt,
  rejectedByUserId: contributions.rejectedByUserId,
  rejectedAt: contributions.rejectedAt,
  rejectionReason: contributions.rejectionReason,
  createdAt: contributions.createdAt,
  updatedAt: contributions.updatedAt,
  sponsorName: usersTable.name,
  sponsorImage: usersTable.image,
  sponsorGender: sponsorProfiles.gender,
  sponsorEmail: usersTable.email,
  familyName: familyProfiles.guardianLegalName,
};

const ownPlanSelection = {
  id: contributionPlans.id,
  supportAssignmentId: contributionPlans.supportAssignmentId,
  kind: contributionPlans.kind,
  amountMinor: contributionPlans.amountMinor,
  currency: contributionPlans.currency,
  status: contributionPlans.status,
  startsAt: contributionPlans.startsAt,
  nextDueAt: contributionPlans.nextDueAt,
  endedAt: contributionPlans.endedAt,
  createdAt: contributionPlans.createdAt,
  updatedAt: contributionPlans.updatedAt,
};

@Repository("default")
export class ContributionRepository {
  @DB() private db!: KafilDatabase;

  listRecordingOptions() {
    return this.db
      .select({
        id: supportAssignments.id,
        sponsorProfileId: supportAssignments.sponsorProfileId,
        familyProfileId: supportAssignments.familyProfileId,
        sponsorName: usersTable.name,
        sponsorEmail: usersTable.email,
        familyName: familyProfiles.guardianLegalName,
      })
      .from(supportAssignments)
      .innerJoin(
        sponsorProfiles,
        eq(supportAssignments.sponsorProfileId, sponsorProfiles.id),
      )
      .innerJoin(usersTable, eq(sponsorProfiles.userId, usersTable.id))
      .innerJoin(
        familyProfiles,
        eq(supportAssignments.familyProfileId, familyProfiles.id),
      )
      .where(eq(supportAssignments.status, "active"))
      .orderBy(asc(usersTable.name), asc(familyProfiles.guardianLegalName));
  }

  list(limit: number, offset: number, filters: ContributionFilters) {
    const condition = filters.status && filters.familyProfileId
      ? and(
          eq(contributions.status, filters.status),
          eq(contributions.familyProfileId, filters.familyProfileId),
        )
      : filters.status
        ? eq(contributions.status, filters.status)
        : filters.familyProfileId
          ? eq(contributions.familyProfileId, filters.familyProfileId)
          : undefined;
    const query = this.db
      .select(operatorContributionSelection)
      .from(contributions)
      .innerJoin(
        sponsorProfiles,
        eq(contributions.sponsorProfileId, sponsorProfiles.id),
      )
      .innerJoin(usersTable, eq(sponsorProfiles.userId, usersTable.id))
      .innerJoin(
        familyProfiles,
        eq(contributions.familyProfileId, familyProfiles.id),
      )
      .orderBy(desc(contributions.submittedAt))
      .limit(limit)
      .offset(offset);
    return condition ? query.where(condition) : query;
  }

  async findById(id: string) {
    const [contribution] = await this.db
      .select(operatorContributionSelection)
      .from(contributions)
      .innerJoin(
        sponsorProfiles,
        eq(contributions.sponsorProfileId, sponsorProfiles.id),
      )
      .innerJoin(usersTable, eq(sponsorProfiles.userId, usersTable.id))
      .innerJoin(
        familyProfiles,
        eq(contributions.familyProfileId, familyProfiles.id),
      )
      .where(eq(contributions.id, id))
      .limit(1);
    return contribution;
  }

  async lockById(id: string) {
    const [contribution] = await this.db
      .select()
      .from(contributions)
      .where(eq(contributions.id, id))
      .limit(1)
      .for("update");
    return contribution;
  }

  async findOwnById(id: string, userId: string) {
    const [contribution] = await this.db
      .select(ownContributionSelection)
      .from(contributions)
      .innerJoin(
        sponsorProfiles,
        eq(contributions.sponsorProfileId, sponsorProfiles.id),
      )
      .where(and(eq(contributions.id, id), eq(sponsorProfiles.userId, userId)))
      .limit(1);
    return contribution;
  }

  listOwn(
    userId: string,
    limit: number,
    offset: number,
    filters: ContributionFilters,
  ) {
    const condition = filters.status
      ? and(
          eq(sponsorProfiles.userId, userId),
          eq(contributions.status, filters.status),
        )
      : eq(sponsorProfiles.userId, userId);
    return this.db
      .select(ownContributionSelection)
      .from(contributions)
      .innerJoin(
        sponsorProfiles,
        eq(contributions.sponsorProfileId, sponsorProfiles.id),
      )
      .where(condition)
      .orderBy(desc(contributions.submittedAt))
      .limit(limit)
      .offset(offset);
  }

  async create(data: NewContribution) {
    const [contribution] = await this.db
      .insert(contributions)
      .values(data)
      .returning();
    return contribution;
  }

  async validate(id: string, actorUserId: string) {
    const [contribution] = await this.db
      .update(contributions)
      .set({
        status: "validated",
        validatedByUserId: actorUserId,
        validatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(contributions.id, id))
      .returning();
    return contribution;
  }

  async reject(id: string, actorUserId: string, reason: string) {
    const [contribution] = await this.db
      .update(contributions)
      .set({
        status: "rejected",
        rejectedByUserId: actorUserId,
        rejectedAt: new Date(),
        rejectionReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(contributions.id, id))
      .returning();
    return contribution;
  }

  async refund(id: string) {
    const [contribution] = await this.db
      .update(contributions)
      .set({ status: "refunded", updatedAt: new Date() })
      .where(eq(contributions.id, id))
      .returning();
    return contribution;
  }

  async delete(id: string) {
    const [contribution] = await this.db
      .delete(contributions)
      .where(eq(contributions.id, id))
      .returning();
    return contribution;
  }

  listOwnBudgetSummaries(userId: string) {
    return this.db
      .select({
        supportAssignmentId: supportAssignments.id,
        familyProfileId: supportAssignments.familyProfileId,
        availableMinor: budgetAccounts.availableMinor,
        reservedMinor: budgetAccounts.reservedMinor,
        spentMinor: budgetAccounts.spentMinor,
        currency: budgetAccounts.currency,
      })
      .from(supportAssignments)
      .innerJoin(
        sponsorProfiles,
        eq(supportAssignments.sponsorProfileId, sponsorProfiles.id),
      )
      .innerJoin(
        budgetAccounts,
        eq(supportAssignments.familyProfileId, budgetAccounts.familyProfileId),
      )
      .where(
        and(
          eq(sponsorProfiles.userId, userId),
          eq(supportAssignments.status, "active"),
        ),
      )
      .orderBy(asc(supportAssignments.startedAt));
  }

  async ownValidatedTotal(userId: string) {
    const [summary] = await this.db
      .select({
        validatedMinor: sql<number>`coalesce(sum(${contributions.amountMinor}), 0)::bigint`,
      })
      .from(contributions)
      .innerJoin(
        sponsorProfiles,
        eq(contributions.sponsorProfileId, sponsorProfiles.id),
      )
      .where(
        and(
          eq(sponsorProfiles.userId, userId),
          eq(contributions.status, "validated"),
        ),
      );
    return summary?.validatedMinor ?? 0;
  }
}

@Repository("default")
export class ContributionPlanRepository {
  @DB() private db!: KafilDatabase;

  list(limit: number, offset: number, filters: ContributionPlanFilters) {
    const query = this.db
      .select()
      .from(contributionPlans)
      .orderBy(desc(contributionPlans.createdAt))
      .limit(limit)
      .offset(offset);
    return filters.status
      ? query.where(eq(contributionPlans.status, filters.status))
      : query;
  }

  async findById(id: string) {
    const [plan] = await this.db
      .select()
      .from(contributionPlans)
      .where(eq(contributionPlans.id, id))
      .limit(1);
    return plan;
  }

  async findOwnById(id: string, userId: string) {
    const [plan] = await this.db
      .select(ownPlanSelection)
      .from(contributionPlans)
      .innerJoin(
        supportAssignments,
        eq(contributionPlans.supportAssignmentId, supportAssignments.id),
      )
      .innerJoin(
        sponsorProfiles,
        eq(supportAssignments.sponsorProfileId, sponsorProfiles.id),
      )
      .where(and(eq(contributionPlans.id, id), eq(sponsorProfiles.userId, userId)))
      .limit(1);
    return plan;
  }

  listOwn(
    userId: string,
    limit: number,
    offset: number,
    filters: ContributionPlanFilters,
  ) {
    const condition = filters.status
      ? and(
          eq(sponsorProfiles.userId, userId),
          eq(contributionPlans.status, filters.status),
        )
      : eq(sponsorProfiles.userId, userId);
    return this.db
      .select(ownPlanSelection)
      .from(contributionPlans)
      .innerJoin(
        supportAssignments,
        eq(contributionPlans.supportAssignmentId, supportAssignments.id),
      )
      .innerJoin(
        sponsorProfiles,
        eq(supportAssignments.sponsorProfileId, sponsorProfiles.id),
      )
      .where(condition)
      .orderBy(desc(contributionPlans.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async create(data: NewContributionPlan) {
    const [plan] = await this.db.insert(contributionPlans).values(data).returning();
    return plan;
  }

  async setStatus(
    id: string,
    status: "active" | "paused" | "stopped" | "completed",
    endedAt: Date | null,
  ) {
    const [plan] = await this.db
      .update(contributionPlans)
      .set({ status, endedAt, updatedAt: new Date() })
      .where(eq(contributionPlans.id, id))
      .returning();
    return plan;
  }

  completeOneTime(planId: string) {
    return this.setStatus(planId, "completed", new Date());
  }
}
