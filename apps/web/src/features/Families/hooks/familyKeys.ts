import { entityKeys } from "@/hooks/queryKeys";
import type { OffsetPagination } from "@/lib/pagination";

export const familyKeys = {
  all: entityKeys.all("families"),
  list(pagination: OffsetPagination) {
    return entityKeys.list("families", {
      limit: pagination.limit,
      offset: pagination.offset,
    });
  },
  detail(id: string) {
    return entityKeys.detail("families", id);
  },
};
