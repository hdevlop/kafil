import { entityKeys } from "najm-kit/query/keys";

import type { SponsorOrderQuery } from "../sponsorTypes";

export const sponsorOrderKeys = {
  all: entityKeys.all("sponsor-orders"),
  list(query: SponsorOrderQuery) {
    return entityKeys.list("sponsor-orders", {
      limit: query.limit,
      offset: query.offset,
    });
  },
  detail(id: string) {
    return entityKeys.detail("sponsor-orders", id);
  },
};
