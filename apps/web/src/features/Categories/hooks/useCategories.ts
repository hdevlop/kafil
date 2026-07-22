"use client";

import { useEntityCommand } from "@/hooks/useEntityCommand";
import { useEntityQuery } from "@/hooks/useEntityQuery";
import type { OffsetPagination } from "@/lib/pagination";
import {
  activateCategory,
  createCategory,
  deactivateCategory,
  listCategories,
  updateCategory,
} from "@/services/categoryApi";

import { categoryKeys } from "./categoryKeys";

export function useCategories(pagination: OffsetPagination) {
  return useEntityQuery({
    queryKey: categoryKeys.list(pagination),
    queryFn: () => listCategories(pagination),
  });
}

export function useCategoryCommands() {
  const invalidate = [categoryKeys.all];

  const create = useEntityCommand({
    mutationFn: createCategory,
    invalidate,
    successMessage: "Category created.",
    errorMessage: "Could not create the category.",
  });
  const update = useEntityCommand({
    mutationFn: updateCategory,
    invalidate,
    successMessage: "Category updated.",
    errorMessage: "Could not update the category.",
  });
  const activate = useEntityCommand({
    mutationFn: activateCategory,
    invalidate,
    successMessage: "Category activated.",
    errorMessage: "Could not activate the category.",
  });
  const deactivate = useEntityCommand({
    mutationFn: deactivateCategory,
    invalidate,
    successMessage: "Category deactivated.",
    errorMessage: "Could not deactivate the category.",
  });

  return { create, update, activate, deactivate };
}
