import { entityKeys } from "@/hooks/queryKeys";
import type { OffsetPagination } from "najm-kit/pagination";
import type { ListProductsFilters } from "@/services/productApi";

export const productKeys = {
  all: entityKeys.all("products"),
  categories: ["products", "categories"] as const,
  list(
    pagination: OffsetPagination,
    filters: ListProductsFilters = {},
  ) {
    return entityKeys.list("products", {
      limit: pagination.limit,
      offset: pagination.offset,
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.search ? { search: filters.search } : {}),
    });
  },
  detail(id: string) {
    return entityKeys.detail("products", id);
  },
};
