import { entityKeys } from "najm-kit/query/keys";
import type { OffsetPagination } from "najm-kit/pagination";

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
  full: ["support-assignments", "list", "all"] as const,
  sources: ["support-assignments", "sources"] as const,
};
