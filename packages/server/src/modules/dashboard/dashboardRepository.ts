import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import { usersTable } from "najm-auth/pg";
import { Repository } from "najm-core";
import { DB } from "najm-database";

import type { KafilDatabase } from "../../database/types";
import { budgetAccounts } from "../budgets/budgetSchema";
import { children } from "../children/childSchema";
import { contributions, contributionPlans } from "../contributions/contributionSchema";
import { familyProfiles } from "../families/familySchema";
import { orders } from "../orders/orderSchema";
import { inventoryBalances, products } from "../catalog/catalogSchema";
import { sponsorProfiles } from "../sponsors/sponsorSchema";
import { supportAssignments } from "../supportAssignments/supportAssignmentSchema";

const monthExpression = (column: typeof contributions.submittedAt | typeof orders.createdAt) =>
  sql<string>`to_char(date_trunc('month', ${column}), 'YYYY-MM')`;

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

  async operatorMoneyCounts() {
    const [[contributionRows], [budgetRows], [orderRows], [inventoryRows]] = await Promise.all([
      this.db.select({
        pendingCount: sql<number>`count(*) filter (where ${contributions.status} = 'pending')::int`,
        pendingMinor: sql<number>`coalesce(sum(${contributions.amountMinor}) filter (where ${contributions.status} = 'pending'), 0)::bigint`,
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
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(inventoryBalances)
        .innerJoin(products, eq(inventoryBalances.productId, products.id))
        .where(and(
          eq(products.status, "active"),
          lte(sql`${inventoryBalances.onHandQuantity} - ${inventoryBalances.reservedQuantity}`, 5),
        )),
    ]);

    return {
      contributions: contributionRows,
      budgets: budgetRows,
      orders: orderRows,
      inventory: inventoryRows,
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

  operatorLowStock(limit = 6) {
    return this.db
      .select({
        productId: products.id,
        name: products.name,
        sku: products.sku,
        availableQuantity: sql<number>`${inventoryBalances.onHandQuantity} - ${inventoryBalances.reservedQuantity}`,
      })
      .from(inventoryBalances)
      .innerJoin(products, eq(inventoryBalances.productId, products.id))
      .where(and(
        eq(products.status, "active"),
        lte(sql`${inventoryBalances.onHandQuantity} - ${inventoryBalances.reservedQuantity}`, 5),
      ))
      .orderBy(asc(sql`${inventoryBalances.onHandQuantity} - ${inventoryBalances.reservedQuantity}`), asc(products.name))
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
      .select({ id: sponsorProfiles.id, displayName: usersTable.name })
      .from(sponsorProfiles)
      .innerJoin(usersTable, eq(sponsorProfiles.userId, usersTable.id))
      .where(eq(sponsorProfiles.userId, userId))
      .limit(1);
    return identity;
  }

  async sponsorSummary(sponsorProfileId: string) {
    const [[assignmentRows], [planRows], [contributionRows], [orderRows]] = await Promise.all([
      this.db.select({
        active: sql<number>`count(*) filter (where ${supportAssignments.status} = 'active')::int`,
      }).from(supportAssignments).where(eq(supportAssignments.sponsorProfileId, sponsorProfileId)),
      this.db
        .select({ active: sql<number>`count(*) filter (where ${contributionPlans.status} = 'active')::int` })
        .from(contributionPlans)
        .innerJoin(supportAssignments, eq(contributionPlans.supportAssignmentId, supportAssignments.id))
        .where(eq(supportAssignments.sponsorProfileId, sponsorProfileId)),
      this.db.select({
        pendingCount: sql<number>`count(*) filter (where ${contributions.status} = 'pending')::int`,
        pendingMinor: sql<number>`coalesce(sum(${contributions.amountMinor}) filter (where ${contributions.status} = 'pending'), 0)::bigint`,
        validatedMinor: sql<number>`coalesce(sum(${contributions.amountMinor}) filter (where ${contributions.status} = 'validated'), 0)::bigint`,
      }).from(contributions).where(eq(contributions.sponsorProfileId, sponsorProfileId)),
      this.db
        .select({ count: sql<number>`count(distinct ${orders.id})::int` })
        .from(orders)
        .innerJoin(supportAssignments, eq(orders.familyProfileId, supportAssignments.familyProfileId))
        .where(and(
          eq(supportAssignments.sponsorProfileId, sponsorProfileId),
          eq(supportAssignments.status, "active"),
        )),
    ]);
    return { assignments: assignmentRows, plans: planRows, contributions: contributionRows, orders: orderRows };
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
      ));
  }

  sponsorContributionTrend(sponsorProfileId: string, since: Date) {
    const month = monthExpression(contributions.submittedAt);
    return this.db
      .select({
        month,
        validatedMinor: sql<number>`coalesce(sum(${contributions.amountMinor}) filter (where ${contributions.status} = 'validated'), 0)::bigint`,
        pendingMinor: sql<number>`coalesce(sum(${contributions.amountMinor}) filter (where ${contributions.status} = 'pending'), 0)::bigint`,
      })
      .from(contributions)
      .where(and(eq(contributions.sponsorProfileId, sponsorProfileId), gte(contributions.submittedAt, since)))
      .groupBy(month)
      .orderBy(asc(month));
  }

  sponsorContributionStatuses(sponsorProfileId: string) {
    return this.db
      .select({ status: contributions.status, count: sql<number>`count(*)::int` })
      .from(contributions)
      .where(eq(contributions.sponsorProfileId, sponsorProfileId))
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
      .where(eq(contributions.sponsorProfileId, sponsorProfileId))
      .orderBy(desc(contributions.submittedAt))
      .limit(limit);
  }
}
