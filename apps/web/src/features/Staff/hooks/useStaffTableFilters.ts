"use client";

import { useMemo } from "react";

import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";

export function useStaffTableFilters() {
  const { t } = useKafilLanguage();
  return useMemo(
    () => [
      {
        type: "text",
        name: "name",
        placeholder: t("operator.staff.searchName"),
      },
      {
        type: "select",
        name: "functions",
        placeholder: t("operator.staff.filterFunction"),
        options: [
          {
            value: "operator",
            label: t("operator.staff.functionOperator"),
          },
          {
            value: "delivery",
            label: t("operator.staff.functionDelivery"),
          },
        ],
      },
      {
        type: "select",
        name: "status",
        placeholder: t("operator.staff.filterStatus"),
        options: [
          { value: "active", label: t("status.active") },
          { value: "inactive", label: t("status.inactive") },
        ],
      },
    ],
    [t],
  );
}
