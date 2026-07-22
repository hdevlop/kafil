import { entityKeys } from "@/hooks/queryKeys";

import type { ContributionListQuery } from "../types";

export const contributionKeys = {
  all: entityKeys.all("contributions"),
  list(query: ContributionListQuery) {
    return entityKeys.list("contributions", {
      familyProfileId: query.familyProfileId,
      limit: query.limit,
      offset: query.offset,
      status: query.status,
    });
  },
  recordingOptions: ["contributions", "recording-options"] as const,
  detail(id: string) {
    return entityKeys.detail("contributions", id);
  },
};
