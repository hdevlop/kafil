"use client";

import { useMemo } from "react";

import { useKafilRole } from "@/shared/Authorization/useKafilRole";
import {
  useResponsiveProducts,
  useResponsiveProductCategories,
  useProductCommands,
} from "@/features/Products/hooks/useProducts";
import type { OffsetPagination } from "@/lib/pagination";
import { useResponsiveOffsetList } from "@/hooks/useResponsiveOffsetList";
import { listFamilyCatalogCategories, listFamilyCatalogProducts } from "@/services/familyCatalogApi";
import { familyCatalogKeys } from "./familyCatalogKeys";
import type { ProductRecord } from "@/features/Products/types";
import type {
  FamilyCatalogProduct,
} from "@/features/Products/familyCatalogTypes";

export interface ProductsWorkspaceFilters {
  search?: string;
  status?: "active" | "inactive";
  categoryId?: string;
}

export interface ProductsWorkspace {
  mode: "management" | "family";
  products: ProductRecord[] | FamilyCatalogProduct[];
  categories: Array<{
    id: string;
    name: string;
    slug?: string;
    image?: string | null;
    itemCount?: number;
    status?: string;
  }>;
  pagination: OffsetPagination;
  setPagination: (next: OffsetPagination) => void;
  loading: boolean;
  error: unknown;
  refetch: () => Promise<unknown>;
  filters: ProductsWorkspaceFilters;
  setFilters: (next: ProductsWorkspaceFilters) => void;
  managementActions?: ReturnType<typeof useProductCommands>;
  canMutate: boolean;
  paginationController: ReturnType<typeof useResponsiveProducts>;
  categoryPaginationController: ReturnType<typeof useResponsiveProductCategories>;
}

const FAMILY_PAGE_SIZE = 12;

export function useProductsWorkspace(
  pagination: OffsetPagination,
  filters: ProductsWorkspaceFilters = {},
): ProductsWorkspace {
  const { isExactFamily } = useKafilRole();
  const stableFilters = useMemo(
    () => ({
      search: filters.search,
      status: filters.status,
      categoryId: filters.categoryId,
    }),
    [filters.search, filters.status, filters.categoryId],
  );
  const managementProducts = useResponsiveProducts(
    {
      categoryId: stableFilters.categoryId,
      status: stableFilters.status,
      search: stableFilters.search,
    },
    !isExactFamily,
  );
  const managementCategories = useResponsiveProductCategories("", !isExactFamily);
  const managementActions = useProductCommands();

  const familyProducts = useResponsiveOffsetList({
    enabled: isExactFamily,
    pageSize: FAMILY_PAGE_SIZE,
    queryKey: [...familyCatalogKeys.products({
      limit: FAMILY_PAGE_SIZE,
      offset: 0,
      categoryId: stableFilters.categoryId,
      search: stableFilters.search,
    }), "responsive"],
    fetchPage: (page) => listFamilyCatalogProducts({
      ...page,
      categoryId: stableFilters.categoryId,
      search: stableFilters.search,
    }),
  });
  const familyCategories = useResponsiveOffsetList({
    enabled: isExactFamily,
    pageSize: 25,
    queryKey: [...familyCatalogKeys.categories, "product-filter", "responsive"],
    fetchPage: (page) => listFamilyCatalogCategories(page),
  });

  if (isExactFamily) {
    const products = familyProducts.data as FamilyCatalogProduct[];
    return {
      mode: "family",
      products,
      categories: familyCategories.data ?? [],
      pagination,
      setPagination: () => undefined,
      loading: familyProducts.loading,
      error: familyProducts.error,
      refetch: familyProducts.refetch,
      filters: stableFilters,
      setFilters: () => undefined,
      canMutate: false,
      paginationController: familyProducts as ReturnType<typeof useResponsiveProducts>,
      categoryPaginationController: familyCategories as ReturnType<typeof useResponsiveProductCategories>,
    };
  }

  return {
    mode: "management",
    products: managementProducts.data,
    categories: managementCategories.data,
    pagination,
    setPagination: () => undefined,
    loading: managementProducts.loading,
    error: managementProducts.error,
    refetch: managementProducts.refetch,
    filters: stableFilters,
    setFilters: () => undefined,
    managementActions,
    canMutate: true,
    paginationController: managementProducts,
    categoryPaginationController: managementCategories,
  };
}
