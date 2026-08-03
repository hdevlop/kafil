import { entityKeys } from "@/hooks/queryKeys";

import type { ContributionListQuery } from "../types";

export const contributionKeys = {
  all: entityKeys.all("contributions"),
  list(query: ContributionListQuery & { role?: string | null }) {
    const { role, ...rest } = query;
    return entityKeys.list("contributions", {
      audience: rest.audience ?? "management",
      familyProfileId: rest.familyProfileId,
      limit: rest.limit,
      offset: rest.offset,
      role: role ?? null,
      status: rest.status,
    });
  },
  recordingOptions: ["contributions", "recording-options"] as const,
  detail(id: string) {
    return entityKeys.detail("contributions", id);
  },
};