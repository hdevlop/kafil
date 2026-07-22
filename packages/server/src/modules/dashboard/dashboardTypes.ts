export interface DashboardStatusCount {
  status: string;
  count: number;
}

export interface OperatorContributionTrendPoint {
  month: string;
  validatedMinor: number;
  refundedMinor: number;
}

export interface OperatorDashboard {
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
    lowStockProducts: number;
  };
  money: {
    pendingContributionMinor: number;
    validatedContributionMinor: number;
    refundedContributionMinor: number;
    availableBudgetMinor: number;
    reservedBudgetMinor: number;
    spentBudgetMinor: number;
  };
  contributionTrend: OperatorContributionTrendPoint[];
  orderStatuses: DashboardStatusCount[];
  lowStock: Array<{
    productId: string;
    name: string;
    sku: string;
    availableQuantity: number;
  }>;
}

export interface FamilyDashboard {
  displayName: string;
  counts: {
    children: number;
    activeChildren: number;
    openOrders: number;
    deliveredOrders: number;
  };
  budget: {
    availableMinor: number;
    reservedMinor: number;
    spentMinor: number;
  };
  orderTrend: Array<{ month: string; spentMinor: number }>;
  orderStatuses: DashboardStatusCount[];
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    totalMinor: number;
    placedAt: Date;
  }>;
}

export interface SponsorDashboard {
  displayName: string;
  counts: {
    activeAssignments: number;
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
  contributionTrend: Array<{
    month: string;
    validatedMinor: number;
    pendingMinor: number;
  }>;
  contributionStatuses: DashboardStatusCount[];
  recentContributions: Array<{
    id: string;
    status: string;
    amountMinor: number;
    submittedAt: Date;
  }>;
}
