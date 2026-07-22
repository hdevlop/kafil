"use client";

import { useMemo } from "react";
import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";

export function useFamiliesTableFilters() {
  const { t } = useKafilLanguage();
  return useMemo(
    () => [
      {
        type: "text",
        name: "name",
        placeholder: t("operator.families.searchAccount"),
      },
      {
        type: "text",
        name: "guardianLegalName",
        placeholder: t("operator.families.searchGuardian"),
      },
      {
        type: "select",
        name: "status",
        placeholder: t("operator.families.filterStatus"),
        options: [
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" },
        ],
      },
    ],
    [t],
  );
}
