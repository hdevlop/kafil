"use client";

import { useOwnSponsorProfile } from "@/features/Sponsors/hooks/useSponsorProfile";
import { isSponsorProfileMissing } from "@/features/Sponsors/lib/isSponsorProfileMissing";
import { useKafilLanguage } from "@/i18n/useKafilLanguage";
import { PageErrorState, PageLoadingState } from "@/shared/PageState";

import { SponsorDashboardPage } from "./SponsorDashboardPage";

export function SponsorDashboardGate() {
  const { t } = useKafilLanguage();
  const profile = useOwnSponsorProfile();
  const profileMissing = profile.isError && isSponsorProfileMissing(profile.error);

  if (profile.isPending || profileMissing) {
    return <PageLoadingState label={t(profileMissing ? "sponsor.profile.completeDescription" : "sponsor.profile.loading")} />;
  }

  if (profile.isError) {
    return <PageErrorState error={profile.error} title="We could not load your sponsor workspace" onRetry={() => void profile.refetch()} />;
  }

  return <SponsorDashboardPage />;
}
