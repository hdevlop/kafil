"use client";

import { useState } from "react";

import { useKafilRole } from "@/shared/Authorization/useKafilRole";
import { useOrders, useOrderCommands } from "@/features/Orders/hooks/useOrders";
import { useFamilyOrders, useFamilyOrderingCommands } from "@/features/FamilyOrdering/hooks/useFamilyOrdering";
import type { OffsetPagination } from "@/lib/pagination";
import type { OrderRecord } from "@/features/Orders/types";
import type { FamilyOrder } from "@/features/FamilyOrdering/types";

export type OrdersScope = "management" | "family";

export interface OrdersWorkspace {
  scope: OrdersScope;
  orders: OrderRecord[] | FamilyOrder[];
  loading: boolean;
  error: unknown;
  refetch: () => Promise<unknown>;
  pagination: OffsetPagination;
  setPagination: (next: OffsetPagination) => void;
  commands:
    | ReturnType<typeof useOrderCommands>
    | ReturnType<typeof useFamilyOrderingCommands>;
  availableActions: (order: OrderRecord | FamilyOrder) => OrderAction[];
  highlightOrderId: string | null;
}

export type OrderAction =
  | "approve"
  | "reject"
  | "purchase"
  | "replacePurchase"
  | "startDelivery"
  | "confirmDelivery"
  | "deliver"
  | "cancel"
  | "cancel-pending";

export function useOrdersWorkspace(
  pagination: OffsetPagination,
  highlightOrderId: string | null = null,
): OrdersWorkspace {
  const { isExactFamily } = useKafilRole();
  const [internalPagination, setInternalPagination] = useState(pagination);
  const familyOrders = useFamilyOrders(internalPagination, { enabled: isExactFamily });
  const familyCommands = useFamilyOrderingCommands();
  const managementOrders = useOrders(internalPagination, { enabled: !isExactFamily });
  const managementCommands = useOrderCommands();

  if (isExactFamily) {
    return {
      scope: "family",
      orders: familyOrders.data ?? [],
      loading: familyOrders.isPending,
      error: familyOrders.error,
      refetch: familyOrders.refetch,
      pagination: internalPagination,
      setPagination: setInternalPagination,
      commands: familyCommands,
      availableActions: (order) => {
        if ((order as FamilyOrder).status === "pending") {
          return ["cancel-pending"];
        }
        return [];
      },
      highlightOrderId,
    };
  }

  return {
    scope: "management",
    orders: managementOrders.data ?? [],
    loading: managementOrders.isPending,
    error: managementOrders.error,
    refetch: managementOrders.refetch,
    pagination: internalPagination,
    setPagination: setInternalPagination,
    commands: managementCommands,
    availableActions: (order) => {
      const status = (order as OrderRecord).status;
      const set: OrderAction[] = [];
      if (status === "pending") {
        set.push("approve", "reject", "cancel");
      } else if (status === "approved") {
        set.push("purchase", "cancel");
      } else if (status === "in_preparation") {
        set.push("deliver", "cancel");
      } else if (status === "purchased") {
        set.push("startDelivery", "replacePurchase", "cancel");
      } else if (status === "out_for_delivery") {
        set.push("confirmDelivery", "cancel");
      }
      return set;
    },
    highlightOrderId,
  };
}
