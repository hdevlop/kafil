import type { OrderStatus } from "../types";

export type OrderCommand =
  | "approve"
  | "reject"
  | "purchase"
  | "replacePurchase"
  | "startDelivery"
  | "confirmDelivery"
  | "deliver"
  | "cancel";

export interface OrderAction {
  command: OrderCommand;
  label: string;
  danger?: boolean;
  requiresReason: boolean;
}

const actionsByStatus: Partial<Record<OrderStatus, OrderAction[]>> = {
  pending: [
    { command: "approve", label: "action.approve", requiresReason: false },
    {
      command: "reject",
      label: "action.reject",
      danger: true,
      requiresReason: true,
    },
    {
      command: "cancel",
      label: "common.cancel",
      danger: true,
      requiresReason: true,
    },
  ],
  approved: [
    {
      command: "purchase",
      label: "common.recordPurchase",
      requiresReason: false,
    },
    {
      command: "cancel",
      label: "common.cancel",
      danger: true,
      requiresReason: true,
    },
  ],
  in_preparation: [
    {
      command: "deliver",
      label: "action.markDelivered",
      requiresReason: false,
    },
    {
      command: "cancel",
      label: "common.cancel",
      danger: true,
      requiresReason: true,
    },
  ],
  purchased: [
    {
      command: "startDelivery",
      label: "common.startDelivery",
      requiresReason: false,
    },
    {
      command: "replacePurchase",
      label: "common.replacePurchase",
      danger: true,
      requiresReason: false,
    },
    {
      command: "cancel",
      label: "action.cancelAndRefund",
      danger: true,
      requiresReason: true,
    },
  ],
  out_for_delivery: [
    {
      command: "confirmDelivery",
      label: "common.confirmDelivery",
      requiresReason: false,
    },
    {
      command: "cancel",
      label: "action.cancelAndRefund",
      danger: true,
      requiresReason: true,
    },
  ],
};

export function getOrderActions(status: string): OrderAction[] {
  return actionsByStatus[status as OrderStatus] ?? [];
}
