import type {
  FamilyCart,
  FamilyOrder,
  FamilyOrderDetail,
  FamilyOrderQuery,
} from "@/features/FamilyOrdering/types";
import { api } from "@/services/http";

export function getFamilyCart() {
  return api.get<FamilyCart>("/orders/cart");
}

export function addFamilyCartItem(input: { productId: string; quantity: number }) {
  return api.post<FamilyCart>("/orders/cart/items", input);
}

export function setFamilyCartItemQuantity(input: { productId: string; quantity: number }) {
  return api.put<FamilyCart>(`/orders/cart/items/${input.productId}`, { quantity: input.quantity });
}

export function removeFamilyCartItem(productId: string) {
  return api.delete<FamilyCart>(`/orders/cart/items/${productId}`);
}

export function clearFamilyCart() {
  return api.post<FamilyCart>("/orders/cart/clear");
}

export function submitFamilyOrder(idempotencyKey: string) {
  return api.post<FamilyOrderDetail>("/orders/submit", { idempotencyKey });
}

export function listFamilyOrders(query: FamilyOrderQuery) {
  return api.get<FamilyOrder[]>("/orders/me", {
    query: { limit: query.limit, offset: query.offset },
  });
}

export function getFamilyOrder(id: string) {
  return api.get<FamilyOrderDetail>(`/orders/me/${id}`);
}

export function cancelFamilyOrder(input: { id: string; reason?: string }) {
  return api.post<FamilyOrderDetail>(`/orders/me/${input.id}/cancel`, { reason: input.reason });
}
