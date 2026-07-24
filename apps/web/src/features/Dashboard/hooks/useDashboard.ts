"use client";

import { useEntityQuery } from "@/hooks/useEntityQuery";
import {
  getFamilyDashboard,
  getOperatorDashboard,
} from "@/services/dashboardApi";

export const dashboardKeys = {
  all: ["dashboard"] as const,
  operator: ["dashboard", "operator"] as const,
  family: ["dashboard", "family"] as const,
};

export function useOperatorDashboard() {
  return useEntityQuery({ queryKey: dashboardKeys.operator, queryFn: getOperatorDashboard });
}

export function useFamilyOverviewDashboard() {
  return useEntityQuery({ queryKey: dashboardKeys.family, queryFn: getFamilyDashboard });
}
