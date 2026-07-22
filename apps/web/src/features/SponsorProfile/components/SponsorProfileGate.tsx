"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { SponsorDashboardPage } from "@/features/Dashboard";
import { PageErrorState, PageLoadingState } from "@/shared/PageState";

import { useOwnSponsorProfile } from "../hooks/useSponsorProfile";
import { isSponsorProfileMissing } from "../lib/isSponsorProfileMissing";

export function SponsorProfileGate() {
  const router = useRouter();
  const profile = useOwnSponsorProfile();
  const profileMissing = profile.isError && isSponsorProfileMissing(profile.error);

  useEffect(() => {
    if (profileMissing) router.replace("/sponsor/profile");
  }, [profileMissing, router]);

  if (profile.isPending || profileMissing) {
    return <PageLoadingState label={profileMissing ? "Opening profile completion..." : "Checking your sponsor profile..."} />;
  }

  if (profile.isError) {
    return <PageErrorState error={profile.error} title="We could not load your sponsor workspace" onRetry={() => void profile.refetch()} />;
  }

  return <SponsorDashboardPage />;
}
