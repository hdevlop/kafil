"use client";

import { useEntityQuery } from "@/hooks/useEntityQuery";
import { getOperatorDashboard } from "@/services/dashboardApi";

import { dashboardKeys } from "../../shared/dashboardKeys";

export function useAdminDashboard() {
  return useEntityQuery({
    queryKey: dashboardKeys.admin,
    queryFn: getOperatorDashboard,
  });
}
