import { entityKeys } from "@/hooks/queryKeys";
import type { OffsetPagination } from "@/lib/pagination";

export const childKeys = {
  all: entityKeys.all("children"),
  list(pagination: OffsetPagination) {
    return entityKeys.list("children", {
      limit: pagination.limit,
      offset: pagination.offset,
    });
  },
  detail(id: string) {
    return entityKeys.detail("children", id);
  },
  families: entityKeys.all("families"),
};
