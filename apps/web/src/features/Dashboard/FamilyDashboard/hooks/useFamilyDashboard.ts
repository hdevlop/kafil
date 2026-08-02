"use client";

import { useEntityQuery } from "@/hooks/useEntityQuery";
import type { EntityQueryOptions } from "@/hooks/useEntityQuery";
import { getFamilyDashboard } from "@/services/dashboardApi";
import {
  getOwnFamilyProfile,
  listOwnFamilyChildren,
} from "@/services/familyDashboardApi";

import { dashboardKeys } from "../../shared/dashboardKeys";
import type { FamilyDashboardProfile } from "../types";
import { familyDashboardKeys } from "./familyDashboardKeys";

export function useFamilyDashboard() {
  return useEntityQuery({
    queryKey: dashboardKeys.family,
    queryFn: getFamilyDashboard,
  });
}

export function useOwnFamilyProfile(
  options: Partial<EntityQueryOptions<FamilyDashboardProfile>> = {},
) {
  return useEntityQuery<FamilyDashboardProfile>({
    queryKey: familyDashboardKeys.profile,
    queryFn: getOwnFamilyProfile,
    ...options,
  });
}

export function useOwnFamilyChildren() {
  return useEntityQuery({
    queryKey: familyDashboardKeys.children,
    queryFn: listOwnFamilyChildren,
  });
}
