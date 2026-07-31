import { and, asc, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { usersTable } from "najm-auth/pg";
import { Repository } from "najm-core";
import { DB } from "najm-database";

import type { KafilDatabase } from "../../database/types";
import { budgetAccounts } from "../budgets/budgetSchema";
import { children } from "../children/childSchema";
import { contributions, contributionPlans } from "../contributions/contributionSchema";
import { familyProfiles } from "../families/familySchema";
import { orders, orderItems } from "../orders/orderSchema";
import { sponsorProfiles } from "../sponsors/sponsorSchema";
import { supportAssignments } from "../supportAssignments/supportAssignmentSchema";

const monthExpression = (column: typeof contributions.submittedAt | typeof orders.createdAt) =>
  sql<string>`to_char(date_trunc('month', ${column}), 'YYYY-MM')`;

const isLivePending = (now: Date) =>
  sql`${contributions.status} = 'pending' AND ${contributions.expiresAt} > ${now.toISOString()}::timestamptz`;

@Repository("default")
export class DashboardRepository {
  @DB() private db!: KafilDatabase;

  async operatorPeopleCounts() {
    const [[families], [childRows], [sponsors], [assignments]] = await Promise.all([
      this.db
        .select({
          total: sql<number>`count(*)::int`,
          active: sql<number>`count(*) filter (where ${usersTable.status} = 'active')::int`,
        })
        .from(familyProfiles)
        .innerJoin(usersTable, eq(familyProfiles.userId, usersTable.id)),
      this.db.select({
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(*) filter (where ${children.status} = 'active')::int`,
      }).from(children),
      this.db
        .select({
          total: sql<number>`count(*)::int`,
          active: sql<number>`count(*) filter (where ${usersTable.status} = 'active')::int`,
        })
        .from(sponsorProfiles)
        .innerJoin(usersTable, eq(sponsorProfiles.userId, usersTable.id)),
      this.db.select({
        active: sql<number>`count(*) filter (where ${supportAssignments.status} = 'active')::int`,
      }).from(supportAssignments),
    ]);

    return { families, children: childRows, sponsors, assignments };
  }

  async operatorMoneyCounts(now: Date = new Date()) {
    const [[contributionRows], [budgetRows], [orderRows]] = await Promise.all([
      this.db.select({
        pendingCount: sql<number>`count(*) filter (where ${isLivePending(now)})::int`,
        expiredCount: sql<number>`count(*) filter (where ${contributions.status} = 'expired')::int`,
        rejectedCount: sql<number>`count(*) filter (where ${contributions.status} = 'rejected')::int`,
        pendingMinor: sql<number>`coalesce(sum(${contributions.amountMinor}) filter (where ${isLivePending(now)}), 0)::bigint`,
        validatedMinor: sql<number>`coalesce(sum(${contributions.amountMinor}) filter (where ${contributions.status} = 'validated'), 0)::bigint`,
        refundedMinor: sql<number>`coalesce(sum(${contributions.amountMinor}) filter (where ${contributions.status} = 'refunded'), 0)::bigint`,
      }).from(contributions),
      this.db.select({
        availableMinor: sql<number>`coalesce(sum(${budgetAccounts.availableMinor}), 0)::bigint`,
        reservedMinor: sql<number>`coalesce(sum(${budgetAccounts.reservedMinor}), 0)::bigint`,
        spentMinor: sql<number>`coalesce(sum(${budgetAccounts.spentMinor}), 0)::bigint`,
      }).from(budgetAccounts),
      this.db.select({
        openCount: sql<number>`count(*) filter (where ${orders.status} in ('pending', 'approved', 'in_preparation'))::int`,
      }).from(orders),
    ]);

    return {
      contributions: contributionRows,
      budgets: budgetRows,
      orders: orderRows,
    };
  }

  operatorContributionTrend(since: Date) {
    const month = monthExpression(contributions.submittedAt);
    return this.db
      .select({
        month,
        validatedMinor: sql<number>`coalesce(sum(${contributions.amountMinor}) filter (where ${contributions.status} = 'validated'), 0)::bigint`,
        refundedMinor: sql<number>`coalesce(sum(${contributions.amountMinor}) filter (where ${contributions.status} = 'refunded'), 0)::bigint`,
      })
      .from(contributions)
      .where(gte(contributions.submittedAt, since))
      .groupBy(month)
      .orderBy(asc(month));
  }

  operatorOrderStatuses() {
    return this.db
      .select({ status: orders.status, count: sql<number>`count(*)::int` })
      .from(orders)
      .groupBy(orders.status)
      .orderBy(asc(orders.status));
  }

  operatorRecentOrders(limit = 5) {
    return this.db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        familyName: usersTable.name,
        status: orders.status,
        totalMinor: orders.totalMinor,
        placedAt: orders.createdAt,
      })
      .from(orders)
      .innerJoin(familyProfiles, eq(orders.familyProfileId, familyProfiles.id))
      .innerJoin(usersTable, eq(familyProfiles.userId, usersTable.id))
      .orderBy(desc(orders.createdAt))
      .limit(limit);
  }

  async familyIdentity(userId: string) {
    const [identity] = await this.db
      .select({
        displayName: usersTable.name,
        familyProfileId: familyProfiles.id,
      })
      .from(familyProfiles)
      .innerJoin(usersTable, eq(familyProfiles.userId, usersTable.id))
      .where(eq(familyProfiles.userId, userId))
      .limit(1);
    return identity;
  }

  async familySummary(familyProfileId: string) {
    const [[childRows], [budgetRows], [orderRows]] = await Promise.all([
      this.db.select({
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(*) filter (where ${children.status} = 'active')::int`,
      }).from(children).where(eq(children.familyProfileId, familyProfileId)),
      this.db.select({
        availableMinor: budgetAccounts.availableMinor,
        reservedMinor: budgetAccounts.reservedMinor,
        spentMinor: budgetAccounts.spentMinor,
      }).from(budgetAccounts).where(eq(budgetAccounts.familyProfileId, familyProfileId)).limit(1),
      this.db.select({
        open: sql<number>`count(*) filter (where ${orders.status} in ('pending', 'approved', 'in_preparation'))::int`,
        delivered: sql<number>`count(*) filter (where ${orders.status} = 'delivered')::int`,
      }).from(orders).where(eq(orders.familyProfileId, familyProfileId)),
    ]);
    return { children: childRows, budget: budgetRows, orders: orderRows };
  }

  familyOrderTrend(familyProfileId: string, since: Date) {
    const month = monthExpression(orders.createdAt);
    return this.db
      .select({
        month,
        spentMinor: sql<number>`coalesce(sum(${orders.totalMinor}) filter (where ${orders.status} not in ('rejected', 'cancelled')), 0)::bigint`,
      })
      .from(orders)
      .where(and(eq(orders.familyProfileId, familyProfileId), gte(orders.createdAt, since)))
      .groupBy(month)
      .orderBy(asc(month));
  }

  familyOrderStatuses(familyProfileId: string) {
    return this.db
      .select({ status: orders.status, count: sql<number>`count(*)::int` })
      .from(orders)
      .where(eq(orders.familyProfileId, familyProfileId))
      .groupBy(orders.status)
      .orderBy(asc(orders.status));
  }

  familyRecentOrders(familyProfileId: string, limit = 5) {
    return this.db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        totalMinor: orders.totalMinor,
        placedAt: orders.createdAt,
      })
      .from(orders)
      .where(eq(orders.familyProfileId, familyProfileId))
      .orderBy(desc(orders.createdAt))
      .limit(limit);
  }

  async sponsorIdentity(userId: string) {
    const [identity] = await this.db
      .select({ id: sponsorProfiles.id, displayName: usersTable.name, createdAt: sponsorProfiles.createdAt })
      .from(sponsorProfiles)
      .innerJoin(usersTable, eq(sponsorProfiles.userId, usersTable.id))
      .where(eq(sponsorProfiles.userId, userId))
      .limit(1);
    return identity;
  }

  async sponsorSummary(sponsorProfileId: string) {
    const [[assignmentRows], [planRows], [contributionRows], [orderRows]] = await Promise.all([
      this.db.select({
        active: sql<number>`count(*) filter (where ${supportAssignments.status} = 'active' AND ${supportAssignments.childId} IS NULL)::int`,
      }).from(supportAssignments).where(eq(supportAssignments.sponsorProfileId, sponsorProfileId)),
      this.sponsorPlanSummary(sponsorProfileId),
      this.sponsorContributionSummary(sponsorProfileId),
      this.db
        .select({ count: sql<number>`count(distinct ${orders.id})::int` })
        .from(orders)
        .innerJoin(supportAssignments, eq(orders.familyProfileId, supportAssignments.familyProfileId))
        .where(and(
          eq(supportAssignments.sponsorProfileId, sponsorProfileId),
          eq(supportAssignments.status, "active"),
          isNull(supportAssignments.childId),
        )),
    ]);
    return { assignments: assignmentRows, plans: planRows, contributions: contributionRows, orders: orderRows };
  }

  sponsorPlanSummary(sponsorProfileId: string) {
    return this.db
      .select({ active: sql<number>`count(*) filter (where ${contributionPlans.status} = 'active')::int` })
      .from(contributionPlans)
      .innerJoin(supportAssignments, eq(contributionPlans.supportAssignmentId, supportAssignments.id))
      .where(and(
        eq(supportAssignments.sponsorProfileId, sponsorProfileId),
        eq(supportAssignments.status, "active"),
        isNull(supportAssignments.childId),
      ));
  }

  sponsorContributionSummary(sponsorProfileId: string, now: Date = new Date()) {
    return this.db
      .select({
        pendingCount: sql<number>`count(*) filter (where ${contributions.status} = 'pending' AND ${contributions.expiresAt} > ${now})::int`,
        expiredCount: sql<number>`count(*) filter (where ${contributions.status} = 'expired')::int`,
        rejectedCount: sql<number>`count(*) filter (where ${contributions.status} = 'rejected')::int`,
        pendingMinor: sql<number>`coalesce(sum(${contributions.amountMinor}) filter (where ${contributions.status} = 'pending' AND ${contributions.expiresAt} > ${now}), 0)::bigint`,
        validatedMinor: sql<number>`coalesce(sum(${contributions.amountMinor}) filter (where ${contributions.status} = 'validated'), 0)::bigint`,
      })
      .from(contributions)
      .innerJoin(supportAssignments, eq(contributions.supportAssignmentId, supportAssignments.id))
      .where(and(
        eq(contributions.sponsorProfileId, sponsorProfileId),
        isNull(supportAssignments.childId),
      ));
  }

  sponsorBudgetRows(sponsorProfileId: string) {
    return this.db
      .selectDistinct({
        familyProfileId: budgetAccounts.familyProfileId,
        availableMinor: budgetAccounts.availableMinor,
        reservedMinor: budgetAccounts.reservedMinor,
        spentMinor: budgetAccounts.spentMinor,
      })
      .from(budgetAccounts)
      .innerJoin(supportAssignments, eq(budgetAccounts.familyProfileId, supportAssignments.familyProfileId))
      .where(and(
        eq(supportAssignments.sponsorProfileId, sponsorProfileId),
        eq(supportAssignments.status, "active"),
        isNull(supportAssignments.childId),
      ));
  }

  sponsorContributionTrend(
    sponsorProfileId: string,
    since: Date,
    now: Date = new Date(),
  ) {
    const month = monthExpression(contributions.submittedAt);
    return this.db
      .select({
        month,
        validatedMinor: sql<number>`coalesce(sum(${contributions.amountMinor}) filter (where ${contributions.status} = 'validated'), 0)::bigint`,
        pendingMinor: sql<number>`coalesce(sum(${contributions.amountMinor}) filter (where ${isLivePending(now)}), 0)::bigint`,
      })
      .from(contributions)
      .innerJoin(supportAssignments, eq(contributions.supportAssignmentId, supportAssignments.id))
      .where(and(
        eq(supportAssignments.sponsorProfileId, sponsorProfileId),
        isNull(supportAssignments.childId),
        gte(contributions.submittedAt, since),
      ))
      .groupBy(month)
      .orderBy(asc(month));
  }

  sponsorContributionStatuses(sponsorProfileId: string) {
    return this.db
      .select({ status: contributions.status, count: sql<number>`count(*)::int` })
      .from(contributions)
      .innerJoin(supportAssignments, eq(contributions.supportAssignmentId, supportAssignments.id))
      .where(and(
        eq(contributions.sponsorProfileId, sponsorProfileId),
        isNull(supportAssignments.childId),
      ))
      .groupBy(contributions.status)
      .orderBy(asc(contributions.status));
  }

  sponsorRecentContributions(sponsorProfileId: string, limit = 5) {
    return this.db
      .select({
        id: contributions.id,
        status: contributions.status,
        amountMinor: contributions.amountMinor,
        submittedAt: contributions.submittedAt,
      })
      .from(contributions)
      .innerJoin(supportAssignments, eq(contributions.supportAssignmentId, supportAssignments.id))
      .where(and(
        eq(contributions.sponsorProfileId, sponsorProfileId),
        isNull(supportAssignments.childId),
      ))
      .orderBy(desc(contributions.submittedAt))
      .limit(limit);
  }

  sponsorSupportedFamilies(sponsorProfileId: string) {
    return this.db
      .select({
        assignmentId: supportAssignments.id,
        familyProfileId: familyProfiles.id,
        activeChildCount: sql<number>`(SELECT COUNT(*) FROM ${children} WHERE ${children.familyProfileId} = ${familyProfiles.id} AND ${children.status} = 'active')::int`,
        startedAt: supportAssignments.startedAt,
        fundingTargetMinor: familyProfiles.fundingTargetMinor,
        fundingStatus: familyProfiles.fundingStatus,
        fundingActivatedAt: familyProfiles.fundingActivatedAt,
        fundedMinor: sql<number>`COALESCE((SELECT SUM(${contributions.amountMinor}) FROM ${contributions} WHERE ${contributions.familyProfileId} = ${familyProfiles.id} AND ${contributions.status} = 'validated'), 0)::bigint`,
      })
      .from(supportAssignments)
      .innerJoin(familyProfiles, eq(supportAssignments.familyProfileId, familyProfiles.id))
      .where(and(
        eq(supportAssignments.sponsorProfileId, sponsorProfileId),
        eq(supportAssignments.status, "active"),
        isNull(supportAssignments.childId),
      ))
      .orderBy(asc(supportAssignments.startedAt));
  }

  sponsorEarliestPlan(sponsorProfileId: string) {
    return this.db
      .select({
        planId: contributionPlans.id,
        amountMinor: contributionPlans.amountMinor,
        dueAt: contributionPlans.nextDueAt,
      })
      .from(contributionPlans)
      .innerJoin(supportAssignments, eq(contributionPlans.supportAssignmentId, supportAssignments.id))
      .where(and(
        eq(supportAssignments.sponsorProfileId, sponsorProfileId),
        eq(contributionPlans.status, "active"),
        eq(supportAssignments.status, "active"),
        isNull(supportAssignments.childId),
        sql`${contributionPlans.nextDueAt} IS NOT NULL`,
        sql`${contributionPlans.nextDueAt} >= now()`,
      ))
      .orderBy(asc(contributionPlans.nextDueAt))
      .limit(1);
  }

  sponsorUpcomingPlans(sponsorProfileId: string, limit = 3) {
    return this.db
      .select({
        planId: contributionPlans.id,
        amountMinor: contributionPlans.amountMinor,
        dueAt: contributionPlans.nextDueAt,
        assignmentId: supportAssignments.id,
      })
      .from(contributionPlans)
      .innerJoin(supportAssignments, eq(contributionPlans.supportAssignmentId, supportAssignments.id))
      .where(and(
        eq(supportAssignments.sponsorProfileId, sponsorProfileId),
        eq(contributionPlans.status, "active"),
        eq(supportAssignments.status, "active"),
        isNull(supportAssignments.childId),
        sql`${contributionPlans.nextDueAt} IS NOT NULL`,
        sql`${contributionPlans.nextDueAt} >= now()`,
      ))
      .orderBy(asc(contributionPlans.nextDueAt))
      .limit(limit);
  }

  sponsorRecentSupportedOrders(sponsorProfileId: string, limit = 5) {
    return this.db
      .selectDistinct({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        totalMinor: orders.totalMinor,
        placedAt: orders.createdAt,
        itemCount: sql<number>`COALESCE((SELECT SUM(${orderItems.quantity}) FROM ${orderItems} WHERE ${orderItems.orderId} = ${orders.id}), 0)::int`,
      })
      .from(orders)
      .innerJoin(supportAssignments, eq(orders.familyProfileId, supportAssignments.familyProfileId))
      .where(and(
        eq(supportAssignments.sponsorProfileId, sponsorProfileId),
        eq(supportAssignments.status, "active"),
        isNull(supportAssignments.childId),
      ))
      .orderBy(desc(orders.createdAt))
      .limit(limit);
  }
}
