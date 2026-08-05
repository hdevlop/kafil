"use client";

import { useMemo, type Dispatch, type SetStateAction } from "react";

import { PRODUCT_TABLE_COLUMN_IDS } from "./useProductsTableColumns";
import type { ProductsWorkspaceFilters } from "./useProductsWorkspace";

interface ProductCategoryFilterOption {
  id: string;
  name: string;
}

export function useProductsTableFilters(
  categories: ProductCategoryFilterOption[],
  filters: ProductsWorkspaceFilters,
  setFilters: Dispatch<SetStateAction<ProductsWorkspaceFilters>>,
) {
  return useMemo(
    () => [
      {
        type: "text",
        name: "search",
        placeholder: "Search product name...",
        value: filters.search ?? "",
        onChange: (search: string) => setFilters((current) => ({ ...current, search: search || undefined })),
      },
      {
        type: "combobox",
        showIcon: false,
        name: "categoryId",
        placeholder: "Filter by category",
        value: filters.categoryId ?? "",
        onChange: (categoryId: string) => setFilters((current) => ({ ...current, categoryId: categoryId || undefined })),
        options: categories.map((category) => ({
          value: category.id,
          label: category.name,
        })),
      },
      {
        type: "select",
        showIcon: false,
        name: PRODUCT_TABLE_COLUMN_IDS.status,
        placeholder: "Filter by status",
        value: filters.status ?? "",
        onChange: (status: ProductsWorkspaceFilters["status"] | "") => setFilters((current) => ({ ...current, status: status || undefined })),
        options: [
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" },
        ],
      },
    ],
    [categories, filters.categoryId, filters.search, filters.status, setFilters],
  );
}
