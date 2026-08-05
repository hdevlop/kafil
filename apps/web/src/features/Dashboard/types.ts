export interface DashboardStatusCount {
  status: string;
  count: number;
}

export interface OperatorDashboardData {
  counts: {
    families: number;
    activeFamilies: number;
    children: number;
    activeChildren: number;
    sponsors: number;
    activeSponsors: number;
    activeAssignments: number;
    pendingContributions: number;
    openOrders: number;
    pendingApplicants: number;
    familiesWithoutSponsorship: number;
  };
  money: {
    pendingContributionMinor: number;
    validatedContributionMinor: number;
    refundedContributionMinor: number;
    availableBudgetMinor: number;
    reservedBudgetMinor: number;
    spentBudgetMinor: number;
  };
  contributionTrend: Array<{ month: string; validatedMinor: number; refundedMinor: number }>;
  orderStatuses: DashboardStatusCount[];
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    familyName: string;
    familyImage: string | null;
    status: string;
    totalMinor: number;
    placedAt: string;
  }>;
}

export interface FamilyDashboardData {
  displayName: string;
  counts: {
    children: number;
    activeChildren: number;
    openOrders: number;
    deliveredOrders: number;
  };
  budget: { availableMinor: number; reservedMinor: number; spentMinor: number };
  orderTrend: Array<{ month: string; spentMinor: number }>;
  orderStatuses: DashboardStatusCount[];
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    totalMinor: number;
    placedAt: string;
    dominantCategoryName: string | null;
    dominantCategoryImage: string | null;
  }>;
  recentSponsorContributions: Array<{
    id: string;
    name: string;
    image: string | null;
    gender: "F" | "M" | null;
    status: "pending" | "validated" | "rejected" | "refunded" | "expired";
    amountMinor: number;
    submittedAt: string;
    paidAt: string | null;
  }>;
}


export interface LatestOrdersCardProps {
  recentOrders: OperatorDashboardData["recentOrders"];
}

export interface AttentionCardProps {
  orderStatuses: DashboardStatusCount[];
  pendingContributions: number;
  pendingApplicants: number;
  familiesWithoutSponsorship: number;
}