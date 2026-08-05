import type {
  FamilyCatalogCategory,
  FamilyCatalogProduct,
  FamilyCatalogQuery,
} from "@/features/Products/familyCatalogTypes";
import { cleanQuery } from "@/lib/pagination";
import { api } from "@/services/http";

export function listFamilyCatalogCategories(
  pagination = { limit: 25, offset: 0 },
  search?: string,
) {
  return api.get<FamilyCatalogCategory[]>("/catalog/browse/categories", {
    query: cleanQuery({ ...pagination, search: search?.trim() }),
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

export function getFamilyCatalogProduct(id: string) {
  return api.get<FamilyCatalogProduct>(`/catalog/browse/products/${id}`);
}
