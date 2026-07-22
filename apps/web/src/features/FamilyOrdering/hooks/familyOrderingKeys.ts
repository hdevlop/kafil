import { entityKeys } from "@/hooks/queryKeys";

import type { FamilyOrderQuery } from "../types";

export const familyOrderingKeys = {
  all: entityKeys.all("family-ordering"),
  cart: entityKeys.detail("family-ordering", "cart"),
  orders(query: FamilyOrderQuery) {
    return entityKeys.list("family-orders", { limit: query.limit, offset: query.offset });
  },
  order(id: string) {
    return entityKeys.detail("family-orders", id);
  },
};
