"use client";

import { useMemo } from "react";
import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";

export function useSponsorsTableFilters() {
  const { t } = useKafilLanguage();
  return useMemo(
    () => [
      {
        type: "text",
        name: "name",
        placeholder: t("operator.sponsors.searchName"),
      },
      {
        type: "text",
        name: "email",
        placeholder: t("operator.sponsors.searchEmail"),
      },
      {
        type: "select",
        name: "status",
        placeholder: t("operator.sponsors.filterStatus"),
        options: [
          { value: "active", label: t("status.active") },
          { value: "inactive", label: t("status.inactive") },
        ],
      },
    ],
    [t],
  );
}
