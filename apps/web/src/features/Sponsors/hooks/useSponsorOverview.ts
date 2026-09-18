"use client";

import { useEntityQuery } from "najm-kit/query";
import { getSponsorOverview } from "@/services/sponsorApi";

import { sponsorKeys } from "./sponsorKeys";

export function useSponsorOverview(id: string) {
  return useEntityQuery({
    queryKey: sponsorKeys.overview(id),
    queryFn: () => getSponsorOverview(id),
  });
}
