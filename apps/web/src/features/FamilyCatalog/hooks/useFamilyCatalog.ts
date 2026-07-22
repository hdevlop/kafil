"use client";

import { useEntityQuery } from "@/hooks/useEntityQuery";
import {
  listFamilyCatalogCategories,
  listFamilyCatalogProducts,
} from "@/services/familyCatalogApi";

import { familyCatalogKeys } from "./familyCatalogKeys";
import type { FamilyCatalogQuery } from "../types";

export function useFamilyCatalogCategories() {
  return useEntityQuery({
    queryKey: familyCatalogKeys.categories,
    queryFn: listFamilyCatalogCategories,
  });
}

export function useFamilyCatalogProducts(query: FamilyCatalogQuery) {
  return useEntityQuery({
    queryKey: familyCatalogKeys.products(query),
    queryFn: () => listFamilyCatalogProducts(query),
  });
}
