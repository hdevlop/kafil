import { entityKeys } from "@/hooks/queryKeys";
import type { OffsetPagination } from "@/lib/pagination";

export const categoryKeys = {
  all: entityKeys.all("categories"),
  list(pagination: OffsetPagination) {
    return entityKeys.list("categories", {
      limit: pagination.limit,
      offset: pagination.offset,
    });
  },
  detail(id: string) {
    return entityKeys.detail("categories", id);
  },
};
