import { entityKeys } from "@/hooks/queryKeys";

import type { OrderListQuery } from "../types";

export const orderKeys = {
  all: entityKeys.all("orders"),
  list(query: OrderListQuery) {
    return entityKeys.list("orders", {
      limit: query.limit,
      offset: query.offset,
    });
  },
  detail(id: string) {
    return entityKeys.detail("orders", id);
  },
};
