"use client";

import { useEntityCommand } from "@/hooks/useEntityCommand";
import { useEntityQuery } from "@/hooks/useEntityQuery";
import { catalogWriteKeys } from "@/hooks/catalogWriteKeys";
import type { OffsetPagination } from "@/lib/pagination";
import {
  activateCategory,
  createCategory,
  deactivateCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from "@/services/categoryApi";

import { categoryKeys } from "./categoryKeys";

export function useCategories(pagination: OffsetPagination) {
  return useEntityQuery({
    queryKey: categoryKeys.list(pagination),
    queryFn: () => listCategories(pagination),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
}

export function useCategoryCommands() {
  const invalidate = [...catalogWriteKeys];

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
  const remove = useEntityCommand({
    mutationFn: deleteCategory,
    invalidate,
    successMessage: "Category deleted permanently.",
    errorMessage: "Could not delete the category. It may have order or inventory history.",
  });

  return { create, update, activate, deactivate, remove };
}
