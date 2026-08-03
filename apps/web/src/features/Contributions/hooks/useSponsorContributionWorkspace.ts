"use client";

import { useEntityCommand } from "@/hooks/useEntityCommand";
import { useEntityQuery } from "@/hooks/useEntityQuery";
import {
  changeSponsorPlan,
  createSponsorPlan,
  listSponsorFamilyCatalog,
  listSponsorPlans,
  listSponsorSupport,
  submitSponsorContribution,
} from "@/services/sponsorWorkspaceApi";

const sponsorContributionKeys = {
  all: ["sponsor-workspace"] as const,
  catalog: ["sponsor-workspace", "catalog"] as const,
  support: ["sponsor-workspace", "support"] as const,
  plans: ["sponsor-workspace", "plans"] as const,
};

export function useSponsorContributionWorkspace(enabled: boolean) {
  const catalog = useEntityQuery({
    queryKey: sponsorContributionKeys.catalog,
    queryFn: listSponsorFamilyCatalog,
    enabled,
  });
  const support = useEntityQuery({
    queryKey: sponsorContributionKeys.support,
    queryFn: listSponsorSupport,
    enabled,
  });
  const plans = useEntityQuery({
    queryKey: sponsorContributionKeys.plans,
    queryFn: () => listSponsorPlans({ limit: 50, offset: 0 }),
    enabled,
  });
  const invalidate = [sponsorContributionKeys.all, ["contributions"] as const];

  return {
    catalog,
    support,
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
