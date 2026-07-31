import type { OrderRecord, OrderStatus } from "../types";

export type OrderCommand =
  | "approve"
  | "reject"
  | "purchase"
  | "replacePurchase"
  | "viewDelivery"
  | "assignDelivery"
  | "reassignDelivery"
  | "startDelivery"
  | "failDelivery"
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
};

export function getOrderActions(
  input: string | Pick<OrderRecord, "status" | "currentDelivery" | "latestDelivery">,
): OrderAction[] {
  const status = typeof input === "string" ? input : input.status;
  if (typeof input === "string") {
    return actionsByStatus[status as OrderStatus] ?? [];
  }
  if (status === "pending" || status === "approved" || status === "purchased") {
    const deliveryActions: OrderAction[] = input.currentDelivery
      ? [
          {
            command: "viewDelivery",
            label: "operator.orders.viewDelivery",
            requiresReason: false,
          },
          ...(status === "purchased"
            ? [{
                command: "startDelivery" as const,
                label: "common.startDelivery",
                requiresReason: false,
              }]
            : []),
          {
            command: "reassignDelivery",
            label: "operator.orders.changeDeliveryStaff",
            requiresReason: true,
          },
        ]
      : [
          ...(input.latestDelivery
            ? [{
                command: "viewDelivery" as const,
                label: "operator.orders.viewDelivery",
                requiresReason: false,
              }]
            : []),
          {
            command: "assignDelivery",
            label: "operator.orders.assignDelivery",
            requiresReason: false,
          },
        ];
    return [
      ...deliveryActions,
      ...(actionsByStatus[status as "pending" | "approved" | "purchased"] ?? []),
    ];
  }
  if (status === "out_for_delivery") {
    return [
      {
        command: "viewDelivery",
        label: "operator.orders.viewDelivery",
        requiresReason: false,
      },
      {
        command: "confirmDelivery",
        label: "common.confirmDelivery",
        requiresReason: false,
      },
      {
        command: "failDelivery",
        label: "operator.orders.deliveryFailed",
        danger: true,
        requiresReason: true,
      },
    ];
  }
  if (status === "delivered") {
    return [{
      command: "viewDelivery",
      label: "operator.orders.viewDeliveryHistory",
      requiresReason: false,
    }];
  }
  return actionsByStatus[status as OrderStatus] ?? [];
}
