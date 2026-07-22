"use client";

import { useEntityCommand } from "@/hooks/useEntityCommand";
import { useEntityQuery } from "@/hooks/useEntityQuery";
import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import type { OffsetPagination } from "@/lib/pagination";
import {
  createManualBudgetAdjustment,
  getBudgetSummary,
  listBudgetFamilies,
  listBudgetLedger,
  setMonthlyBudgetLimit,
} from "@/services/budgetApi";

import { budgetKeys } from "./budgetKeys";

export function useBudgetFamilies() {
  return useEntityQuery({
    queryKey: budgetKeys.families,
    queryFn: listBudgetFamilies,
  });
}

export function useBudgetSummary(familyProfileId: string) {
  return useEntityQuery({
    queryKey: budgetKeys.summary(familyProfileId),
    queryFn: () => getBudgetSummary(familyProfileId),
    enabled: Boolean(familyProfileId),
    refetchOnMount: "always",
  });
}

export function useBudgetLedger(
  familyProfileId: string,
  pagination: OffsetPagination,
) {
  return useEntityQuery({
    queryKey: budgetKeys.ledger(familyProfileId, pagination),
    queryFn: () => listBudgetLedger(familyProfileId, pagination),
    enabled: Boolean(familyProfileId),
    refetchOnMount: "always",
  });
}

export function useBudgetCommands() {
  const { t } = useKafilLanguage();
  const invalidate = [budgetKeys.all];

  const setMonthlyLimit = useEntityCommand({
    mutationFn: setMonthlyBudgetLimit,
    invalidate,
    successMessage: t("operator.budgets.saveLimitSuccess"),
    errorMessage: t("operator.budgets.saveLimitError"),
  });

  const adjust = useEntityCommand({
    mutationFn: createManualBudgetAdjustment,
    invalidate,
    successMessage: t("operator.budgets.adjustmentSuccess"),
    errorMessage: t("operator.budgets.adjustmentError"),
  });

  return { setMonthlyLimit, adjust };
}
