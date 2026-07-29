"use client";

import { useEntityQuery } from "@/hooks/useEntityQuery";
import type { EntityQueryOptions } from "@/hooks/useEntityQuery";
import {
  getOwnFamilyProfile,
  listOwnFamilyChildren,
} from "@/services/familyDashboardApi";

import { familyDashboardKeys } from "./familyDashboardKeys";
import type { FamilyDashboardProfile } from "../types";

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
