"use client";

import { useMemo } from "react";

import { PRODUCT_TABLE_COLUMN_IDS } from "./useProductsTableColumns";

interface ProductCategoryFilterOption {
  name: string;
}

export function useProductsTableFilters(
  categories: ProductCategoryFilterOption[],
) {
  return useMemo(
    () => [
      {
        type: "text",
        name: PRODUCT_TABLE_COLUMN_IDS.name,
        placeholder: "Search product name...",
      },
      {
        type: "combobox",
        name: PRODUCT_TABLE_COLUMN_IDS.categoryName,
        placeholder: "Filter by category",
        options: categories.map((category) => ({
          value: category.name,
          label: category.name,
        })),
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
    [categories],
  );
}
