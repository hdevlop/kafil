"use client";

import { useMemo } from "react";

export function useProductsTableFilters() {
  return useMemo(
    () => [
      { type: "text", name: "name", placeholder: "Search product name..." },
      { type: "text", name: "sku", placeholder: "Search SKU..." },
      { type: "text", name: "categoryName", placeholder: "Search category..." },
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
