import type { OffsetPagination } from "@/lib/pagination";

export type FamilyOrderStatus = "pending" | "approved" | "in_preparation" | "delivered" | "rejected" | "cancelled";

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
