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
import { api } from "@/services/http";

export function listOrders(query: OrderListQuery) {
  return api.get<OrderRecord[]>("/orders", {
    query: { limit: query.limit, offset: query.offset },
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

export function uploadOrderEvidence(
  kind: "deliveries" | "receipts",
  file: File,
) {
  const extensionByType: Record<string, string> = {
    "application/pdf": "pdf",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  const extension = extensionByType[file.type];
  if (!extension) throw new Error("Unsupported evidence file type.");
  const fileName = `${crypto.randomUUID()}.${extension}`;
  return api.upload<EvidenceUpload>(
    `/order-evidence/${kind}/${fileName}`,
    file,
  );
}

export function deleteOrderEvidenceCandidate(path: string) {
  const relative = path.replace("/api/order-evidence/", "/order-evidence/");
  return api.deleteFile(relative.replace("/serve/", "/"));
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
