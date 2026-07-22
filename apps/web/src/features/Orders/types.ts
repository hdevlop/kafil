import type { OffsetPagination } from "@/lib/pagination";

export type OrderStatus =
  | "pending"
  | "approved"
  | "in_preparation"
  | "delivered"
  | "rejected"
  | "cancelled";

export interface OrderRecord {
  id: string;
  orderNumber: string;
  familyProfileId: string;
  status: OrderStatus | string;
  subtotalMinor: number;
  totalMinor: number;
  currency: "MAD" | string;
  guardianLegalNameSnapshot: string;
  deliveryAddressSnapshot: string;
  deliveryPhoneSnapshot: string | null;
  placedByUserId: string;
  approvedByUserId: string | null;
  approvedAt: string | null;
  rejectedByUserId: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  cancelledByUserId: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  preparationStartedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  productNameSnapshot: string;
  skuSnapshot: string;
  unitPriceMinor: number;
  quantity: number;
  lineTotalMinor: number;
  createdAt: string;
}

export interface OrderStatusEvent {
  id: string;
  orderId: string;
  fromStatus: OrderStatus | string | null;
  toStatus: OrderStatus | string;
  actorUserId: string;
  reason: string | null;
  createdAt: string;
}

export interface OrderDetail extends OrderRecord {
  items: OrderItem[];
  statusEvents: OrderStatusEvent[];
}

export type OrderListQuery = OffsetPagination;

export interface OrderReasonInput {
  id: string;
  reason: string;
}
