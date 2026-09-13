"use client";

import { useAuth } from "najm-auth/client/react";

import { useResponsiveOffsetList, type ListStrategy } from "najm-kit/query";
import { dashboardKeys } from "@/features/Dashboard/shared/dashboardKeys";
import {
  listDeliveryFamilies,
  type ListDeliveryFamiliesFilters,
} from "@/services/dashboardApi";

export interface DeliveryFamiliesFilters {
  date: string;
  search?: string;
}

export function useResponsiveDeliveryFamilies(
  filters: DeliveryFamiliesFilters,
  enabled = true,
  strategy: ListStrategy = "paged",
) {
  const { accessToken, user } = useAuth();
  const queryFilters: ListDeliveryFamiliesFilters = {
    date: filters.date,
    ...(filters.search ? { search: filters.search } : {}),
  };
  return useResponsiveOffsetList({
    enabled: Boolean(user && accessToken) && enabled,
    strategy,
    queryKey: [
      ...dashboardKeys.deliveryFamilies,
      "responsive",
      user?.role,
      user?.id,
      queryFilters,
    ],
    fetchPage: (pagination) => listDeliveryFamilies(pagination, queryFilters),
  });
}
