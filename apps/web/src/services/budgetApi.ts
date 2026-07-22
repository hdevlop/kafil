import type {
  BudgetFamily,
  BudgetLedgerEntry,
  BudgetSummary,
  ManualBudgetAdjustmentInput,
  SetMonthlyBudgetLimitInput,
} from "@/features/Budgets/types";
import type { OffsetPagination } from "@/lib/pagination";
import { api } from "@/services/http";

export function listBudgetFamilies() {
  return api.get<BudgetFamily[]>("/families", {
    query: { limit: 100, offset: 0 },
  });
}

export function getBudgetSummary(familyProfileId: string) {
  return api.get<BudgetSummary>(`/budgets/${familyProfileId}`);
}

export function listBudgetLedger(
  familyProfileId: string,
  pagination: OffsetPagination,
) {
  return api.get<BudgetLedgerEntry[]>(`/budgets/${familyProfileId}/ledger`, {
    query: { limit: pagination.limit, offset: pagination.offset },
  });
}

export function setMonthlyBudgetLimit({
  familyProfileId,
  input,
}: {
  familyProfileId: string;
  input: SetMonthlyBudgetLimitInput;
}) {
  return api.put(`/budgets/${familyProfileId}/monthly-limit`, input);
}

export function createManualBudgetAdjustment({
  familyProfileId,
  input,
}: {
  familyProfileId: string;
  input: ManualBudgetAdjustmentInput;
}) {
  return api.post(`/budgets/${familyProfileId}/adjustments`, input);
}
