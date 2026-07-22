"use client";

import { useMemo } from "react";

import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";

export function useSupportAssignmentsTableFilters() {
  const { t } = useKafilLanguage();
  return useMemo(
    () => [
      {
        type: "text",
        name: "sponsorLabel",
        placeholder: t("operator.assignments.searchSponsors"),
      },
      {
        type: "text",
        name: "familyLabel",
        placeholder: t("operator.assignments.searchFamilies"),
      },
      {
        type: "select",
        name: "status",
        placeholder: t("operator.assignments.filterStatus"),
        options: [
          { value: "active", label: t("status.active") },
          { value: "ended", label: t("status.ended") },
        ],
      },
    ],
    [t],
  );
}
