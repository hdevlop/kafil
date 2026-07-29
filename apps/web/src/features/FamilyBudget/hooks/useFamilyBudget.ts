"use client";

import { useEntityQuery } from "@/hooks/useEntityQuery";
import {
  getOwnFamilyBudgetSummary,
  listOwnFamilyBudgetLedger,
} from "@/services/familyBudgetApi";

import { familyBudgetKeys } from "./familyBudgetKeys";
import type { FamilyBudgetLedgerQuery } from "../types";
import type { EntityQueryOptions } from "@/hooks/useEntityQuery";
import type { FamilyBudgetSummary } from "../types";

export function useOwnFamilyBudgetSummary(
  options: Partial<EntityQueryOptions<FamilyBudgetSummary>> = {},
) {
  return useEntityQuery<FamilyBudgetSummary>({
    queryKey: familyBudgetKeys.summary,
    queryFn: getOwnFamilyBudgetSummary,
    ...options,
  });
}

export function useOwnFamilyBudgetLedger(query: FamilyBudgetLedgerQuery) {
  return useEntityQuery({
    queryKey: familyBudgetKeys.ledger(query),
    queryFn: () => listOwnFamilyBudgetLedger(query),
  });
}
