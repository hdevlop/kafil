import type {
  FamilyCatalogCategory,
  FamilyCatalogProduct,
  FamilyCatalogQuery,
} from "@/features/FamilyCatalog/types";
import { cleanQuery } from "@/lib/pagination";
import { api } from "@/services/http";

export function listFamilyCatalogCategories() {
  return api.get<FamilyCatalogCategory[]>("/catalog/browse/categories", {
    query: { limit: 100, offset: 0 },
  });
}

export function listFamilyCatalogProducts(query: FamilyCatalogQuery) {
  return api.get<FamilyCatalogProduct[]>("/catalog/browse/products", {
    query: cleanQuery({
      categoryId: query.categoryId,
      limit: query.limit,
      offset: query.offset,
      search: query.search?.trim(),
    }),
  });
}
