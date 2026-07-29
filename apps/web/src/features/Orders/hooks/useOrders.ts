"use client";

import { useEntityCommand } from "@/hooks/useEntityCommand";
import { useEntityQuery } from "@/hooks/useEntityQuery";
import {
  approveOrder,
  cancelOrder,
  confirmOrderDelivery,
  createAssistedOrder,
  deleteOrder,
  deliverOrder,
  getOrder,
  listOrders,
  recordOrderPurchase,
  rejectOrder,
  replaceOrderPurchase,
  startOrderDelivery,
} from "@/services/orderApi";

import { orderKeys } from "./orderKeys";
import type { OrderDetail, OrderListQuery, OrderRecord } from "../types";
import type { EntityQueryOptions } from "@/hooks/useEntityQuery";
import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";

export function useOrders(
  query: OrderListQuery,
  options: Partial<EntityQueryOptions<OrderRecord[]>> = {},
) {
  return useEntityQuery<OrderRecord[]>({
    queryKey: orderKeys.list(query),
    queryFn: () => listOrders(query),
    ...options,
  });
}

export function useOrder(id: string) {
  return useEntityQuery<OrderDetail>({
    queryKey: orderKeys.detail(id),
    queryFn: () => getOrder(id),
    enabled: Boolean(id),
  });
}

export function useOrderCommands() {
  const { t } = useKafilLanguage();
  const invalidate = [orderKeys.all];

  const approve = useEntityCommand({
    mutationFn: approveOrder,
    invalidate,
    successMessage: "Order approved. The estimated budget remains reserved.",
    errorMessage: "Could not approve this order.",
  });
  const reject = useEntityCommand({
    mutationFn: rejectOrder,
    invalidate,
    successMessage: "Order rejected and budget released.",
    errorMessage: "Could not reject this order.",
  });
  const assisted = useEntityCommand({
    mutationFn: createAssistedOrder,
    invalidate,
    successMessage: "Assisted family order created and budget reserved.",
    errorMessage: "Could not create the assisted family order.",
  });
  const purchase = useEntityCommand({
    mutationFn: recordOrderPurchase,
    invalidate,
    successMessage: "Purchase recorded and actual cost settled.",
    errorMessage: "Could not record this purchase.",
  });
  const replacePurchase = useEntityCommand({
    mutationFn: replaceOrderPurchase,
    invalidate,
    successMessage: "Purchase replaced and budget difference settled.",
    errorMessage: "Could not replace this purchase.",
  });
  const startDelivery = useEntityCommand({
    mutationFn: startOrderDelivery,
    invalidate,
    successMessage: "Order is out for delivery.",
    errorMessage: "Could not start delivery.",
  });
  const confirmDelivery = useEntityCommand({
    mutationFn: confirmOrderDelivery,
    invalidate,
    successMessage: "Delivery confirmed.",
    errorMessage: "Could not confirm delivery.",
  });
  const deliver = useEntityCommand({
    mutationFn: deliverOrder,
    invalidate,
    successMessage: "Order marked as delivered.",
    errorMessage: "Could not mark this order as delivered.",
  });
  const cancel = useEntityCommand({
    mutationFn: cancelOrder,
    invalidate,
    successMessage: "Order cancelled and its financial effects reversed.",
    errorMessage: "Could not cancel this order.",
  });
  const remove = useEntityCommand({
    mutationFn: deleteOrder,
    invalidate,
    successMessage: t("operator.orders.deleteSuccess"),
    errorMessage: t("operator.orders.deleteError"),
  });

  return {
    approve,
    assisted,
    reject,
    purchase,
    replacePurchase,
    startDelivery,
    confirmDelivery,
    deliver,
    cancel,
    remove,
  };
}
