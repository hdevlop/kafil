import type { OffsetPagination } from "@/lib/pagination";

export type FamilyOrderStatus =
  | "pending"
  | "approved"
  | "in_preparation"
  | "purchased"
  | "out_for_delivery"
  | "delivered"
  | "rejected"
  | "cancelled";

export interface FamilyCartItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPriceMinor: number;
  lineTotalMinor: number;
  currency: "MAD" | string;
  available: boolean;
}

export interface FamilyCart {
  id: string;
  items: FamilyCartItem[];
  subtotalMinor: number;
  totalMinor: number;
  currency: "MAD" | string;
}

export interface FamilyOrder {
  id: string;
  orderNumber: string;
  status: FamilyOrderStatus | string;
  totalMinor: number;
  articleCount: number;
  requestedTotalMinor: number;
  actualTotalMinor: number | null;
  differenceMinor: number | null;
  merchantName: string | null;
  purchasedAt: string | null;
  receiptRecorded: boolean;
  deliveryStartedAt: string | null;
  deliveryAssigned: boolean;
  deliveryName: string | null;
  deliveredAt: string | null;
  deliveryProofRecorded: boolean;
  assisted: boolean;
  canCancelOwn?: boolean;
  currency: "MAD" | string;
  createdAt: string;
  updatedAt: string;
  cancellationReason: string | null;
  guardianLegalNameSnapshot: string;
  deliveryPhoneSnapshot: string | null;
  deliveryAddressSnapshot: string;
  familyImage: string | null;
  dominantCategoryName: string | null;
  dominantCategoryImage: string | null;
}

export interface FamilyOrderItem {
  id: string;
  productId: string;
  productNameSnapshot: string;
  skuSnapshot: string;
  unitPriceMinor: number;
  quantity: number;
  lineTotalMinor: number;
}

export interface FamilyOrderStatusEvent {
  id: string;
  toStatus: FamilyOrderStatus | string;
  reason: string | null;
  createdAt: string;
}

export interface FamilyOrderDetail extends FamilyOrder {
  delivery: {
    deliveryNameSnapshot: string;
    deliveryPhoneSnapshot: string;
    image: string | null;
    gender: "M" | "F" | null;
    assignedAt: string;
    status: string;
  } | null;
  items: FamilyOrderItem[];
  statusEvents: FamilyOrderStatusEvent[];
}

export type FamilyOrderQuery = OffsetPagination;
