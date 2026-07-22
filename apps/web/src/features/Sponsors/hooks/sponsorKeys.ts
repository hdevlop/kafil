import { entityKeys } from "@/hooks/queryKeys";
import type { OffsetPagination } from "@/lib/pagination";

export const sponsorKeys = {
  all: entityKeys.all("sponsors"),
  list(pagination: OffsetPagination) {
    return entityKeys.list("sponsors", {
      limit: pagination.limit,
      offset: pagination.offset,
    });
  },
  detail(id: string) {
    return entityKeys.detail("sponsors", id);
  },
};
