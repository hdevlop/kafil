import type { OrderStatus } from "../types";

export type OrderCommand =
  | "approve"
  | "reject"
  | "preparation"
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
    { command: "approve", label: "Approve", requiresReason: false },
    {
      command: "reject",
      label: "Reject",
      danger: true,
      requiresReason: true,
    },
    {
      command: "cancel",
      label: "Cancel",
      danger: true,
      requiresReason: true,
    },
  ],
  approved: [
    {
      command: "preparation",
      label: "Start preparation",
      requiresReason: false,
    },
    {
      command: "cancel",
      label: "Cancel",
      danger: true,
      requiresReason: true,
    },
  ],
  in_preparation: [
    {
      command: "deliver",
      label: "Mark delivered",
      requiresReason: false,
    },
    {
      command: "cancel",
      label: "Cancel",
      danger: true,
      requiresReason: true,
    },
  ],
};

export function getOrderActions(status: string): OrderAction[] {
  return actionsByStatus[status as OrderStatus] ?? [];
}
