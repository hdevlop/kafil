"use client";

import { useMemo, type Dispatch, type SetStateAction } from "react";
import type { ListChildrenFilters } from "@/services/childApi";

export function useChildrenTableFilters(
  filters: ListChildrenFilters,
  setFilters: Dispatch<SetStateAction<ListChildrenFilters>>,
) {
  return useMemo(
    () => [
      {
        type: "text",
        name: "search",
        placeholder: "Search child name...",
        value: filters.search ?? "",
        onChange: (search: string) => setFilters((current) => ({ ...current, search: search || undefined })),
      },
      {
        type: "select",
        showIcon: false,
        name: "gender",
        placeholder: "Filter by gender",
        value: filters.gender ?? "",
        onChange: (gender: ListChildrenFilters["gender"] | "") => setFilters((current) => ({ ...current, gender: gender || undefined })),
        options: [
          { value: "F", label: "Female" },
          { value: "M", label: "Male" },
        ],
      },
      {
        type: "select",
        showIcon: false,
        name: "status",
        placeholder: "Filter by status",
        value: filters.status ?? "",
        onChange: (status: ListChildrenFilters["status"] | "") => setFilters((current) => ({ ...current, status: status || undefined })),
        options: [
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" },
        ],
      },
    ],
    [filters.gender, filters.search, filters.status, setFilters],
  );
}
