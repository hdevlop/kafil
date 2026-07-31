import { HttpError, Service } from "najm-core";

import { DashboardRepository } from "./dashboardRepository";
import type {
  DashboardStatusCount,
  FamilyDashboard,
  OperatorDashboard,
  SponsorDashboard,
  SponsorMetrics,
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
    const [people, money, trendRows, orderRows, recentOrders] = await Promise.all([
      this.dashboard.operatorPeopleCounts(),
      this.dashboard.operatorMoneyCounts(),
      this.dashboard.operatorContributionTrend(firstMonth),
      this.dashboard.operatorOrderStatuses(),
      this.dashboard.operatorRecentOrders(),
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
      recentOrders: recentOrders.map((order) => ({
        ...order,
        familyName: order.familyName || "Family",
        totalMinor: numberValue(order.totalMinor),
      })),
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

    const [metrics, supportedFamiliesRows] = await Promise.all([
      this.getSponsorMetrics(identity.id),
      this.dashboard.sponsorSupportedFamilies(identity.id),
    ]);

    return {
      displayName: identity.displayName || "Sponsor",
      memberSince: identity.createdAt?.toISOString() ?? "",
      ...metrics,
      supportedFamilies: supportedFamiliesRows.map((row) => {
        const target = numberValue(row.fundingTargetMinor);
        const funded = numberValue(row.fundedMinor);
        return {
          assignmentId: row.assignmentId,
          supportReference: `Support ${row.assignmentId.slice(0, 8)}`,
          activeChildCount: numberValue(row.activeChildCount),
          startedAt: row.startedAt,
          funding: target > 0
            ? {
                targetMinor: target,
                fundedMinor: funded,
                remainingMinor: Math.max(0, target - funded),
                status: row.fundingStatus ?? "pending_funding",
                activatedAt: row.fundingActivatedAt?.toISOString() ?? null,
              }
            : null,
        };
      }),
    };
  }

  async getSponsorMetrics(sponsorProfileId: string): Promise<SponsorMetrics> {
    const { firstMonth } = monthWindow();
    const [
      summary,
      budgetRows,
      trendRows,
      statusRows,
      recentContributionsRows,
      earliestPlanRows,
      upcomingPlansRows,
      recentOrdersRows,
    ] = await Promise.all([
      this.dashboard.sponsorSummary(sponsorProfileId),
      this.dashboard.sponsorBudgetRows(sponsorProfileId),
      this.dashboard.sponsorContributionTrend(sponsorProfileId, firstMonth),
      this.dashboard.sponsorContributionStatuses(sponsorProfileId),
      this.dashboard.sponsorRecentContributions(sponsorProfileId),
      this.dashboard.sponsorEarliestPlan(sponsorProfileId),
      this.dashboard.sponsorUpcomingPlans(sponsorProfileId),
      this.dashboard.sponsorRecentSupportedOrders(sponsorProfileId),
    ]);

    return this.buildSponsorMetrics(summary, budgetRows, trendRows, statusRows, recentContributionsRows, earliestPlanRows, upcomingPlansRows, recentOrdersRows);
  }

  private buildSponsorMetrics(
    summary: Awaited<ReturnType<DashboardRepository["sponsorSummary"]>>,
    budgetRows: Awaited<ReturnType<DashboardRepository["sponsorBudgetRows"]>>,
    trendRows: Awaited<ReturnType<DashboardRepository["sponsorContributionTrend"]>>,
    statusRows: Awaited<ReturnType<DashboardRepository["sponsorContributionStatuses"]>>,
    recentContributionsRows: Awaited<ReturnType<DashboardRepository["sponsorRecentContributions"]>>,
    earliestPlanRows: Awaited<ReturnType<DashboardRepository["sponsorEarliestPlan"]>>,
    upcomingPlansRows: Awaited<ReturnType<DashboardRepository["sponsorUpcomingPlans"]>>,
    recentOrdersRows: Awaited<ReturnType<DashboardRepository["sponsorRecentSupportedOrders"]>>,
  ): SponsorMetrics {
    const budget = budgetRows.reduce(
      (totals, row) => ({
        availableMinor: totals.availableMinor + numberValue(row.availableMinor),
        reservedMinor: totals.reservedMinor + numberValue(row.reservedMinor),
        spentMinor: totals.spentMinor + numberValue(row.spentMinor),
      }),
      { availableMinor: 0, reservedMinor: 0, spentMinor: 0 },
    );

    const earliestPlan = earliestPlanRows[0] ?? null;

    return {
      counts: {
        activeSupportedFamilies: numberValue(summary.assignments?.active),
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
      nextPlannedContribution: earliestPlan
        ? {
            planId: earliestPlan.planId,
            amountMinor: numberValue(earliestPlan.amountMinor),
            dueAt: earliestPlan.dueAt?.toISOString() ?? "",
          }
        : null,
      contributionTrend: fillMonths(
        trendRows.map((row) => ({
          month: row.month,
          validatedMinor: numberValue(row.validatedMinor),
          pendingMinor: numberValue(row.pendingMinor),
        })),
        (month) => ({ month, validatedMinor: 0, pendingMinor: 0 }),
      ),
      contributionStatuses: statusCounts(statusRows),
      recentContributions: recentContributionsRows.map((row) => ({ ...row, amountMinor: numberValue(row.amountMinor) })),
      recentSupportedOrders: recentOrdersRows.map((row) => ({
        ...row,
        totalMinor: numberValue(row.totalMinor),
        itemCount: numberValue(row.itemCount),
      })),
      upcomingContributions: upcomingPlansRows.map((row) => ({
        planId: row.planId,
        amountMinor: numberValue(row.amountMinor),
        dueAt: row.dueAt ?? new Date(),
        supportReference: `Support ${row.assignmentId.slice(0, 8)}`,
      })),
    };
  }
}
