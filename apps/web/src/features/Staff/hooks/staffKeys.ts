import { entityKeys } from "@/hooks/queryKeys";

import type { StaffListQuery } from "../types";

function toRecord(query: StaffListQuery): Record<string, unknown> {
  const filters: Record<string, unknown> = {};
  if (query.limit !== undefined) filters.limit = query.limit;
  if (query.offset !== undefined) filters.offset = query.offset;
  if (query.search !== undefined) filters.search = query.search;
  if (query.status !== undefined) filters.status = query.status;
  if (query.affiliation !== undefined) filters.affiliation = query.affiliation;
  if (query.functionKey !== undefined) filters.functionKey = query.functionKey;
  if (query.hasAccess !== undefined) filters.hasAccess = query.hasAccess;
  if (query.sortBy !== undefined) filters.sortBy = query.sortBy;
  if (query.sortDirection !== undefined) filters.sortDirection = query.sortDirection;
  return filters;
}

export const staffKeys = {
  all: entityKeys.all("staff"),
  list(query: StaffListQuery) {
    return entityKeys.list("staff", toRecord(query));
  },
  detail(id: string) {
    return entityKeys.detail("staff", id);
  },
  deliveryOptions: entityKeys.list("staff", { scope: "delivery-options" }),
};
