"use client";

import { useMemo, type Dispatch, type SetStateAction } from "react";

import { useTranslation } from "najm-i18n/react";
import type { ListSupportAssignmentFilters } from "@/services/supportAssignmentApi";

export function useSupportAssignmentsTableFilters(
  filters: ListSupportAssignmentFilters,
  setFilters: Dispatch<SetStateAction<ListSupportAssignmentFilters>>,
) {
  const { t } = useTranslation();
  return useMemo(
    () => [
      {
        type: "text",
        name: "sponsorSearch",
        placeholder: t("operator.assignments.searchSponsors"),
        value: filters.sponsorSearch ?? "",
        onChange: (sponsorSearch: string) => setFilters((current) => ({ ...current, sponsorSearch: sponsorSearch || undefined })),
      },
      {
        type: "text",
        name: "familySearch",
        placeholder: t("operator.assignments.searchFamilies"),
        value: filters.familySearch ?? "",
        onChange: (familySearch: string) => setFilters((current) => ({ ...current, familySearch: familySearch || undefined })),
      },
      {
        type: "select",
        showIcon: false,
        name: "status",
        placeholder: t("operator.assignments.filterStatus"),
        value: filters.status ?? "",
        onChange: (status: ListSupportAssignmentFilters["status"] | "") => setFilters((current) => ({ ...current, status: status || undefined })),
        options: [
          { value: "active", label: t("status.active") },
          { value: "ended", label: t("status.ended") },
        ],
      },
    ],
    [filters.familySearch, filters.sponsorSearch, filters.status, setFilters, t],
  );
}
