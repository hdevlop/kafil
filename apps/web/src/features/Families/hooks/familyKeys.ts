import { entityKeys } from "@/hooks/queryKeys";
import type { OffsetPagination } from "@/lib/pagination";
import type { ListFamiliesFilters } from "@/services/familyApi";

export const familyKeys = {
  all: entityKeys.all("families"),
  list(
    pagination: OffsetPagination,
    filters: ListFamiliesFilters = {},
  ) {
    return entityKeys.list("families", {
      limit: pagination.limit,
      offset: pagination.offset,
      ...(filters.search ? { search: filters.search } : {}),
      ...(filters.status ? { status: filters.status } : {}),
    });
  },
  detail(id: string) {
    return entityKeys.detail("families", id);
  },
};
