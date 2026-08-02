import { entityKeys } from "@/hooks/queryKeys";

import type { SponsorOrderQuery } from "../sponsorTypes";

export const sponsorOrderKeys = {
  all: entityKeys.all("sponsor-orders"),
  list(query: SponsorOrderQuery) {
    return entityKeys.list("sponsor-orders", {
      limit: query.limit,
      offset: query.offset,
    });
  },
};
