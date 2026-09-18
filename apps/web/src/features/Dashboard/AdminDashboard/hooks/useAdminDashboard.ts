"use client";

import { useEntityQuery } from "najm-kit/query";
import { getOperatorDashboard } from "@/services/dashboardApi";

import { dashboardKeys } from "../../shared/dashboardKeys";

export function useAdminDashboard() {
  return useEntityQuery({
    queryKey: dashboardKeys.admin,
    queryFn: getOperatorDashboard,
  });
}
