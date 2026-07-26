"use client";

import { useMemo } from "react";

import { PRODUCT_TABLE_COLUMN_IDS } from "./useProductsTableColumns";

export function useProductsTableFilters() {
  return useMemo(
    () => [
      {
        type: "text",
        name: PRODUCT_TABLE_COLUMN_IDS.name,
        placeholder: "Search product name...",
      },
      {
        type: "text",
        name: PRODUCT_TABLE_COLUMN_IDS.sku,
        placeholder: "Search SKU...",
      },
      {
        type: "text",
        name: PRODUCT_TABLE_COLUMN_IDS.categoryName,
        placeholder: "Search category...",
      },
      {
        type: "select",
        name: PRODUCT_TABLE_COLUMN_IDS.status,
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
