import type { DashboardStatusCount } from "@/features/Dashboard/types";

import type { FamilyFundingProgress } from "@/types/funding";

export interface SupportedFamilyEntry {
  assignmentId: string;
  supportReference: string;
  activeChildCount: number;
  startedAt: string;
  funding: FamilyFundingProgress | null;
}

export interface RecentContributionEntry {
  id: string;
  status: string;
  amountMinor: number;
  submittedAt: string;
}

export interface RecentSupportedOrderEntry {
  id: string;
  orderNumber: string;
  status: string;
  totalMinor: number;
  placedAt: string;
  itemCount: number;
}

export interface UpcomingContributionEntry {
  planId: string;
  amountMinor: number;
  dueAt: string;
  supportReference: string;
}

export interface SponsorDashboardData {
  displayName: string;
  memberSince: string;
  counts: {
    activeSupportedFamilies: number;
    activePlans: number;
    pendingContributions: number;
    supportedOrders: number;
  };
  money: {
    validatedContributionMinor: number;
    pendingContributionMinor: number;
    supportedAvailableMinor: number;
    supportedReservedMinor: number;
    supportedSpentMinor: number;
  };
  nextPlannedContribution: {
    planId: string;
    amountMinor: number;
    dueAt: string;
  } | null;
  supportedFamilies: SupportedFamilyEntry[];
  contributionTrend: Array<{ month: string; validatedMinor: number; pendingMinor: number }>;
  contributionStatuses: DashboardStatusCount[];
  recentContributions: RecentContributionEntry[];
  recentSupportedOrders: RecentSupportedOrderEntry[];
  upcomingContributions: UpcomingContributionEntry[];
}
