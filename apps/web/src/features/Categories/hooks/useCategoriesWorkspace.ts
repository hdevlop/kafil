"use client";

import { useState } from "react";

import { useKafilRole } from "@/shared/Authorization/useKafilRole";
import { useCategoryCommands, useResponsiveCategories } from "@/features/Categories/hooks/useCategories";
import {
  useResponsiveOffsetList,
  type ListStrategy,
} from "@/hooks/useResponsiveOffsetList";
import { listFamilyCatalogCategories } from "@/services/familyCatalogApi";
import { familyCatalogKeys } from "@/features/Products/hooks/familyCatalogKeys";
import type { OffsetPagination } from "@/lib/pagination";
import type { CategoryRecord } from "@/features/Categories/types";
import type { FamilyCatalogCategory } from "@/features/Products/familyCatalogTypes";

export interface CategoriesWorkspaceFilters {
  search?: string;
  status?: "active" | "inactive";
}

export interface CategoriesWorkspace {
  mode: "management" | "family";
  categories: CategoryRecord[] | FamilyCatalogCategory[];
  pagination: OffsetPagination;
  loading: boolean;
  error: unknown;
  refetch: () => Promise<unknown>;
  filters: CategoriesWorkspaceFilters;
  setFilters: (next: CategoriesWorkspaceFilters) => void;
  managementActions?: ReturnType<typeof useCategoryCommands>;
  canMutate: boolean;
  paginationController: ReturnType<typeof useResponsiveCategories>;
}

export function useCategoriesWorkspace(
  pagination: OffsetPagination,
  initialFilters: CategoriesWorkspaceFilters = {},
  strategy: ListStrategy = "paged",
): CategoriesWorkspace {
  const { isExactFamily } = useKafilRole();
  const [filters, setFilters] = useState<CategoriesWorkspaceFilters>(
    initialFilters,
  );

  const managementCategories = useResponsiveCategories(
    filters,
    !isExactFamily,
    strategy,
  );
  const managementActions = useCategoryCommands();
  const familyCategories = useResponsiveOffsetList({
    enabled: isExactFamily,
    strategy,
    queryKey: [...familyCatalogKeys.categories, "responsive", filters.search],
    fetchPage: (page) => listFamilyCatalogCategories(page, filters.search),
  });

  if (isExactFamily) {
    return {
      mode: "family",
      categories: familyCategories.data,
      pagination,
      loading: familyCategories.loading,
      error: familyCategories.error,
      refetch: familyCategories.refetch,
      filters,
      setFilters,
      canMutate: false,
      paginationController: familyCategories as ReturnType<typeof useResponsiveCategories>,
    };
  }

  return {
    mode: "management",
    categories: managementCategories.data,
    pagination,
    loading: managementCategories.loading,
    error: managementCategories.error,
    refetch: managementCategories.refetch,
    filters,
    setFilters,
    managementActions,
    canMutate: true,
    paginationController: managementCategories,
  };
}
