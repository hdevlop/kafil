"use client";

import { useEntityCommand } from "@/hooks/useEntityCommand";
import { useEntityQuery } from "@/hooks/useEntityQuery";
import type { OffsetPagination } from "@/lib/pagination";
import {
  activateProduct,
  createProduct,
  deactivateProduct,
  listProductCategories,
  listProducts,
  updateProduct,
} from "@/services/productApi";

import { productKeys } from "./productKeys";

export function useProducts(pagination: OffsetPagination) {
  return useEntityQuery({
    queryKey: productKeys.list(pagination),
    queryFn: () => listProducts(pagination),
  });
}

export function useProductCategories(enabled = true) {
  return useEntityQuery({
    queryKey: productKeys.categories,
    queryFn: listProductCategories,
    enabled,
  });
}

export function useProductCommands() {
  const invalidate = [productKeys.all];

  const create = useEntityCommand({
    mutationFn: createProduct,
    invalidate,
    successMessage: "Product created with an inventory balance.",
    errorMessage: "Could not create the product.",
  });
  const update = useEntityCommand({
    mutationFn: updateProduct,
    invalidate,
    successMessage: "Product updated.",
    errorMessage: "Could not update the product.",
  });
  const activate = useEntityCommand({
    mutationFn: activateProduct,
    invalidate,
    successMessage: "Product activated.",
    errorMessage: "Could not activate the product.",
  });
  const deactivate = useEntityCommand({
    mutationFn: deactivateProduct,
    invalidate,
    successMessage: "Product deactivated.",
    errorMessage: "Could not deactivate the product.",
  });

  return { create, update, activate, deactivate };
}
