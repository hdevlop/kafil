import { HttpError, Service } from "najm-core";

import { DashboardRepository } from "./dashboardRepository";
import type {
  DashboardStatusCount,
  DeliveryDashboard,
  DeliveryDashboardCategory,
  DeliveryDashboardItem,
  FamilyDashboard,
  OperatorDashboard,
  SponsorDashboard,
  SponsorMetrics,
} from "./dashboardTypes";
import { sponsorFamilyReference } from "../supportAssignments/supportAssignmentProjection";

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
    const [people, money, trendRows, orderRows, recentOrders, pendingApplicants, familiesWithoutSponsorship] = await Promise.all([
      this.dashboard.operatorPeopleCounts(),
      this.dashboard.operatorMoneyCounts(),
      this.dashboard.operatorContributionTrend(firstMonth),
      this.dashboard.operatorOrderStatuses(),
      this.dashboard.operatorRecentOrders(),
      this.dashboard.operatorPendingApplicants(),
      this.dashboard.operatorFamiliesWithoutSponsorship(),
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
        pendingApplicants: numberValue(pendingApplicants[0]?.count),
        familiesWithoutSponsorship: numberValue(familiesWithoutSponsorship[0]?.count),
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

  async getDeliveryContext(
    userId: string,
  ): Promise<{ eligible: boolean; staffProfileId: string | null }> {
    const staff = await this.dashboard.deliveryStaffIdentity(userId);
    return { eligible: Boolean(staff), staffProfileId: staff?.id ?? null };
  }

  async getDelivery(
    userId: string,
    selectedDate: string,
    now = new Date(),
  ): Promise<DeliveryDashboard> {
    const staff = await this.dashboard.deliveryStaffIdentity(userId);
    if (!staff) HttpError.forbidden("Delivery dashboard access denied");

    const rows = await this.dashboard.deliveryRows(staff.id, selectedDate);
    const issueRows = await this.dashboard.openDeliveryIssues(
      rows.map((row) => row.attemptId),
    );
    const issuesByAttempt = new Map<string, typeof issueRows>();
    for (const issue of issueRows) {
      const issues = issuesByAttempt.get(issue.attemptId) ?? [];
      issues.push(issue);
      issuesByAttempt.set(issue.attemptId, issues);
    }

    const clock = casablancaClock(now);
    const deliveries: DeliveryDashboardItem[] = rows.map((row) => {
      const openIssues = (issuesByAttempt.get(row.attemptId) ?? []).map(
        ({ id, kind, note }) => ({ id, kind, note }),
      );
      const delayed = isDeliveryDelayed({
        attemptStatus: row.attemptStatus,
        selectedDate,
        windowEndMinute: row.windowEndMinute,
      }, clock);
      const category: DeliveryDashboardCategory =
        row.attemptStatus === "delivered"
          ? "delivered"
          : row.attemptStatus === "failed" || delayed || openIssues.length > 0
            ? "needs_attention"
            : "pending";
      const hasCoordinates =
        row.latitude != null &&
        row.longitude != null &&
        row.latitude >= -90 &&
        row.latitude <= 90 &&
        row.longitude >= -180 &&
        row.longitude <= 180;

      return {
        attemptId: row.attemptId,
        orderId: row.orderId,
        orderNumber: row.orderNumber,
        familyProfileId: row.familyProfileId,
        familyName: row.familyName || "Family",
        familyImage: row.familyImage,
        category,
        attemptStatus: row.attemptStatus as DeliveryDashboardItem["attemptStatus"],
        address: row.address,
        phone: row.phone,
        coordinates: hasCoordinates
          ? { latitude: row.latitude!, longitude: row.longitude! }
          : null,
        scheduledDate: row.scheduledDate!,
        windowStartMinute: row.windowStartMinute,
        windowEndMinute: row.windowEndMinute,
        packageCount: row.packageCount ?? 0,
        delayed,
        openIssues,
        canStart:
          row.attemptStatus === "assigned" && row.orderStatus === "purchased",
        canConfirm:
          row.attemptStatus === "in_progress" &&
          row.orderStatus === "out_for_delivery",
        canReportIssue: row.attemptStatus !== "delivered",
      };
    });

    const pending = deliveries.filter((item) => item.category === "pending").length;
    const delivered = deliveries.filter((item) => item.category === "delivered").length;
    const needsAttention = deliveries.filter(
      (item) => item.category === "needs_attention",
    ).length;
    const issueCount = (
      kind: DeliveryDashboardItem["openIssues"][number]["kind"],
    ) => deliveries.filter((item) => item.openIssues.some((issue) => issue.kind === kind)).length;

    return {
      selectedDate,
      timezone: "Africa/Casablanca",
      counts: {
        assigned: deliveries.length,
        pending,
        delivered,
        needsAttention,
        families: new Set(deliveries.map((item) => item.familyProfileId)).size,
        packagesRemaining: deliveries
          .filter((item) => item.category !== "delivered")
          .reduce((total, item) => total + item.packageCount, 0),
      },
      issueCounts: {
        addressToConfirm: issueCount("address_confirmation"),
        familyUnreachable: issueCount("family_unreachable"),
        missingProof: issueCount("missing_proof"),
        delayed: deliveries.filter((item) => item.delayed).length,
      },
      deliveries,
    };
  }

  async getFamily(userId: string): Promise<FamilyDashboard> {
    const identity = await this.dashboard.familyIdentity(userId);
    if (!identity) HttpError.notFound("Family dashboard not found");

    const { firstMonth } = monthWindow();
    const [summary, trendRows, statusRows, recentOrders, recentSponsorContributions] = await Promise.all([
      this.dashboard.familySummary(identity.familyProfileId),
      this.dashboard.familyOrderTrend(identity.familyProfileId, firstMonth),
      this.dashboard.familyOrderStatuses(identity.familyProfileId),
      this.dashboard.familyRecentOrders(identity.familyProfileId),
      this.dashboard.familyRecentSponsorContributions(identity.familyProfileId),
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
      recentSponsorContributions: recentSponsorContributions.map((contribution) => ({
        ...contribution,
        name: contribution.name || "Sponsor",
        amountMinor: numberValue(contribution.amountMinor),
      })),
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
          familyReference: sponsorFamilyReference(row.familyProfileId),
          familyName: row.familyName || "Supported family",
          image: row.image ?? null,
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

function casablancaClock(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    timeZone: "Africa/Casablanca",
    year: "numeric",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00";
  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    minute: Number(value("hour")) * 60 + Number(value("minute")),
  };
}

function isDeliveryDelayed(
  delivery: {
    attemptStatus: string;
    selectedDate: string;
    windowEndMinute: number | null;
  },
  clock: { date: string; minute: number },
) {
  if (["delivered", "failed", "cancelled"].includes(delivery.attemptStatus)) {
    return false;
  }
  if (delivery.selectedDate < clock.date) return true;
  return delivery.selectedDate === clock.date &&
    delivery.windowEndMinute != null &&
    delivery.windowEndMinute < clock.minute;
}
