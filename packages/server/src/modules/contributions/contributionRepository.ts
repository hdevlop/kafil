import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
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

const familyUsers = alias(usersTable, "family_users");

export interface ContributionFilters {
  search?: string;
  paymentMethod?: string;
  familyProfileId?: string;
  status?: "pending" | "validated" | "rejected" | "refunded" | "expired";
}

export interface ContributionPlanFilters {
  status?: "active" | "paused" | "stopped" | "completed";
}

/** The scope-narrowing filters a family or sponsor reader may apply. */
type ScopedContributionFilters = Pick<
  ContributionFilters,
  "status" | "search" | "paymentMethod"
>;

/*
 * One condition builder per list scope, shared by the rows query and its count.
 *
 * A total assembled from conditions of its own would eventually describe a
 * different set than the rows it is reported beside — and a page count built on
 * it would send readers to pages that hold nothing. Each `count*` below reuses
 * the builder its `list*` uses, and repeats that list's join chain, because an
 * inner join narrows the set just as a `where` does.
 */

function buildContributionConditions(filters: ContributionFilters) {
  return and(
    filters.status ? eq(contributions.status, filters.status) : undefined,
    filters.familyProfileId ? eq(contributions.familyProfileId, filters.familyProfileId) : undefined,
    filters.paymentMethod ? eq(contributions.paymentMethod, filters.paymentMethod) : undefined,
    filters.search
      ? or(
          ilike(usersTable.name, `%${filters.search}%`),
          ilike(familyProfiles.guardianLegalName, `%${filters.search}%`),
          ilike(contributions.externalReference, `%${filters.search}%`),
        )
      : undefined,
  );
}

function buildFamilyContributionConditions(
  userId: string,
  filters: ScopedContributionFilters,
) {
  return and(
    eq(familyProfiles.userId, userId),
    filters.status ? eq(contributions.status, filters.status) : undefined,
    filters.paymentMethod ? eq(contributions.paymentMethod, filters.paymentMethod) : undefined,
    filters.search ? ilike(usersTable.name, `%${filters.search}%`) : undefined,
  );
}

function buildOwnContributionConditions(
  userId: string,
  filters: ScopedContributionFilters,
) {
  return and(
    eq(sponsorProfiles.userId, userId),
    filters.status ? eq(contributions.status, filters.status) : undefined,
    filters.paymentMethod ? eq(contributions.paymentMethod, filters.paymentMethod) : undefined,
    filters.search ? ilike(familyProfiles.guardianLegalName, `%${filters.search}%`) : undefined,
  );
}

export const sponsorContributionSelection = {
  id: contributions.id,
  contributionPlanId: contributions.contributionPlanId,
  supportAssignmentId: contributions.supportAssignmentId,
  sponsorName: usersTable.name,
  sponsorImage: usersTable.image,
  sponsorGender: sponsorProfiles.gender,
  familyName: familyProfiles.guardianLegalName,
  familyImage: familyUsers.image,
  amountMinor: contributions.amountMinor,
  currency: contributions.currency,
  paymentMethod: contributions.paymentMethod,
  externalReference: contributions.externalReference,
  status: contributions.status,
  submittedAt: contributions.submittedAt,
  paidAt: contributions.paidAt,
  expiresAt: contributions.expiresAt,
  expiredAt: contributions.expiredAt,
  validatedAt: contributions.validatedAt,
  rejectedAt: contributions.rejectedAt,
  createdAt: contributions.createdAt,
};

export const familyContributionSelection = {
  id: contributions.id,
  sponsorName: usersTable.name,
  sponsorImage: usersTable.image,
  sponsorGender: sponsorProfiles.gender,
  amountMinor: contributions.amountMinor,
  currency: contributions.currency,
  externalReference: contributions.externalReference,
  status: contributions.status,
  submittedAt: contributions.submittedAt,
  paidAt: contributions.paidAt,
  expiresAt: contributions.expiresAt,
  expiredAt: contributions.expiredAt,
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
  expiresAt: contributions.expiresAt,
  expiredAt: contributions.expiredAt,
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
  familyImage: familyUsers.image,
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

  listRecordingOptions(
    limit: number,
    offset: number,
    filters: { search?: string; familyProfileId?: string },
  ) {
    const condition = and(
      eq(supportAssignments.status, "active"),
      filters.familyProfileId ? eq(supportAssignments.familyProfileId, filters.familyProfileId) : undefined,
      filters.search
        ? or(
            ilike(usersTable.name, `%${filters.search}%`),
            ilike(usersTable.email, `%${filters.search}%`),
            ilike(familyProfiles.guardianLegalName, `%${filters.search}%`),
          )
        : undefined,
    );
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
      .where(condition)
      .orderBy(asc(usersTable.name), asc(familyProfiles.guardianLegalName))
      .limit(limit)
      .offset(offset);
  }

  list(limit: number, offset: number, filters: ContributionFilters) {
    const condition = buildContributionConditions(filters);
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
      .innerJoin(familyUsers, eq(familyProfiles.userId, familyUsers.id))
      .orderBy(desc(contributions.submittedAt))
      .limit(limit)
      .offset(offset);
    return condition ? query.where(condition) : query;
  }

  /** Rows matching `filters` in the operator scope, ignoring the page window. */
  async count(filters: ContributionFilters) {
    const condition = buildContributionConditions(filters);
    const query = this.db
      .select({ total: sql<number>`count(*)::int` })
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
      .innerJoin(familyUsers, eq(familyProfiles.userId, familyUsers.id));
    const [row] = condition ? await query.where(condition) : await query;
    return row?.total ?? 0;
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
      .innerJoin(familyUsers, eq(familyProfiles.userId, familyUsers.id))
      .where(eq(contributions.id, id))
      .limit(1);
    return contribution;
  }

  async findFamilyById(id: string, userId: string) {
    const [contribution] = await this.db
      .select(familyContributionSelection)
      .from(contributions)
      .innerJoin(
        familyProfiles,
        eq(contributions.familyProfileId, familyProfiles.id),
      )
      .innerJoin(
        sponsorProfiles,
        eq(contributions.sponsorProfileId, sponsorProfiles.id),
      )
      .innerJoin(usersTable, eq(sponsorProfiles.userId, usersTable.id))
      .where(and(eq(contributions.id, id), eq(familyProfiles.userId, userId)))
      .limit(1);
    return contribution;
  }

  listFamily(
    userId: string,
    limit: number,
    offset: number,
    filters: ScopedContributionFilters,
  ) {
    return this.db
      .select(familyContributionSelection)
      .from(contributions)
      .innerJoin(
        familyProfiles,
        eq(contributions.familyProfileId, familyProfiles.id),
      )
      .innerJoin(
        sponsorProfiles,
        eq(contributions.sponsorProfileId, sponsorProfiles.id),
      )
      .innerJoin(usersTable, eq(sponsorProfiles.userId, usersTable.id))
      .where(buildFamilyContributionConditions(userId, filters))
      .orderBy(desc(contributions.submittedAt))
      .limit(limit)
      .offset(offset);
  }

  /** Rows visible to one family, ignoring the page window. */
  async countFamily(userId: string, filters: ScopedContributionFilters) {
    const [row] = await this.db
      .select({ total: sql<number>`count(*)::int` })
      .from(contributions)
      .innerJoin(
        familyProfiles,
        eq(contributions.familyProfileId, familyProfiles.id),
      )
      .innerJoin(
        sponsorProfiles,
        eq(contributions.sponsorProfileId, sponsorProfiles.id),
      )
      .innerJoin(usersTable, eq(sponsorProfiles.userId, usersTable.id))
      .where(buildFamilyContributionConditions(userId, filters));
    return row?.total ?? 0;
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
      .select(sponsorContributionSelection)
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
      .innerJoin(familyUsers, eq(familyProfiles.userId, familyUsers.id))
      .where(and(eq(contributions.id, id), eq(sponsorProfiles.userId, userId)))
      .limit(1);
    return contribution;
  }

  listOwn(
    userId: string,
    limit: number,
    offset: number,
    filters: ScopedContributionFilters,
  ) {
    return this.db
      .select(sponsorContributionSelection)
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
      .innerJoin(familyUsers, eq(familyProfiles.userId, familyUsers.id))
      .where(buildOwnContributionConditions(userId, filters))
      .orderBy(desc(contributions.submittedAt))
      .limit(limit)
      .offset(offset);
  }

  /** Rows belonging to one sponsor, ignoring the page window. */
  async countOwn(userId: string, filters: ScopedContributionFilters) {
    const [row] = await this.db
      .select({ total: sql<number>`count(*)::int` })
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
      .innerJoin(familyUsers, eq(familyProfiles.userId, familyUsers.id))
      .where(buildOwnContributionConditions(userId, filters));
    return row?.total ?? 0;
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

  async expire(id: string, expiredAt: Date) {
    const [contribution] = await this.db
      .update(contributions)
      .set({ status: "expired", expiredAt, updatedAt: expiredAt })
      .where(eq(contributions.id, id))
      .returning();
    return contribution;
  }

  /**
   * Conditional transition. Only flips pending -> expired if the row is still
   * pending and its stored expires_at has not moved. This makes the claim
   * lock from `duePendingContributionIds` atomic with the mutation, so
   * two workers observing the same row can never produce duplicate audit
   * and outbox effects.
   */
  async expireIfStillDue(
    id: string,
    dueBefore: Date,
    expiredAt: Date,
  ) {
    const rows = await this.db
      .update(contributions)
      .set({ status: "expired", expiredAt, updatedAt: expiredAt })
      .where(
        and(
          eq(contributions.id, id),
          eq(contributions.status, "pending"),
          sql`${contributions.expiresAt} <= ${dueBefore.toISOString()}::timestamptz`,
        ),
      )
      .returning({ id: contributions.id });
    return rows.length > 0;
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

  async completeFamilyActiveAndPaused(familyProfileId: string) {
    const endedAt = new Date();
    const updated = await this.db
      .update(contributionPlans)
      .set({ status: "completed", endedAt, updatedAt: endedAt })
      .where(
        sql`${contributionPlans.status} = 'active' AND ${contributionPlans.id} IN (
          SELECT plan.id FROM ${contributionPlans} AS plan
          INNER JOIN ${supportAssignments} AS assignment
            ON assignment.id = plan.support_assignment_id
          WHERE assignment.family_profile_id = ${familyProfileId}
            AND assignment.status = 'active'
        )`,
      )
      .returning({ id: contributionPlans.id });
    return updated.length;
  }
}
