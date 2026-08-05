"use client";

import { useMemo, type Dispatch, type SetStateAction } from "react";
import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import type { ListSponsorsFilters } from "@/services/sponsorApi";

export function useSponsorsTableFilters(
  filters: ListSponsorsFilters,
  setFilters: Dispatch<SetStateAction<ListSponsorsFilters>>,
) {
  const { t } = useKafilLanguage();
  return useMemo(
    () => [
      {
        type: "text",
        name: "search",
        placeholder: t("operator.sponsors.searchName"),
        value: filters.search ?? "",
        onChange: (search: string) => setFilters((current) => ({ ...current, search: search || undefined })),
      },
      {
        type: "select",
        showIcon: false,
        name: "status",
        placeholder: t("operator.sponsors.filterStatus"),
        value: filters.status ?? "",
        onChange: (status: ListSponsorsFilters["status"] | "") => setFilters((current) => ({ ...current, status: status || undefined })),
        options: [
          { value: "active", label: t("status.active") },
          { value: "inactive", label: t("status.inactive") },
        ],
      },
    ],
    [filters.search, filters.status, setFilters, t],
  );
}
