"use client";

import { useEntityCommand } from "@/hooks/useEntityCommand";
import { useEntityQuery } from "@/hooks/useEntityQuery";
import { useOffsetInfiniteQuery } from "@/hooks/useOffsetInfiniteQuery";
import {
  changeSponsorPlan,
  createSponsorPlan,
  listSponsorFamilyCatalog,
  listSponsorPlans,
  submitSponsorContribution,
} from "@/services/sponsorWorkspaceApi";

const sponsorContributionKeys = {
  all: ["sponsor-workspace"] as const,
  catalog: ["sponsor-workspace", "catalog"] as const,
  support: ["sponsor-workspace", "support"] as const,
  plans: ["sponsor-workspace", "plans"] as const,
};

export function useSponsorContributionWorkspace(enabled: boolean, search = "") {
  const catalog = useEntityQuery({
    queryKey: [...sponsorContributionKeys.catalog, search],
    queryFn: () => listSponsorFamilyCatalog({
      limit: 25,
      offset: 0,
      relationship: "supported",
      search: search || undefined,
    }),
    enabled,
  });
  const plans = useOffsetInfiniteQuery({
    queryKey: sponsorContributionKeys.plans,
    fetchPage: listSponsorPlans,
    enabled,
  });
  const invalidate = [sponsorContributionKeys.all, ["contributions"] as const];

  return {
    catalog,
    plans,
    createPlan: useEntityCommand({
      mutationFn: createSponsorPlan,
      invalidate,
      successMessage: "Contribution plan created.",
      errorMessage: "Could not create this plan.",
    }),
    submit: useEntityCommand({
      mutationFn: submitSponsorContribution,
      invalidate,
      successMessage: "Contribution submitted for validation.",
      errorMessage: "Could not submit this contribution.",
    }),
    changePlan: useEntityCommand({
      mutationFn: changeSponsorPlan,
      invalidate,
      successMessage: "Contribution plan updated.",
      errorMessage: "Could not update this plan.",
    }),
  };
}
