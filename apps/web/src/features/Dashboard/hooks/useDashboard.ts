"use client";

import { useEntityQuery } from "@/hooks/useEntityQuery";
import {
  getFamilyDashboard,
  getOperatorDashboard,
  getSponsorDashboard,
} from "@/services/dashboardApi";

export const dashboardKeys = {
  all: ["dashboard"] as const,
  operator: ["dashboard", "operator"] as const,
  family: ["dashboard", "family"] as const,
  sponsor: ["dashboard", "sponsor"] as const,
};

export function useOperatorDashboard() {
  return useEntityQuery({ queryKey: dashboardKeys.operator, queryFn: getOperatorDashboard });
}

export function useFamilyOverviewDashboard() {
  return useEntityQuery({ queryKey: dashboardKeys.family, queryFn: getFamilyDashboard });
}

export function useSponsorDashboard() {
  return useEntityQuery({ queryKey: dashboardKeys.sponsor, queryFn: getSponsorDashboard });
}
