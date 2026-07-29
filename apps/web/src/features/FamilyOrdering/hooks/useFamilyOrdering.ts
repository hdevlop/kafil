"use client";

import { useEntityCommand } from "@/hooks/useEntityCommand";
import { useEntityQuery } from "@/hooks/useEntityQuery";
import {
  addFamilyCartItem,
  cancelFamilyOrder,
  clearFamilyCart,
  getFamilyCart,
  getFamilyOrder,
  listFamilyOrders,
  removeFamilyCartItem,
  setFamilyCartItemQuantity,
  submitFamilyOrder,
} from "@/services/familyOrderingApi";

import { familyOrderingKeys } from "./familyOrderingKeys";
import type { FamilyCart, FamilyOrder, FamilyOrderQuery } from "../types";
import type { EntityQueryOptions } from "@/hooks/useEntityQuery";

export function useFamilyCart(options: Partial<EntityQueryOptions<FamilyCart>> = {}) {
  return useEntityQuery<FamilyCart>({
    queryKey: familyOrderingKeys.cart,
    queryFn: getFamilyCart,
    ...options,
  });
}

export function useFamilyOrders(
  query: FamilyOrderQuery,
  options: Partial<EntityQueryOptions<FamilyOrder[]>> = {},
) {
  return useEntityQuery<FamilyOrder[]>({
    queryKey: familyOrderingKeys.orders(query),
    queryFn: () => listFamilyOrders(query),
    ...options,
  });
}

export function useFamilyOrder(id: string) {
  return useEntityQuery<Awaited<ReturnType<typeof getFamilyOrder>>>({
    queryKey: familyOrderingKeys.order(id),
    queryFn: () => getFamilyOrder(id),
    enabled: Boolean(id),
  });
}

export function useFamilyOrderingCommands() {
  const invalidate = [familyOrderingKeys.all];
  const add = useEntityCommand({ mutationFn: addFamilyCartItem, invalidate, successMessage: "Added to your cart.", errorMessage: "Could not add this item to your cart." });
  const setQuantity = useEntityCommand({ mutationFn: setFamilyCartItemQuantity, invalidate, successMessage: "Cart quantity updated.", errorMessage: "Could not update this cart quantity." });
  const remove = useEntityCommand({ mutationFn: removeFamilyCartItem, invalidate, successMessage: "Item removed from your cart.", errorMessage: "Could not remove this cart item." });
  const clear = useEntityCommand({ mutationFn: clearFamilyCart, invalidate, successMessage: "Cart cleared.", errorMessage: "Could not clear your cart." });
  const submit = useEntityCommand({ mutationFn: submitFamilyOrder, invalidate, successMessage: "Order submitted for review.", errorMessage: "Could not submit your order." });
  const cancel = useEntityCommand({ mutationFn: cancelFamilyOrder, invalidate, successMessage: "Pending order cancelled.", errorMessage: "Could not cancel this order." });

  return { add, setQuantity, remove, clear, submit, cancel };
}
