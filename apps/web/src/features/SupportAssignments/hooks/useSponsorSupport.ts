"use client";

import { useEntityCommand } from "@/hooks/useEntityCommand";
import { selectSponsorFamily } from "@/services/sponsorWorkspaceApi";

const keys = {
  all: ["sponsor-workspace"] as const,
};

export function useSponsorFamilySupportCommand() {
  return useEntityCommand({
    mutationFn: selectSponsorFamily,
    invalidate: [keys.all],
    successMessage: "Family selected for support.",
    errorMessage: "Could not select this family for support.",
  });
}
