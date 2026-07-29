import type { OffsetPagination } from "@/lib/pagination";

export type OrderStatus =
  | "pending"
  | "approved"
  | "in_preparation"
  | "purchased"
  | "out_for_delivery"
  | "delivered"
  | "rejected"
  | "cancelled";

export interface OrderRecord {
  id: string;
  orderNumber: string;
  familyProfileId: string;
  placementSource: "family_self_service" | "operator_assisted";
  assistanceChannel: "phone" | "in_person" | "home_visit" | "other" | null;
  assistanceNote: string | null;
  status: OrderStatus | string;
  subtotalMinor: number;
  totalMinor: number;
  currency: "MAD" | string;
  guardianLegalNameSnapshot: string;
  familyImage?: string | null;
  articleCount?: number;
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
  deliveryStartedAt: string | null;
  deliveryStartedByUserId: string | null;
  deliveredAt: string | null;
  deliveredByUserId: string | null;
  deliveryConfirmationMethod:
    | "operator_confirmation"
    | "recipient_signature"
    | "photo"
    | null;
  deliveryNote: string | null;
  deliveryProofStoragePath: string | null;
  deliveryProofMediaType: string | null;
  deliveryProofByteSize: number | null;
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
  activePurchase: OrderPurchase | null;
  purchases: Array<{
    purchase: OrderPurchase;
    reversal: OrderPurchaseReversal | null;
  }>;
  requestedTotalMinor: number;
  actualTotalMinor: number | null;
  receiptRecorded: boolean;
  deliveryProofRecorded: boolean;
}

export type OrderListQuery = OffsetPagination;

export interface OrderReasonInput {
  id: string;
  reason: string;
  confirmRecoverableGoods?: boolean;
}

export interface AssistedOrderInput {
  familyProfileId: string;
  items: Array<{ productId: string; quantity: number }>;
  assistanceChannel: "phone" | "in_person" | "home_visit" | "other";
  assistanceNote?: string;
  idempotencyKey: string;
}

export interface EvidenceUpload {
  path: string;
  mediaType: string;
  byteSize: number;
}

export interface RecordPurchaseInput {
  id: string;
  merchantName: string;
  receiptNumber?: string;
  purchasedAt: string;
  actualTotalMinor: number;
  receiptStoragePath: string;
  receiptMediaType: string;
  receiptByteSize: number;
  confirmHigherAmount?: boolean;
  idempotencyKey: string;
}

export interface ReplacePurchaseInput extends RecordPurchaseInput {
  reason: string;
}

export interface ConfirmDeliveryInput {
  id: string;
  confirmationMethod:
    | "operator_confirmation"
    | "recipient_signature"
    | "photo";
  deliveryNote?: string;
  proofStoragePath?: string;
  proofMediaType?: string;
  proofByteSize?: number;
  idempotencyKey: string;
}

export interface OrderPurchase {
  id: string;
  orderId: string;
  merchantName: string;
  receiptNumber: string | null;
  purchasedAt: string;
  actualTotalMinor: number;
  currency: "MAD" | string;
  receiptStoragePath: string;
  receiptMediaType: string;
  receiptByteSize: number;
  recordedByUserId: string;
  replacesPurchaseId: string | null;
  createdAt: string;
}

export interface OrderPurchaseReversal {
  id: string;
  purchaseId: string;
  reason: string;
  reversedByUserId: string;
  createdAt: string;
}
