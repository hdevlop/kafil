"use client";

import { useMemo, type Dispatch, type SetStateAction } from "react";
import { useTranslation } from "najm-i18n/react";
import type { ListFamiliesFilters } from "@/services/familyApi";

export function useFamiliesTableFilters(
  filters: ListFamiliesFilters,
  setFilters: Dispatch<SetStateAction<ListFamiliesFilters>>,
) {
  const { t } = useTranslation();
  return useMemo(
    () => [
      {
        type: "text",
        name: "search",
        placeholder: t("operator.families.searchAccount"),
        value: filters.search ?? "",
        onChange: (search: string) => setFilters((current) => ({
          ...current,
          search: search || undefined,
        })),
      },
      {
        type: "select",
        showIcon: false,
        name: "status",
        placeholder: t("operator.families.filterStatus"),
        value: filters.status ?? "",
        onChange: (status: ListFamiliesFilters["status"] | "") => setFilters((current) => ({
          ...current,
          status: status || undefined,
        })),
        options: [
          { value: "active", label: t("status.active") },
          { value: "inactive", label: t("status.inactive") },
        ],
      },
    ],
    [filters.search, filters.status, setFilters, t],
  );
}
