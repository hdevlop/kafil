"use client";

import { useMemo } from "react";
import type { CategoriesWorkspaceFilters } from "./useCategoriesWorkspace";

export function useCategoriesTableFilters(
  filters: CategoriesWorkspaceFilters,
  setFilters: (next: CategoriesWorkspaceFilters) => void,
) {
  return useMemo(
    () => [
      {
        type: "text",
        name: "search",
        placeholder: "Search category name...",
        value: filters.search ?? "",
        onChange: (search: string) => setFilters({ ...filters, search: search || undefined }),
      },
      {
        type: "select",
        showIcon: false,
        name: "status",
        placeholder: "Filter by status",
        value: filters.status ?? "",
        onChange: (status: CategoriesWorkspaceFilters["status"] | "") => setFilters({ ...filters, status: status || undefined }),
        options: [
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" },
        ],
      },
    ],
    [filters, setFilters],
  );
}
