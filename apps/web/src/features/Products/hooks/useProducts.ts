"use client";

import { useEntityCommand } from "@/hooks/useEntityCommand";
import { useEntityQuery, type EntityQueryOptions } from "@/hooks/useEntityQuery";
import { useResponsiveOffsetList, type ListStrategy } from "najm-kit/query";
import { catalogWriteKeys } from "@/hooks/catalogWriteKeys";
import type { OffsetPagination } from "najm-kit/pagination";
import {
  type ListProductsFilters,
  activateProduct,
  createProduct,
  deactivateProduct,
  deleteProduct,
  listProductCategories,
  listProducts,
  updateProduct,
} from "@/services/productApi";

import { productKeys } from "./productKeys";
import type { ProductCategory, ProductRecord } from "../types";

export function useProducts(
  pagination: OffsetPagination,
  filters: ListProductsFilters = {},
  options: Partial<EntityQueryOptions<ProductRecord[]>> = {},
) {
  return useEntityQuery<ProductRecord[]>({
    queryKey: productKeys.list(pagination, filters),
    queryFn: async () => (await listProducts(pagination, filters)).rows,
    ...options,
  });
}

export function useResponsiveProducts(
  filters: ListProductsFilters = {},
  enabled = true,
  strategy: ListStrategy = "paged",
) {
  return useResponsiveOffsetList({
    enabled,
    strategy,
    queryKey: [...productKeys.all, "responsive", filters],
    fetchPage: (pagination) => listProducts(pagination, filters),
  });
}

export function useProductCategories(search = "", enabled = true) {
  return useEntityQuery<ProductCategory[]>({
    queryKey: [...productKeys.categories, search],
    queryFn: async () => (await listProductCategories(search || undefined)).rows,
    enabled,
  });
}

export function useResponsiveProductCategories(
  search = "",
  enabled = true,
  strategy: ListStrategy = "paged",
) {
  return useResponsiveOffsetList<ProductCategory>({
    enabled,
    strategy,
    queryKey: [...productKeys.categories, "responsive", search],
    fetchPage: (pagination) => listProductCategories(search || undefined, pagination),
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
    errorMessage: "Could not delete the product. It may have order or inventory history.",
  });

  return { create, update, activate, deactivate, remove };
}
