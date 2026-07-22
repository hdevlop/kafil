"use client";

import { useMemo } from "react";

import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";

export function useBudgetLedgerTableFilters() {
  const { t } = useKafilLanguage();

  return useMemo(
    () => [
      {
        type: "text",
        name: "paymentMethod",
        placeholder: t("operator.budgets.searchPaymentMethod"),
      },
      {
        type: "text",
        name: "externalReference",
        placeholder: t("operator.budgets.searchReference"),
      },
    ],
    [t],
  );
}
