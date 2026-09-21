import type { OrderStatus } from "./orderSchema";

export const CURRENT_FAMILY_DESTINATION_ORDER_STATUSES = [
  "pending",
  "approved",
  "in_preparation",
  "purchased",
] as const satisfies readonly OrderStatus[];

export function usesCurrentFamilyDeliveryDestination(status: OrderStatus) {
  return (CURRENT_FAMILY_DESTINATION_ORDER_STATUSES as readonly OrderStatus[]).includes(
    status,
  );
}
