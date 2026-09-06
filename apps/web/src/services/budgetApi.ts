import type {
  BudgetSummary,
  ResetMonthlyLimitInput,
  SetFamilyOrderPolicyInput,
  SetMonthlyLimitInput,
} from "@/features/Budgets/types";
import { api } from "@/services/http";

export function getBudgetSummary(familyProfileId: string) {
  return api.get<BudgetSummary>(`/budgets/${familyProfileId}`);
}

export function setFamilyOrderPolicy(input: SetFamilyOrderPolicyInput) {
  const { familyProfileId, ...body } = input;
  return api.put<BudgetSummary>(
    `/budgets/${familyProfileId}/order-policy`,
    body,
  );
}

export function setMonthlyLimit(input: SetMonthlyLimitInput) {
  const { familyProfileId, ...body } = input;
  return api.put(`/budgets/${familyProfileId}/monthly-limit`, body);
}

export function resetMonthlyLimit(input: ResetMonthlyLimitInput) {
  const { familyProfileId, ...body } = input;
  return api.post(`/budgets/${familyProfileId}/monthly-limit/reset`, body);
}
