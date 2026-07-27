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
  requestedTotalMinor: number;
  actualTotalMinor: number | null;
  differenceMinor: number | null;
  merchantName: string | null;
  purchasedAt: string | null;
  receiptRecorded: boolean;
  deliveryStartedAt: string | null;
  deliveredAt: string | null;
  deliveryProofRecorded: boolean;
  assisted: boolean;
  currency: "MAD" | string;
  createdAt: string;
  updatedAt: string;
  cancellationReason: string | null;
}

export interface FamilyOrderItem {
  id: string;
  productNameSnapshot: string;
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
  items: FamilyOrderItem[];
  statusEvents: FamilyOrderStatusEvent[];
}

export type FamilyOrderQuery = OffsetPagination;
