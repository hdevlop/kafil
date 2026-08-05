"use client";

import { useMemo, type Dispatch, type SetStateAction } from "react";

import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import type { StaffFilters } from "./useStaff";

export function useStaffTableFilters(
  filters: StaffFilters,
  setFilters: Dispatch<SetStateAction<StaffFilters>>,
) {
  const { t } = useKafilLanguage();
  return useMemo(
    () => [
      {
        type: "text",
        name: "search",
        placeholder: t("operator.staff.searchName"),
        value: filters.search ?? "",
        onChange: (search: string) => setFilters((current) => ({ ...current, search: search || undefined })),
      },
      {
        type: "select",
        showIcon: false,
        name: "functionKey",
        placeholder: t("operator.staff.filterFunction"),
        value: filters.functionKey ?? "",
        onChange: (functionKey: StaffFilters["functionKey"] | "") => setFilters((current) => ({ ...current, functionKey: functionKey || undefined })),
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
        showIcon: false,
        name: "status",
        placeholder: t("operator.staff.filterStatus"),
        value: filters.status ?? "",
        onChange: (status: StaffFilters["status"] | "") => setFilters((current) => ({ ...current, status: status || undefined })),
        options: [
          { value: "active", label: t("status.active") },
          { value: "inactive", label: t("status.inactive") },
        ],
      },
    ],
    [filters.functionKey, filters.search, filters.status, setFilters, t],
  );
}
