"use client";

import { useEntityCommand } from "@/hooks/useEntityCommand";
import {
  resetMonthlyLimit,
  setFamilyOrderPolicy,
  setMonthlyLimit,
} from "@/services/budgetApi";
import { useTranslation } from "najm-i18n/react";

import { budgetKeys } from "./budgetKeys";
import { familyBudgetKeys } from "./familyBudgetKeys";

export function useBudgetCommands() {
  const { t } = useTranslation();
  return {
    setOrderPolicy: useEntityCommand({
      mutationFn: setFamilyOrderPolicy,
      invalidate: [budgetKeys.all, familyBudgetKeys.all],
      successMessage: t("operator.budgets.savePolicySuccess"),
      errorMessage: t("operator.budgets.savePolicyError"),
    }),
    setMonthlyLimit: useEntityCommand({
      mutationFn: setMonthlyLimit,
      invalidate: [budgetKeys.all, familyBudgetKeys.all],
      successMessage: t("operator.budgets.saveLimitSuccess"),
      errorMessage: t("operator.budgets.saveLimitError"),
    }),
    resetMonthlyLimit: useEntityCommand({
      mutationFn: resetMonthlyLimit,
      invalidate: [budgetKeys.all, familyBudgetKeys.all],
      successMessage: t("operator.budgets.resetMonthlySuccess"),
      errorMessage: t("operator.budgets.resetMonthlyError"),
    }),
  };
}
