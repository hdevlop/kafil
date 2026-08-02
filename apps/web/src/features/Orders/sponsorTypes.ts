import type { OffsetPagination } from "@/lib/pagination";

export interface SponsorSupportedOrder {
  id: string;
  orderNumber: string;
  status: string;
  totalMinor: number;
  actualTotalMinor: number | null;
  merchantName: string | null;
  purchasedAt: string | null;
  receiptRecorded: boolean;
  deliveryProofRecorded: boolean;
  currency: string;
  placedAt: string;
  approvedAt: string | null;
  preparationStartedAt: string | null;
  deliveryStartedAt: string | null;
  deliveredAt: string | null;
  deliveryName: string | null;
  deliveryStatus: "assigned" | "in_progress" | "failed" | "delivered" | "cancelled" | null;
  dominantCategoryName: string | null;
  dominantCategoryImage: string | null;
  items: Array<{
    productName: string;
    sku: string;
    quantity: number;
    unitPriceMinor: number;
    lineTotalMinor: number;
  }>;
}

export type SponsorOrderQuery = OffsetPagination;
