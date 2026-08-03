"use client";
import { useEntityCommand } from "@/hooks/useEntityCommand";
import { useEntityQuery } from "@/hooks/useEntityQuery";
import { listSponsorSupport, selectSponsorFamily } from "@/services/sponsorWorkspaceApi";

const keys = {
  all: ["sponsor-workspace"] as const,
  support: ["sponsor-workspace", "support"] as const,
};

export function useSponsorSupport(enabled = true) {
  return useEntityQuery({
    queryKey: keys.support,
    queryFn: listSponsorSupport,
    enabled,
  });
}

export function useSponsorFamilySupportCommand() {
  return useEntityCommand({
    mutationFn: selectSponsorFamily,
    invalidate: [keys.all],
    successMessage: "Family selected for support.",
    errorMessage: "Could not select this family for support.",
  });
}