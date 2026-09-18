"use client";

import { deliveryOrderKeys } from "@/features/Orders/hooks/deliveryOrderKeys";
import { useEntityQuery } from "najm-kit/query";
import { getOwnDeliveryOrder } from "@/services/orderApi";

import type { DeliveryOrderDetail } from "../../types";

/** Fetched only while the assigned worker's sheet is open. */
export function useDeliveryOrder(orderId: string | null) {
  return useEntityQuery<DeliveryOrderDetail>({
    queryKey: deliveryOrderKeys.detail(orderId ?? "none"),
    queryFn: () => getOwnDeliveryOrder(orderId!),
    enabled: Boolean(orderId),
  });
}
