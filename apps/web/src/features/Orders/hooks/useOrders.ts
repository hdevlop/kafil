"use client";

import { useEntityCommand } from "@/hooks/useEntityCommand";
import { useEntityQuery } from "@/hooks/useEntityQuery";
import {
  approveOrder,
  assignOrderDelivery,
  cancelOrder,
  confirmOrderDelivery,
  createAssistedOrder,
  deleteOrder,
  deliverOrder,
  failOrderDelivery,
  getOrder,
  listOrders,
  recordOrderPurchase,
  reassignOrderDelivery,
  rejectOrder,
  replaceOrderPurchase,
  startOrderDelivery,
} from "@/services/orderApi";
import {
  listStaffDeliveryOptions,
  listStaffOperatorOptions,
} from "@/services/staffApi";

import { orderKeys } from "./orderKeys";
import type { OrderDetail, OrderListQuery, OrderRecord } from "../types";
import type { EntityQueryOptions } from "@/hooks/useEntityQuery";
import { useKafilLanguage } from "@/i18n/useKafilLanguage";

export function useOrders(
  query: OrderListQuery,
  options: Partial<EntityQueryOptions<OrderRecord[]>> = {},
) {
  return useEntityQuery<OrderRecord[]>({
    queryKey: orderKeys.list(query),
    queryFn: async () => (await listOrders(query)).rows,
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

export function useDeliveryStaffOptions(
  options: Partial<EntityQueryOptions<Awaited<ReturnType<typeof listStaffDeliveryOptions>>>> = {},
) {
  return useEntityQuery({
    queryKey: ["staff", "delivery-options"],
    queryFn: listStaffDeliveryOptions,
    ...options,
  });
}

export function useOperatorStaffOptions(
  options: Partial<EntityQueryOptions<Awaited<ReturnType<typeof listStaffOperatorOptions>>>> = {},
) {
  return useEntityQuery({
    queryKey: ["staff", "operator-options"],
    queryFn: listStaffOperatorOptions,
    ...options,
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
  const assignDelivery = useEntityCommand({
    mutationFn: assignOrderDelivery,
    invalidate,
    successMessage: "Delivery staff assigned.",
    errorMessage: "Could not assign delivery staff.",
  });
  const reassignDelivery = useEntityCommand({
    mutationFn: reassignOrderDelivery,
    invalidate,
    successMessage: "Delivery staff changed.",
    errorMessage: "Could not change delivery staff.",
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
  const failDelivery = useEntityCommand({
    mutationFn: failOrderDelivery,
    invalidate,
    successMessage: "Delivery failure recorded. The order can be reassigned.",
    errorMessage: "Could not record the delivery failure.",
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
    assignDelivery,
    reassignDelivery,
    startDelivery,
    confirmDelivery,
    failDelivery,
    deliver,
    cancel,
    remove,
  };
}
