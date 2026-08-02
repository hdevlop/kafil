import type { FamilyBudgetSummary } from "@/features/Budgets/familyTypes";
import { api } from "@/services/http";

export function getOwnFamilyBudgetSummary() {
  return api.get<FamilyBudgetSummary>("/budgets/me");
}
