import type {
  OrderDetail,
  OrderListQuery,
  OrderReasonInput,
  OrderRecord,
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

export function approveOrder(id: string) {
  return api.post<OrderDetail>(`/orders/${id}/approve`);
}

export function rejectOrder({ id, reason }: OrderReasonInput) {
  return api.post<OrderDetail>(`/orders/${id}/reject`, { reason });
}

export function startOrderPreparation(id: string) {
  return api.post<OrderDetail>(`/orders/${id}/preparation`);
}

export function deliverOrder(id: string) {
  return api.post<OrderDetail>(`/orders/${id}/deliver`);
}

export function cancelOrder({ id, reason }: OrderReasonInput) {
  return api.post<OrderDetail>(`/orders/${id}/cancel`, { reason });
}
