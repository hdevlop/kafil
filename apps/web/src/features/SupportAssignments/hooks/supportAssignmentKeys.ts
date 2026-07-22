import { entityKeys } from "@/hooks/queryKeys";
import type { OffsetPagination } from "@/lib/pagination";

export const supportAssignmentKeys = {
  all: entityKeys.all("support-assignments"),
  list(pagination: OffsetPagination) {
    return entityKeys.list("support-assignments", {
      limit: pagination.limit,
      offset: pagination.offset,
    });
  },
  detail(id: string) {
    return entityKeys.detail("support-assignments", id);
  },
  sources: ["support-assignments", "sources"] as const,
};
