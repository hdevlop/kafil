"use client";

import { useMemo, useState } from "react";

import { useKafilRole } from "@/shared/Authorization/useKafilRole";
import {
  useProducts,
  useProductCategories,
  useProductCommands,
} from "@/features/Products/hooks/useProducts";
import {
  useFamilyCatalogProducts,
  useFamilyCatalogCategories,
} from "@/features/FamilyCatalog/hooks/useFamilyCatalog";
import type { OffsetPagination } from "@/lib/pagination";
import type { ProductRecord } from "@/features/Products/types";
import type {
  FamilyCatalogProduct,
} from "@/features/FamilyCatalog/types";

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
  const filterKey = JSON.stringify({
    ...stableFilters,
    family: isExactFamily,
    limit: pagination.limit,
  });
  const [paginationState, setPaginationState] = useState({
    filterKey,
    pagination,
  });
  const internalPagination =
    paginationState.filterKey === filterKey
      ? paginationState.pagination
      : pagination;
  const setInternalPagination = (next: OffsetPagination) => {
    setPaginationState({ filterKey, pagination: next });
  };

  const managementProducts = useProducts(
    internalPagination,
    {
      categoryId: stableFilters.categoryId,
      status: stableFilters.status,
      search: stableFilters.search,
    },
    { enabled: !isExactFamily },
  );
  const managementCategories = useProductCategories(!isExactFamily);
  const managementActions = useProductCommands();

  const familyProducts = useFamilyCatalogProducts({
    limit: internalPagination.limit || FAMILY_PAGE_SIZE,
    offset: internalPagination.offset,
    categoryId: stableFilters.categoryId,
    search: stableFilters.search,
  }, { enabled: isExactFamily });
  const familyCategories = useFamilyCatalogCategories({
    enabled: isExactFamily,
  });

  if (isExactFamily) {
    const products = (familyProducts.data ?? []) as FamilyCatalogProduct[];
    return {
      mode: "family",
      products,
      categories: familyCategories.data ?? [],
      pagination: internalPagination,
      setPagination: setInternalPagination,
      loading: familyProducts.isPending,
      error: familyProducts.error,
      refetch: familyProducts.refetch,
      filters: stableFilters,
      setFilters: () => undefined,
      canMutate: false,
    };
  }

  return {
    mode: "management",
    products: managementProducts.data ?? [],
    categories: managementCategories.data ?? [],
    pagination: internalPagination,
    setPagination: setInternalPagination,
    loading: managementProducts.isPending,
    error: managementProducts.error,
    refetch: managementProducts.refetch,
    filters: stableFilters,
    setFilters: () => undefined,
    managementActions,
    canMutate: true,
  };
}
