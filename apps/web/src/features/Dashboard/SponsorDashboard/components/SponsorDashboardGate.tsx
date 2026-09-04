"use client";

import { NErrorState } from "najm-kit";

import { useOwnSponsorProfile } from "@/features/Sponsors/hooks/useSponsorProfile";
import { isSponsorProfileMissing } from "@/features/Sponsors/lib/isSponsorProfileMissing";
import { useTranslation } from "najm-i18n/react";
import { getPublicApiErrorMessage } from "@/services/apiError";
import { SponsorDashboardSkeleton } from "@/features/Dashboard/shared/DashboardSkeletons";

import { useSponsorDashboard } from "../hooks/useSponsorDashboard";
import { SponsorDashboardPage } from "./SponsorDashboardPage";

export function SponsorDashboardGate() {
  const { t } = useTranslation();
  const profile = useOwnSponsorProfile();
  useSponsorDashboard(); // start in parallel; the page reuses this cache entry
  const profileMissing = profile.isError && isSponsorProfileMissing(profile.error);

  if (profile.isPending || profileMissing) {
    return (
      <SponsorDashboardSkeleton
        loadingLabel={t("state.loading")}
        title={t("dashboard.sponsor.loading")}
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
