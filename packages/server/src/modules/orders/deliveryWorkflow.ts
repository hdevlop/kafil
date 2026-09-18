import type { OrderDeliveryAttempt, OrderStatus } from "./orderSchema";

export type DeliveryWorkflowState =
  | "waiting_approval"
  | "purchase_required"
  | "ready_for_delivery"
  | "out_for_delivery"
  | "delivered"
  | "needs_operator_action";

export interface DeliveryWorkflowInput {
  orderStatus: OrderStatus | string;
  attemptStatus: OrderDeliveryAttempt["status"] | string;
  hasActivePurchase: boolean;
}

export interface DeliveryWorkflowCapabilities {
  canPurchase: boolean;
  canStart: boolean;
  canConfirm: boolean;
  canReportIssue: boolean;
}

/**
 * Lifecycle presentation for the assigned delivery worker. Operational
 * warnings (delayed, open issues) stay a separate signal: an order may be
 * "purchase_required" and flagged "address to confirm" at the same time.
 */
export function deliveryWorkflowState({
  orderStatus,
  attemptStatus,
  hasActivePurchase,
}: DeliveryWorkflowInput): DeliveryWorkflowState {
  if (attemptStatus === "failed" || attemptStatus === "cancelled") {
    return "needs_operator_action";
  }
  if (attemptStatus === "delivered" || orderStatus === "delivered") {
    return "delivered";
  }
  if (attemptStatus === "in_progress" && orderStatus === "out_for_delivery") {
    return "out_for_delivery";
  }
  if (attemptStatus === "assigned") {
    if (orderStatus === "purchased") return "ready_for_delivery";
    if (orderStatus === "approved" && !hasActivePurchase) {
      return "purchase_required";
    }
    if (orderStatus === "pending") return "waiting_approval";
  }
  return "needs_operator_action";
}

export function deliveryWorkflowCapabilities(
  input: DeliveryWorkflowInput,
): DeliveryWorkflowCapabilities {
  const { orderStatus, attemptStatus } = input;
  return {
    canPurchase: deliveryWorkflowState(input) === "purchase_required",
    canStart: attemptStatus === "assigned" && orderStatus === "purchased",
    canConfirm:
      attemptStatus === "in_progress" && orderStatus === "out_for_delivery",
    canReportIssue: attemptStatus !== "delivered",
  };
}
