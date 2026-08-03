"use client";

import { useState } from "react";
import { useUser } from "najm-auth/client/react";

import { useEntityQuery } from "@/hooks/useEntityQuery";
import { useKafilRole } from "@/shared/Authorization/useKafilRole";
import type { OffsetPagination } from "@/lib/pagination";
import { listOrders } from "@/services/orderApi";

import { orderKeys } from "./orderKeys";
import {
  normalizeFamilyOrder,
  normalizeOrderRecord,
  normalizeSponsorOrder,
} from "../lib/normalizeOrder";
import type { SharedOrderRecord } from "../sharedTypes";
import type { FamilyOrder } from "../familyTypes";
import type { SponsorSupportedOrder } from "../sponsorTypes";
import type { OrderRecord } from "../types";

export type OrdersScope = "management" | "family" | "sponsor";

export interface OrdersWorkspace {
  scope: OrdersScope;
  orders: SharedOrderRecord[];
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
  const user = useUser();
  const [internalPagination, setInternalPagination] = useState(pagination);

  const orders = useEntityQuery({
    queryKey: [...orderKeys.list(internalPagination), "principal", user?.id ?? null, user?.role ?? null],
    queryFn: () => listOrders(internalPagination),
    enabled: Boolean(user),
  });

  const raw = orders.data ?? [];
  const normalized: SharedOrderRecord[] = raw.map((order: unknown) => {
    if (isExactFamily) return normalizeFamilyOrder(order as FamilyOrder);
    if (isExactSponsor) return normalizeSponsorOrder(order as SponsorSupportedOrder);
    return normalizeOrderRecord(order as OrderRecord);
  });

  return {
    scope: isExactFamily
      ? "family"
      : isExactSponsor
        ? "sponsor"
        : "management",
    orders: normalized,
    loading: orders.isPending,
    error: orders.error,
    refetch: orders.refetch,
    pagination: internalPagination,
    setPagination: setInternalPagination,
    highlightOrderId,
  };
}