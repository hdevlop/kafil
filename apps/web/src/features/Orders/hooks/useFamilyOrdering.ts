"use client";

import { budgetKeys } from "@/features/Budgets/hooks/budgetKeys";
import { familyBudgetKeys } from "@/features/Budgets/hooks/familyBudgetKeys";
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
import { orderKeys } from "./orderKeys";
import type { FamilyCart, FamilyOrder, FamilyOrderQuery } from "../familyTypes";
import type { EntityQueryOptions } from "@/hooks/useEntityQuery";
import { getLocalizedOrderLimitError } from "@/features/Budgets/lib/orderLimitErrors";
import { useTranslation } from "najm-i18n/react";

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
    staleTime: 0,
  });
}

export function useFamilyOrderingCommands() {
  const { t } = useTranslation();
  const invalidate = [familyOrderingKeys.all];
  const invalidateOrders = [
    familyOrderingKeys.all,
    orderKeys.all,
    budgetKeys.all,
    familyBudgetKeys.all,
  ];
  const add = useEntityCommand({ mutationFn: addFamilyCartItem, invalidate, successMessage: "Added to your cart.", errorMessage: "Could not add this item to your cart." });
  const setQuantity = useEntityCommand({ mutationFn: setFamilyCartItemQuantity, invalidate, successMessage: "Cart quantity updated.", errorMessage: "Could not update this cart quantity." });
  const remove = useEntityCommand({ mutationFn: removeFamilyCartItem, invalidate, successMessage: "Item removed from your cart.", errorMessage: "Could not remove this cart item." });
  const clear = useEntityCommand({ mutationFn: clearFamilyCart, invalidate, successMessage: "Cart cleared.", errorMessage: "Could not clear your cart." });
  const submit = useEntityCommand({
    mutationFn: submitFamilyOrder,
    invalidate: invalidateOrders,
    successMessage: "Order submitted for review.",
    errorMessage: (error) =>
      getLocalizedOrderLimitError(
        error,
        (key) => t(key),
        "Could not submit your order.",
      ),
  });
  const cancel = useEntityCommand({ mutationFn: cancelFamilyOrder, invalidate: invalidateOrders, successMessage: "Pending order cancelled.", errorMessage: "Could not cancel this order." });

  return { add, setQuantity, remove, clear, submit, cancel };
}
