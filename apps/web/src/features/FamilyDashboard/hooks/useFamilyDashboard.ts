"use client";

import { useEntityQuery } from "@/hooks/useEntityQuery";
import {
  getOwnFamilyProfile,
  listOwnFamilyChildren,
} from "@/services/familyDashboardApi";

import { familyDashboardKeys } from "./familyDashboardKeys";

export function useOwnFamilyProfile() {
  return useEntityQuery({
    queryKey: familyDashboardKeys.profile,
    queryFn: getOwnFamilyProfile,
  });
}

export function useOwnFamilyChildren() {
  return useEntityQuery({
    queryKey: familyDashboardKeys.children,
    queryFn: listOwnFamilyChildren,
  });
}
