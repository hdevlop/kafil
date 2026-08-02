"use client";

import { useEntityQuery } from "@/hooks/useEntityQuery";
import { getSponsorDashboard } from "@/services/sponsorDashboardApi";

import { sponsorDashboardKeys } from "./sponsorDashboardKeys";

export function useSponsorDashboard() {
  return useEntityQuery({
    queryKey: sponsorDashboardKeys.overview,
    queryFn: getSponsorDashboard,
  });
}
