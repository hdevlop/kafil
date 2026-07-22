"use client";

import { HeartHandshake } from "lucide-react";
import { NCard, NPageLayout } from "najm-kit";

import { PageErrorState } from "@/shared/PageState";
import PageHeaderGlobalActions from "@/shared/PageHeaderGlobalActions";
import { DashboardPageHeader as NPageHeader } from "@/shared/DashboardShell/DashboardPageHeader";

import { useOwnSponsorProfile } from "../hooks/useSponsorProfile";
import { isSponsorProfileMissing } from "../lib/isSponsorProfileMissing";
import { CreateOwnSponsorProfileForm, UpdateOwnSponsorProfileForm } from "./SponsorProfileForms";
import { SponsorProfileDetails } from "./SponsorProfileDetails";

export function SponsorProfilePage() {
  const profile = useOwnSponsorProfile();

  if (profile.isPending) {
    return (
      <NPageLayout className="flex h-full min-h-0 flex-col gap-4">
        <NPageHeader icon={HeartHandshake} title="Your sponsor profile" subtitle="Loading your protected account details." actions={<PageHeaderGlobalActions />} />
        <NCard title="Loading profile" description="Retrieving your sponsor profile." loading />
      </NPageLayout>
    );
  }

  if (profile.isError && !isSponsorProfileMissing(profile.error)) {
    return <PageErrorState error={profile.error} title="We could not load your sponsor profile" onRetry={() => void profile.refetch()} />;
  }

  if (isSponsorProfileMissing(profile.error)) {
    return (
      <NPageLayout className="flex h-full min-h-0 flex-col gap-4">
        <NPageHeader icon={HeartHandshake} title="Complete your sponsor profile" subtitle="Set up the private profile required before you can manage support." actions={<PageHeaderGlobalActions />} />
        <NCard title="Welcome to Kafil" description="Complete these required details to open your sponsor workspace.">
          <CreateOwnSponsorProfileForm />
        </NCard>
      </NPageLayout>
    );
  }

  if (!profile.data) {
    return <PageErrorState title="We could not load your sponsor profile" onRetry={() => void profile.refetch()} />;
  }

  return (
    <NPageLayout className="flex h-full min-h-0 flex-col gap-4">
      <NPageHeader icon={HeartHandshake} title="Your sponsor profile" subtitle="Review and update the private details attached to your support account." actions={<PageHeaderGlobalActions />} />
      <SponsorProfileDetails profile={profile.data} />
      <NCard title="Update profile" description="Your changes are kept within your sponsor account.">
        <UpdateOwnSponsorProfileForm profile={profile.data} />
      </NCard>
    </NPageLayout>
  );
}
