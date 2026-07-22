"use client";

import { useEntityCommand } from "@/hooks/useEntityCommand";
import { useEntityQuery } from "@/hooks/useEntityQuery";
import {
  approveOrder,
  cancelOrder,
  deliverOrder,
  getOrder,
  listOrders,
  rejectOrder,
  startOrderPreparation,
} from "@/services/orderApi";

import { orderKeys } from "./orderKeys";
import type { OrderListQuery } from "../types";

export function useOrders(query: OrderListQuery) {
  return useEntityQuery({
    queryKey: orderKeys.list(query),
    queryFn: () => listOrders(query),
  });
}

export function useOrder(id: string) {
  return useEntityQuery({
    queryKey: orderKeys.detail(id),
    queryFn: () => getOrder(id),
    enabled: Boolean(id),
  });
}

export function useOrderCommands() {
  const invalidate = [orderKeys.all];

  const approve = useEntityCommand({
    mutationFn: approveOrder,
    invalidate,
    successMessage: "Order approved and reservations captured.",
    errorMessage: "Could not approve this order.",
  });
  const reject = useEntityCommand({
    mutationFn: rejectOrder,
    invalidate,
    successMessage: "Order rejected and reservations released.",
    errorMessage: "Could not reject this order.",
  });
  const preparation = useEntityCommand({
    mutationFn: startOrderPreparation,
    invalidate,
    successMessage: "Order preparation started.",
    errorMessage: "Could not start order preparation.",
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
    successMessage: "Order cancelled and its effects reversed.",
    errorMessage: "Could not cancel this order.",
  });

  return { approve, reject, preparation, deliver, cancel };
}
