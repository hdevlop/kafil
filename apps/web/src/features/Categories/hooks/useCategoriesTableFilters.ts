"use client";

import { useMemo } from "react";

export function useCategoriesTableFilters() {
  return useMemo(
    () => [
      { type: "text", name: "name", placeholder: "Search category name..." },
      { type: "text", name: "slug", placeholder: "Search category slug..." },
      {
        type: "select",
        name: "status",
        placeholder: "Filter by status",
        options: [
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" },
        ],
      },
    ],
    [],
  );
}
