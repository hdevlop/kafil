"use client";

import { useState } from "react";

import { useKafilRole } from "@/shared/Authorization/useKafilRole";
import { useOrders } from "@/features/Orders/hooks/useOrders";
import { useFamilyOrders } from "@/features/Orders/hooks/useFamilyOrdering";
import { useSponsorOrders } from "@/features/Orders/hooks/useSponsorOrders";
import type { OffsetPagination } from "@/lib/pagination";
import type { OrderRecord } from "@/features/Orders/types";
import type { FamilyOrder } from "@/features/Orders/familyTypes";
import type { SponsorSupportedOrder } from "@/features/Orders/sponsorTypes";

export type OrdersScope = "management" | "family" | "sponsor";

export interface OrdersWorkspace {
  scope: OrdersScope;
  orders: OrderRecord[] | FamilyOrder[] | SponsorSupportedOrder[];
  loading: boolean;
  error: unknown;
  refetch: () => Promise<unknown>;
  pagination: OffsetPagination;
  setPagination: (next: OffsetPagination) => void;
  highlightOrderId: string | null;
}

export function useOrdersWorkspace(
  pagination: OffsetPagination,
  highlightOrderId: string | null = null,
): OrdersWorkspace {
  const { isExactFamily, isExactSponsor } = useKafilRole();
  const [internalPagination, setInternalPagination] = useState(pagination);
  const familyOrders = useFamilyOrders(internalPagination, { enabled: isExactFamily });
  const sponsorOrders = useSponsorOrders(internalPagination, { enabled: isExactSponsor });
  const managementOrders = useOrders(internalPagination, {
    enabled: !isExactFamily && !isExactSponsor,
  });

  if (isExactFamily) {
    return {
      scope: "family",
      orders: familyOrders.data ?? [],
      loading: familyOrders.isPending,
      error: familyOrders.error,
      refetch: familyOrders.refetch,
      pagination: internalPagination,
      setPagination: setInternalPagination,
      highlightOrderId,
    };
  }

  if (isExactSponsor) {
    return {
      scope: "sponsor",
      orders: sponsorOrders.data ?? [],
      loading: sponsorOrders.isPending,
      error: sponsorOrders.error,
      refetch: sponsorOrders.refetch,
      pagination: internalPagination,
      setPagination: setInternalPagination,
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
    highlightOrderId,
  };
}
