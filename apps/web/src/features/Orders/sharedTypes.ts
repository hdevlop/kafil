export interface ManagementDeliverySummary {
  name: string;
  status: string;
}

export interface SharedOrderRecord {
  id: string;
  orderNumber: string;
  status: string;
  totalMinor: number;
  actualTotalMinor?: number | null;
  articleCount: number;
  placedAt: string;
  dominantCategoryName?: string | null;
  dominantCategoryImage?: string | null;
  deliveryName?: string | null;
  deliveryStatus?: string | null;
  guardianLegalNameSnapshot?: string;
  familyImage?: string | null;
  deliveryPhoneSnapshot?: string | null;
  deliveryAddressSnapshot?: string;
  assistanceNote?: string | null;
  currentDelivery?: ManagementDeliverySummary | null;
  latestDelivery?: ManagementDeliverySummary | null;
  supportReference?: string;
  canCancelOwn?: boolean;
  items?: Array<{
    productName: string;
    sku: string;
    quantity: number;
    unitPriceMinor: number;
    lineTotalMinor: number;
  }>;
  placementSource?: string;
  familyProfileId?: string;
}