import type {
  AssistedOrderInput,
  AssignDeliveryInput,
  ConfirmDeliveryInput,
  EvidenceUpload,
  FailDeliveryInput,
  OrderDetail,
  OrderListQuery,
  OrderReasonInput,
  OrderRecord,
  RecordPurchaseInput,
  ReassignDeliveryInput,
  ReplacePurchaseInput,
  StartDeliveryInput,
} from "@/features/Orders/types";
import type { DeliveryOrderDetail } from "@/features/Dashboard/types";
import { api } from "@/services/http";

export function listOrders(query: OrderListQuery) {
  return api.getPage<OrderRecord>("/orders", {
    query: {
      limit: query.limit,
      offset: query.offset,
      search: query.search,
      status: query.status,
    },
  });
}

export function getOrder(id: string) {
  return api.get<OrderDetail>(`/orders/${id}`);
}

export function deleteOrder(id: string) {
  return api.delete<OrderRecord>(`/orders/${id}`);
}

export function approveOrder(id: string) {
  return api.post<OrderDetail>(`/orders/${id}/approve`);
}

export function createAssistedOrder(input: AssistedOrderInput) {
  return api.post<OrderDetail>("/orders/assisted", input);
}

export function recordOrderPurchase({ id, ...input }: RecordPurchaseInput) {
  return api.post<OrderDetail>(`/orders/${id}/purchase`, input);
}

export function replaceOrderPurchase({ id, ...input }: ReplacePurchaseInput) {
  return api.post<OrderDetail>(`/orders/${id}/purchase/replace`, input);
}

export function assignOrderDelivery({ id, ...input }: AssignDeliveryInput) {
  return api.post<OrderDetail>(`/orders/${id}/delivery/assign`, input);
}

export function reassignOrderDelivery({ id, ...input }: ReassignDeliveryInput) {
  return api.post<OrderDetail>(`/orders/${id}/delivery/reassign`, input);
}

export function startOrderDelivery({ id, ...input }: StartDeliveryInput) {
  return api.post<OrderDetail>(`/orders/${id}/delivery/start`, input);
}

export function failOrderDelivery({ id, ...input }: FailDeliveryInput) {
  return api.post<OrderDetail>(`/orders/${id}/delivery/fail`, input);
}

export function confirmOrderDelivery({ id, ...input }: ConfirmDeliveryInput) {
  return api.post<OrderDetail>(`/orders/${id}/delivery/confirm`, input);
}

export function startOwnOrderDelivery({ id, ...input }: StartDeliveryInput) {
  return api.post<DeliveryOrderDetail>(`/orders/${id}/delivery/me/start`, input);
}

export function confirmOwnOrderDelivery({ id, ...input }: ConfirmDeliveryInput) {
  return api.post<DeliveryOrderDetail>(`/orders/${id}/delivery/me/confirm`, input);
}

export function reportOwnOrderDeliveryIssue(input: {
  id: string;
  attemptId: string;
  kind: "address_confirmation" | "family_unreachable" | "missing_proof";
  note?: string;
  idempotencyKey: string;
}) {
  const { id, ...body } = input;
  return api.post(`/orders/${id}/delivery/me/issues`, body);
}

export function getOwnDeliveryOrder(id: string) {
  return api.get<DeliveryOrderDetail>(`/orders/${id}/delivery/me`);
}

export function recordOwnOrderPurchase({ id, ...input }: RecordPurchaseInput) {
  return api.post<DeliveryOrderDetail>(`/orders/${id}/purchase/me`, input);
}

const EVIDENCE_EXTENSIONS: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function evidenceFileName(file: File) {
  const extension = EVIDENCE_EXTENSIONS[file.type];
  if (!extension) throw new Error("Unsupported evidence file type.");
  return `${crypto.randomUUID()}.${extension}`;
}

export function uploadOrderEvidence(
  kind: "deliveries" | "receipts",
  file: File,
) {
  return api.upload<EvidenceUpload>(
    `/order-evidence/${kind}/${evidenceFileName(file)}`,
    file,
  );
}

/**
 * The one managed form a receipt reference may take. Anything else -- an
 * absolute URL, `..`, another evidence kind, a maintenance route, a malformed
 * id, an extension the storage layer does not serve -- is refused before it
 * can reach the transport.
 */
const RECEIPT_REFERENCE =
  /^\/api\/order-evidence\/receipts\/serve\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpeg|jpg|pdf|png|webp)$/i;

/** Normalizes and validates the server-provided receipt reference. */
export function receiptViewPath(reference: string) {
  if (!RECEIPT_REFERENCE.test(reference)) {
    throw new Error("Unsupported receipt reference.");
  }
  return reference;
}

/**
 * Read one purchase receipt as bytes for Operator/Admin preview.
 *
 * The reference is already same-origin and `/api`-prefixed, so it goes to the
 * binary helper unchanged -- prefixing it again would produce `/api/api/...`.
 */
export function viewOrderReceipt(reference: string) {
  return api.getFile(receiptViewPath(reference));
}

export function deleteOrderEvidenceCandidate(path: string) {
  const relative = path.replace("/api/order-evidence/", "/order-evidence/");
  return api.deleteFile(relative.replace("/serve/", "/"));
}

/**
 * The assigned Delivery worker stages its receipt through the narrow own-
 * candidate routes. Serving, delivery proofs, and maintenance stay operator-only.
 */
export function uploadOwnOrderReceipt(file: File) {
  return api.upload<EvidenceUpload>(
    `/order-evidence/me/receipts/${evidenceFileName(file)}`,
    file,
  );
}

export function deleteOwnOrderReceiptCandidate(path: string) {
  const fileName = path.split("/").pop();
  if (!fileName) throw new Error("Unsupported evidence reference.");
  return api.deleteFile(`/order-evidence/me/receipts/${fileName}`);
}

export function rejectOrder({ id, reason }: OrderReasonInput) {
  return api.post<OrderDetail>(`/orders/${id}/reject`, { reason });
}

export function deliverOrder(id: string) {
  return api.post<OrderDetail>(`/orders/${id}/deliver`);
}

export function cancelOrder({
  id,
  reason,
  confirmRecoverableGoods,
}: OrderReasonInput) {
  return api.post<OrderDetail>(`/orders/${id}/cancel`, {
    reason,
    confirmRecoverableGoods,
  });
}
