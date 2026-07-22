import { entityKeys } from "@/hooks/queryKeys";
import type { OffsetPagination } from "@/lib/pagination";

export const productKeys = {
  all: entityKeys.all("products"),
  categories: ["products", "categories"] as const,
  list(pagination: OffsetPagination) {
    return entityKeys.list("products", {
      limit: pagination.limit,
      offset: pagination.offset,
    });
  },
  detail(id: string) {
    return entityKeys.detail("products", id);
  },
};
