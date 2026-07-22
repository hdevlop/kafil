import type {
  FamilyBudgetLedgerEntry,
  FamilyBudgetLedgerQuery,
  FamilyBudgetSummary,
} from "@/features/FamilyBudget/types";
import { api } from "@/services/http";

export function getOwnFamilyBudgetSummary() {
  return api.get<FamilyBudgetSummary>("/budgets/me");
}

export function listOwnFamilyBudgetLedger(query: FamilyBudgetLedgerQuery) {
  return api.get<FamilyBudgetLedgerEntry[]>("/budgets/me/ledger", {
    query: { limit: query.limit, offset: query.offset },
  });
}
