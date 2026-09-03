"use client";

import { useMemo, type Dispatch, type SetStateAction } from "react";
import { useKafilLanguage } from "@/i18n/useKafilLanguage";
import type { ListChildrenFilters } from "@/services/childApi";

export function useChildrenTableFilters(
  filters: ListChildrenFilters,
  setFilters: Dispatch<SetStateAction<ListChildrenFilters>>,
) {
  const { t } = useKafilLanguage();
  return useMemo(
    () => [
      {
        type: "text",
        name: "search",
        placeholder: t("operator.children.searchName"),
        value: filters.search ?? "",
        onChange: (search: string) => setFilters((current) => ({ ...current, search: search || undefined })),
      },
      {
        type: "select",
        showIcon: false,
        name: "gender",
        placeholder: t("operator.children.filterGender"),
        value: filters.gender ?? "",
        onChange: (gender: ListChildrenFilters["gender"] | "") => setFilters((current) => ({ ...current, gender: gender || undefined })),
        options: [
          { value: "F", label: t("operator.families.female") },
          { value: "M", label: t("operator.families.male") },
        ],
      },
      {
        type: "select",
        showIcon: false,
        name: "status",
        placeholder: t("operator.children.filterStatus"),
        value: filters.status ?? "",
        onChange: (status: ListChildrenFilters["status"] | "") => setFilters((current) => ({ ...current, status: status || undefined })),
        options: [
          { value: "active", label: t("status.active") },
          { value: "inactive", label: t("status.inactive") },
        ],
      },
    ],
    [filters.gender, filters.search, filters.status, setFilters, t],
  );
}
