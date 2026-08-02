"use client";

import { useState } from "react";

import { useKafilRole } from "@/shared/Authorization/useKafilRole";
import { useCategories, useCategoryCommands } from "@/features/Categories/hooks/useCategories";
import { useFamilyCatalogCategories } from "@/features/Products/hooks/useFamilyCatalog";
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
}

export function useCategoriesWorkspace(
  pagination: OffsetPagination,
  initialFilters: CategoriesWorkspaceFilters = {},
): CategoriesWorkspace {
  const { isExactFamily } = useKafilRole();
  const [filters, setFilters] = useState<CategoriesWorkspaceFilters>(
    initialFilters,
  );

  const managementCategories = useCategories(pagination, { enabled: !isExactFamily });
  const managementActions = useCategoryCommands();
  const familyCategories = useFamilyCatalogCategories({ enabled: isExactFamily });

  if (isExactFamily) {
    return {
      mode: "family",
      categories: familyCategories.data ?? [],
      pagination,
      loading: familyCategories.isPending,
      error: familyCategories.error,
      refetch: familyCategories.refetch,
      filters,
      setFilters,
      canMutate: false,
    };
  }

  return {
    mode: "management",
    categories: managementCategories.data ?? [],
    pagination,
    loading: managementCategories.isPending,
    error: managementCategories.error,
    refetch: managementCategories.refetch,
    filters,
    setFilters,
    managementActions,
    canMutate: true,
  };
}
