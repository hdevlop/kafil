"use client";

import { useEntityCommand } from "@/hooks/useEntityCommand";
import { useEntityQuery } from "@/hooks/useEntityQuery";
import { catalogWriteKeys } from "@/hooks/catalogWriteKeys";
import type { OffsetPagination } from "@/lib/pagination";
import {
  activateProduct,
  createProduct,
  deactivateProduct,
  deleteProduct,
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
  const invalidate = [...catalogWriteKeys];

  const create = useEntityCommand({
    mutationFn: createProduct,
    invalidate,
    successMessage: "Product created.",
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
  const remove = useEntityCommand({
    mutationFn: deleteProduct,
    invalidate,
    successMessage: "Product deleted permanently.",
    errorMessage: "Could not delete the product. It may have order history.",
  });

  return { create, update, activate, deactivate, remove };
}
