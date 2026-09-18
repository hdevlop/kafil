"use client";

import { useEntityQuery, type EntityQueryOptions } from "najm-kit/query";
import {
  listFamilyCatalogCategories,
  listFamilyCatalogProducts,
} from "@/services/familyCatalogApi";

import { familyCatalogKeys } from "./familyCatalogKeys";
import type { FamilyCatalogCategory, FamilyCatalogProduct, FamilyCatalogQuery } from "../familyCatalogTypes";

export function useFamilyCatalogCategories(
  options: Partial<EntityQueryOptions<FamilyCatalogCategory[]>> = {},
) {
  return useEntityQuery<FamilyCatalogCategory[]>({
    queryKey: familyCatalogKeys.categories,
    queryFn: () => listFamilyCatalogCategories(),
    ...options,
  });
}

export function useFamilyCatalogProducts(
  query: FamilyCatalogQuery,
  options: Partial<EntityQueryOptions<FamilyCatalogProduct[]>> = {},
) {
  return useEntityQuery<FamilyCatalogProduct[]>({
    queryKey: familyCatalogKeys.products(query),
    queryFn: () => listFamilyCatalogProducts(query),
    ...options,
  });
}
