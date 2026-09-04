"use client";

import { NErrorState, NLoadingState } from "najm-kit";

import { useOwnSponsorProfile } from "@/features/Sponsors/hooks/useSponsorProfile";
import { isSponsorProfileMissing } from "@/features/Sponsors/lib/isSponsorProfileMissing";
import { useTranslation } from "najm-i18n/react";
import { getPublicApiErrorMessage } from "@/services/apiError";

import { SponsorDashboardPage } from "./SponsorDashboardPage";

export function SponsorDashboardGate() {
  const { t } = useTranslation();
  const profile = useOwnSponsorProfile();
  const profileMissing = profile.isError && isSponsorProfileMissing(profile.error);

  if (profile.isPending || profileMissing) {
    return (
      <NLoadingState
        label={t(profileMissing ? "sponsor.profile.completeDescription" : "sponsor.profile.loading")}
        surface="panel"
      />
    );
  }

  if (profile.isError) {
    return (
      <NErrorState
        message={getPublicApiErrorMessage(profile.error, t("state.retry"))}
        title={t("dashboard.sponsor.workspaceLoadError")}
        onRetry={() => void profile.refetch()}
        surface="panel"
      />
    );
  }

  return <SponsorDashboardPage />;
}
