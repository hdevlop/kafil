import { HttpError, Service } from "najm-core";

import { DashboardRepository } from "./dashboardRepository";
import type {
  DashboardStatusCount,
  FamilyDashboard,
  OperatorDashboard,
  SponsorDashboard,
} from "./dashboardTypes";

const numberValue = (value: unknown) => Number(value ?? 0);

function monthWindow() {
  const now = new Date();
  const firstMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));
  const months = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(Date.UTC(firstMonth.getUTCFullYear(), firstMonth.getUTCMonth() + index, 1));
    return date.toISOString().slice(0, 7);
  });
  return { firstMonth, months };
}

function fillMonths<T extends { month: string }>(
  rows: T[],
  empty: (month: string) => T,
) {
  const { months } = monthWindow();
  const byMonth = new Map(rows.map((row) => [row.month, row]));
  return months.map((month) => byMonth.get(month) ?? empty(month));
}

function statusCounts(rows: Array<{ status: string; count: unknown }>): DashboardStatusCount[] {
  return rows.map((row) => ({ status: row.status, count: numberValue(row.count) }));
}

@Service()
export class DashboardService {
  constructor(private readonly dashboard: DashboardRepository) {}

  async getOperator(): Promise<OperatorDashboard> {
    const { firstMonth } = monthWindow();
    const [people, money, trendRows, orderRows, lowStockRows] = await Promise.all([
      this.dashboard.operatorPeopleCounts(),
      this.dashboard.operatorMoneyCounts(),
      this.dashboard.operatorContributionTrend(firstMonth),
      this.dashboard.operatorOrderStatuses(),
      this.dashboard.operatorLowStock(),
    ]);

    return {
      counts: {
        families: numberValue(people.families?.total),
        activeFamilies: numberValue(people.families?.active),
        children: numberValue(people.children?.total),
        activeChildren: numberValue(people.children?.active),
        sponsors: numberValue(people.sponsors?.total),
        activeSponsors: numberValue(people.sponsors?.active),
        activeAssignments: numberValue(people.assignments?.active),
        pendingContributions: numberValue(money.contributions?.pendingCount),
        openOrders: numberValue(money.orders?.openCount),
        lowStockProducts: numberValue(money.inventory?.count),
      },
      money: {
        pendingContributionMinor: numberValue(money.contributions?.pendingMinor),
        validatedContributionMinor: numberValue(money.contributions?.validatedMinor),
        refundedContributionMinor: numberValue(money.contributions?.refundedMinor),
        availableBudgetMinor: numberValue(money.budgets?.availableMinor),
        reservedBudgetMinor: numberValue(money.budgets?.reservedMinor),
        spentBudgetMinor: numberValue(money.budgets?.spentMinor),
      },
      contributionTrend: fillMonths(
        trendRows.map((row) => ({
          month: row.month,
          validatedMinor: numberValue(row.validatedMinor),
          refundedMinor: numberValue(row.refundedMinor),
        })),
        (month) => ({ month, validatedMinor: 0, refundedMinor: 0 }),
      ),
      orderStatuses: statusCounts(orderRows),
      lowStock: lowStockRows.map((row) => ({ ...row, availableQuantity: numberValue(row.availableQuantity) })),
    };
  }

  async getFamily(userId: string): Promise<FamilyDashboard> {
    const identity = await this.dashboard.familyIdentity(userId);
    if (!identity) HttpError.notFound("Family dashboard not found");

    const { firstMonth } = monthWindow();
    const [summary, trendRows, statusRows, recentOrders] = await Promise.all([
      this.dashboard.familySummary(identity.familyProfileId),
      this.dashboard.familyOrderTrend(identity.familyProfileId, firstMonth),
      this.dashboard.familyOrderStatuses(identity.familyProfileId),
      this.dashboard.familyRecentOrders(identity.familyProfileId),
    ]);

    return {
      displayName: identity.displayName || "Family",
      counts: {
        children: numberValue(summary.children?.total),
        activeChildren: numberValue(summary.children?.active),
        openOrders: numberValue(summary.orders?.open),
        deliveredOrders: numberValue(summary.orders?.delivered),
      },
      budget: {
        availableMinor: numberValue(summary.budget?.availableMinor),
        reservedMinor: numberValue(summary.budget?.reservedMinor),
        spentMinor: numberValue(summary.budget?.spentMinor),
      },
      orderTrend: fillMonths(
        trendRows.map((row) => ({ month: row.month, spentMinor: numberValue(row.spentMinor) })),
        (month) => ({ month, spentMinor: 0 }),
      ),
      orderStatuses: statusCounts(statusRows),
      recentOrders: recentOrders.map((order) => ({ ...order, totalMinor: numberValue(order.totalMinor) })),
    };
  }

  async getSponsor(userId: string): Promise<SponsorDashboard> {
    const identity = await this.dashboard.sponsorIdentity(userId);
    if (!identity) HttpError.notFound("Sponsor dashboard not found");

    const { firstMonth } = monthWindow();
    const [summary, budgetRows, trendRows, statusRows, recentRows] = await Promise.all([
      this.dashboard.sponsorSummary(identity.id),
      this.dashboard.sponsorBudgetRows(identity.id),
      this.dashboard.sponsorContributionTrend(identity.id, firstMonth),
      this.dashboard.sponsorContributionStatuses(identity.id),
      this.dashboard.sponsorRecentContributions(identity.id),
    ]);
    const budget = budgetRows.reduce(
      (totals, row) => ({
        availableMinor: totals.availableMinor + numberValue(row.availableMinor),
        reservedMinor: totals.reservedMinor + numberValue(row.reservedMinor),
        spentMinor: totals.spentMinor + numberValue(row.spentMinor),
      }),
      { availableMinor: 0, reservedMinor: 0, spentMinor: 0 },
    );

    return {
      displayName: identity.displayName || "Sponsor",
      counts: {
        activeAssignments: numberValue(summary.assignments?.active),
        activePlans: numberValue(summary.plans?.active),
        pendingContributions: numberValue(summary.contributions?.pendingCount),
        supportedOrders: numberValue(summary.orders?.count),
      },
      money: {
        validatedContributionMinor: numberValue(summary.contributions?.validatedMinor),
        pendingContributionMinor: numberValue(summary.contributions?.pendingMinor),
        supportedAvailableMinor: budget.availableMinor,
        supportedReservedMinor: budget.reservedMinor,
        supportedSpentMinor: budget.spentMinor,
      },
      contributionTrend: fillMonths(
        trendRows.map((row) => ({
          month: row.month,
          validatedMinor: numberValue(row.validatedMinor),
          pendingMinor: numberValue(row.pendingMinor),
        })),
        (month) => ({ month, validatedMinor: 0, pendingMinor: 0 }),
      ),
      contributionStatuses: statusCounts(statusRows),
      recentContributions: recentRows.map((row) => ({ ...row, amountMinor: numberValue(row.amountMinor) })),
    };
  }
}
