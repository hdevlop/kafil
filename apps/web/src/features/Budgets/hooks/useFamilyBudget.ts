"use client";

import { useEntityQuery } from "@/hooks/useEntityQuery";
import { getOwnFamilyBudgetSummary } from "@/services/familyBudgetApi";

import { familyBudgetKeys } from "./familyBudgetKeys";
import type { EntityQueryOptions } from "@/hooks/useEntityQuery";
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
