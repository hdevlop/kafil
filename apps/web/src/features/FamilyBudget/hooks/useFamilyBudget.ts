"use client";

import { useEntityQuery } from "@/hooks/useEntityQuery";
import {
  getOwnFamilyBudgetSummary,
  listOwnFamilyBudgetLedger,
} from "@/services/familyBudgetApi";

import { familyBudgetKeys } from "./familyBudgetKeys";
import type { FamilyBudgetLedgerQuery } from "../types";

export function useOwnFamilyBudgetSummary() {
  return useEntityQuery({
    queryKey: familyBudgetKeys.summary,
    queryFn: getOwnFamilyBudgetSummary,
  });
}

export function useOwnFamilyBudgetLedger(query: FamilyBudgetLedgerQuery) {
  return useEntityQuery({
    queryKey: familyBudgetKeys.ledger(query),
    queryFn: () => listOwnFamilyBudgetLedger(query),
  });
}
