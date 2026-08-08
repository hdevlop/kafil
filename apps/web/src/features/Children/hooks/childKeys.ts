import { entityKeys } from "@/hooks/queryKeys";
import type { OffsetPagination } from "najm-kit/pagination";

export const childKeys = {
  all: entityKeys.all("children"),
  list(
    pagination: OffsetPagination & {
      role?: string | null;
      userId?: string | null;
    },
  ) {
    const { role, userId, ...rest } = pagination;
    return entityKeys.list("children", {
      ...rest,
      role: role ?? null,
      userId: userId ?? null,
    });
  },
  detail(id: string) {
    return entityKeys.detail("children", id);
  },
  families: entityKeys.all("families"),
};