"use client";

import {
  useEntityQuery,
  type EntityQueryOptions,
} from "@/hooks/useEntityQuery";
import { getSponsorOrder, listSponsorOrders } from "@/services/sponsorOrdersApi";

import { sponsorOrderKeys } from "./sponsorOrderKeys";
import type { SponsorOrderQuery, SponsorSupportedOrder } from "../sponsorTypes";

export function useSponsorOrders(
  query: SponsorOrderQuery,
  options: Partial<EntityQueryOptions<SponsorSupportedOrder[]>> = {},
) {
  return useEntityQuery<SponsorSupportedOrder[]>({
    queryKey: sponsorOrderKeys.list(query),
    queryFn: () => listSponsorOrders(query),
    ...options,
  });
}

export function useSponsorOrder(id: string) {
  return useEntityQuery<SponsorSupportedOrder>({
    queryKey: sponsorOrderKeys.detail(id),
    queryFn: () => getSponsorOrder(id),
    enabled: Boolean(id),
  });
}
