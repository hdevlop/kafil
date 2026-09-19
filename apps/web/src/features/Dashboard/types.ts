export interface DashboardStatusCount {
  status: string;
  count: number;
}

export type DeliveryDashboardCategory =
  | "pending"
  | "delivered"
  | "needs_attention";

/**
 * Lifecycle presentation for the assigned worker. Independent of
 * `DeliveryDashboardCategory`, which carries operational warnings.
 */
export type DeliveryWorkflowState =
  | "waiting_approval"
  | "purchase_required"
  | "ready_for_delivery"
  | "out_for_delivery"
  | "delivered"
  | "needs_operator_action";

export interface DeliveryDashboardItem {
  attemptId: string;
  orderId: string;
  orderNumber: string;
  familyProfileId: string;
  familyName: string;
  familyImage: string | null;
  category: DeliveryDashboardCategory;
  attemptStatus: "assigned" | "in_progress" | "failed" | "delivered";
  orderStatus: string;
  workflowState: DeliveryWorkflowState;
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
  canPurchase: boolean;
  canStart: boolean;
  canConfirm: boolean;
  canReportIssue: boolean;
}

export interface DeliveryOrderItem {
  id: string;
  productId: string;
  productNameSnapshot: string;
  skuSnapshot: string;
  imageUrl: string | null;
  quantity: number;
  unitPriceMinor: number;
  lineTotalMinor: number;
}

/** The Delivery-safe order projection behind the assigned worker's sheet. */
export interface DeliveryOrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  currency: string;
  requestedTotalMinor: number;
  actualTotalMinor: number | null;
  receiptRecorded: boolean;
  familyName: string;
  familyImage: string | null;
  deliveryAddressSnapshot: string;
  deliveryPhoneSnapshot: string | null;
  coordinates: { latitude: number; longitude: number } | null;
  items: DeliveryOrderItem[];
  attempt: {
    id: string;
    status: "assigned" | "in_progress" | "failed" | "delivered" | "cancelled";
    scheduledDate: string | null;
    windowStartMinute: number | null;
    windowEndMinute: number | null;
    packageCount: number | null;
  };
  openIssues: Array<{
    id: string;
    kind: "address_confirmation" | "family_unreachable" | "missing_proof";
    note: string | null;
  }>;
  workflowState: DeliveryWorkflowState;
  canPurchase: boolean;
  canStart: boolean;
  canConfirm: boolean;
  canReportIssue: boolean;
}

export interface DeliveryDashboardData {
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
