import type {
  BudgetSummary,
} from "@/features/Budgets/types";
import { api } from "@/services/http";

export function getBudgetSummary(familyProfileId: string) {
  return api.get<BudgetSummary>(`/budgets/${familyProfileId}`);
}
