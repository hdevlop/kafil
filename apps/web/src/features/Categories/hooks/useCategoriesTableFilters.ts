"use client";

import { useMemo } from "react";
import { useKafilLanguage } from "@/i18n/useKafilLanguage";
import type { CategoriesWorkspaceFilters } from "./useCategoriesWorkspace";

export function useCategoriesTableFilters(
  filters: CategoriesWorkspaceFilters,
  setFilters: (next: CategoriesWorkspaceFilters) => void,
) {
  const { t } = useKafilLanguage();
  return useMemo(
    () => [
      {
        type: "text",
        name: "search",
        placeholder: t("operator.categories.searchName"),
        value: filters.search ?? "",
        onChange: (search: string) => setFilters({ ...filters, search: search || undefined }),
      },
      {
        type: "select",
        showIcon: false,
        name: "status",
        placeholder: t("operator.categories.filterStatus"),
        value: filters.status ?? "",
        onChange: (status: CategoriesWorkspaceFilters["status"] | "") => setFilters({ ...filters, status: status || undefined }),
        options: [
          { value: "active", label: t("status.active") },
          { value: "inactive", label: t("status.inactive") },
        ],
      },
    ],
    [filters, setFilters, t],
  );
}
