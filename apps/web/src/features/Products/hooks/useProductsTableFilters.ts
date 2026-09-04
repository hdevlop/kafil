"use client";

import { useMemo, type Dispatch, type SetStateAction } from "react";

import { useTranslation } from "najm-i18n/react";
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
  const { t } = useTranslation();
  return useMemo(
    () => [
      {
        type: "text",
        name: "search",
        placeholder: t("operator.products.searchName"),
        value: filters.search ?? "",
        onChange: (search: string) => setFilters((current) => ({ ...current, search: search || undefined })),
      },
      {
        type: "combobox",
        showIcon: false,
        name: "categoryId",
        placeholder: t("operator.products.filterCategory"),
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
        placeholder: t("operator.products.filterStatus"),
        value: filters.status ?? "",
        onChange: (status: ProductsWorkspaceFilters["status"] | "") => setFilters((current) => ({ ...current, status: status || undefined })),
        options: [
          { value: "active", label: t("status.active") },
          { value: "inactive", label: t("status.inactive") },
        ],
      },
    ],
    [categories, filters.categoryId, filters.search, filters.status, setFilters, t],
  );
}
