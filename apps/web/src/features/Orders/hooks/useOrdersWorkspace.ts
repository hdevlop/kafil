"use client";

import { useUser } from "najm-auth/client/react";

import { useResponsiveOffsetList } from "@/hooks/useResponsiveOffsetList";
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
import type { OrderListQuery } from "../types";

export type OrdersScope = "management" | "family" | "sponsor";

export interface OrdersWorkspace {
  scope: OrdersScope;
  orders: SharedOrderRecord[];
  loading: boolean;
  error: unknown;
  refetch: () => Promise<unknown>;
  pagination: OffsetPagination;
  setPagination: (next: OffsetPagination) => void;
  cardViewport: boolean;
  hasNextPage: boolean;
  loadingMore: boolean;
  loadMoreError: unknown;
  onLoadMore: () => Promise<unknown>;
  pageCount: number;
  highlightOrderId: string | null;
}

export function useOrdersWorkspace(
  pagination: OffsetPagination,
  highlightOrderId: string | null = null,
  filters: Omit<OrderListQuery, "limit" | "offset"> = {},
): OrdersWorkspace {
  const { isExactFamily, isExactSponsor } = useKafilRole();
  const user = useUser();
  const orders = useResponsiveOffsetList({
    queryKey: [...orderKeys.all, "responsive", "principal", user?.id ?? null, user?.role ?? null, filters],
    fetchPage: (page) => listOrders({ ...page, ...filters }),
    pageSize: pagination.limit,
    enabled: Boolean(user),
  });

  const raw = orders.data;
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
    loading: orders.loading,
    error: orders.error,
    refetch: orders.refetch,
    pagination: {
      limit: orders.pagination.pageSize,
      offset: orders.pagination.pageIndex * orders.pagination.pageSize,
    },
    setPagination: (next) => orders.onPaginationChange({
      pageIndex: Math.floor(next.offset / Math.max(1, next.limit)),
      pageSize: next.limit,
    }),
    cardViewport: orders.cardViewport,
    hasNextPage: orders.hasNextPage,
    loadingMore: orders.loadingMore,
    loadMoreError: orders.loadMoreError,
    onLoadMore: orders.onLoadMore,
    pageCount: orders.pageCount,
    highlightOrderId,
  };
}
