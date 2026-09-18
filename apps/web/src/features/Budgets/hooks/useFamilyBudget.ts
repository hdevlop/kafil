"use client";

import { useEntityQuery, type EntityQueryOptions } from "najm-kit/query";
import { getOwnFamilyBudgetSummary } from "@/services/familyBudgetApi";

import { familyBudgetKeys } from "./familyBudgetKeys";
import type { FamilyBudgetSummary } from "../familyTypes";

export function useOwnFamilyBudgetSummary(
  options: Partial<EntityQueryOptions<FamilyBudgetSummary>> = {},
) {
  return useEntityQuery<FamilyBudgetSummary>({
    queryKey: familyBudgetKeys.summary,
    queryFn: getOwnFamilyBudgetSummary,
    ...options,
  });
}
