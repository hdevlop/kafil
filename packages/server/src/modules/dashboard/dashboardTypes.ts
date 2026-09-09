export interface DashboardStatusCount {
  status: string;
  count: number;
}

export type DeliveryDashboardCategory =
  | "pending"
  | "delivered"
  | "needs_attention";

export interface DeliveryDashboardItem {
  attemptId: string;
  orderId: string;
  orderNumber: string;
  familyProfileId: string;
  familyName: string;
  familyImage: string | null;
  category: DeliveryDashboardCategory;
  attemptStatus: "assigned" | "in_progress" | "failed" | "delivered";
  address: string;
  phone: string | null;
  coordinates: { latitude: number; longitude: number } | null;
  scheduledDate: string;
  windowStartMinute: number | null;
  windowEndMinute: number | null;
  packageCount: number;
  delayed: boolean;
  openIssues: Array<{
    id: string;
    kind: "address_confirmation" | "family_unreachable" | "missing_proof";
    note: string | null;
  }>;
  canStart: boolean;
  canConfirm: boolean;
  canReportIssue: boolean;
}

export interface DeliveryDashboard {
  selectedDate: string;
  timezone: "Africa/Casablanca";
  counts: {
    assigned: number;
    pending: number;
    delivered: number;
    needsAttention: number;
    families: number;
    packagesRemaining: number;
  };
  issueCounts: {
    addressToConfirm: number;
    familyUnreachable: number;
    missingProof: number;
    delayed: number;
  };
  deliveries: DeliveryDashboardItem[];
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
  contributionTrend: OperatorContributionTrendPoint[];
  orderStatuses: DashboardStatusCount[];
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    familyName: string;
    familyImage: string | null;
    status: string;
    totalMinor: number;
    placedAt: Date;
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
    submittedAt: Date;
    paidAt: Date | null;
  }>;
}

export interface SponsorDashboard {
  displayName: string;
  memberSince: string;
  counts: SponsorCounts;
  money: SponsorMoney;
  nextPlannedContribution: NextPlannedContribution | null;
  supportedFamilies: SupportedFamilyProjection[];
  contributionTrend: ContributionTrendPoint[];
  contributionStatuses: DashboardStatusCount[];
  recentContributions: RecentContributionProjection[];
  recentSupportedOrders: RecentOrderProjection[];
  upcomingContributions: UpcomingContributionProjection[];
}

export interface SponsorMetrics {
  counts: SponsorCounts;
  money: SponsorMoney;
  nextPlannedContribution: NextPlannedContribution | null;
  contributionTrend: ContributionTrendPoint[];
  contributionStatuses: DashboardStatusCount[];
  recentContributions: RecentContributionProjection[];
  recentSupportedOrders: RecentOrderProjection[];
  upcomingContributions: UpcomingContributionProjection[];
}

export interface SponsorCounts {
  activeSupportedFamilies: number;
  activePlans: number;
  pendingContributions: number;
  supportedOrders: number;
}

export interface SponsorMoney {
  validatedContributionMinor: number;
  pendingContributionMinor: number;
  supportedAvailableMinor: number;
  supportedReservedMinor: number;
  supportedSpentMinor: number;
}

export interface NextPlannedContribution {
  planId: string;
  amountMinor: number;
  dueAt: string;
}

export interface SupportedFamilyProjection {
  familyReference: string;
  familyName: string;
  image: string | null;
  activeChildCount: number;
  startedAt: Date;
  funding: {
    targetMinor: number;
    fundedMinor: number;
    remainingMinor: number;
    status: string;
    activatedAt: string | null;
  } | null;
}

export interface ContributionTrendPoint {
  month: string;
  validatedMinor: number;
  pendingMinor: number;
}

export interface RecentContributionProjection {
  id: string;
  status: string;
  amountMinor: number;
  submittedAt: Date;
}

export interface RecentOrderProjection {
  id: string;
  orderNumber: string;
  status: string;
  totalMinor: number;
  placedAt: Date;
  itemCount: number;
}

export interface UpcomingContributionProjection {
  planId: string;
  amountMinor: number;
  dueAt: Date;
  supportReference: string;
}

export interface SponsorProfileProjection {
  id: string;
  name: string;
  email: string;
  image: string | null;
  status: string;
  phone: string | null;
  cin: string | null;
  gender: "F" | "M" | null;
  address: string | null;
  dateOfBirth: string | null;
  notes: string | null;
  createdAt: Date;
}

export interface OperatorSponsorOverview {
  sponsor: SponsorProfileProjection;
  metrics: SponsorMetrics;
}
