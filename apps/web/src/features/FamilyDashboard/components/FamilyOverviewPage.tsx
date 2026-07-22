"use client";

import { Baby, House, UsersRound } from "lucide-react";
import { NButton, NCard, NPageLayout, NStatCard } from "najm-kit";
import Link from "next/link";

import { PageEmptyState, PageErrorState } from "@/shared/PageState";
import PageHeaderGlobalActions from "@/shared/PageHeaderGlobalActions";
import { DashboardPageHeader as NPageHeader } from "@/shared/DashboardShell/DashboardPageHeader";

import { getFamilyChildStatusCounts } from "../config/familyChildSummary";
import { useOwnFamilyChildren, useOwnFamilyProfile } from "../hooks/useFamilyDashboard";
import { FamilyChildCard } from "./FamilyChildCard";
import { FamilyHouseholdCard } from "./FamilyHouseholdCard";

export function FamilyOverviewPage() {
  const profile = useOwnFamilyProfile();
  const children = useOwnFamilyChildren();

  if (profile.isError) {
    return <PageErrorState error={profile.error} title="We could not load your household" onRetry={() => void profile.refetch()} />;
  }

  if (children.isError) {
    return <PageErrorState error={children.error} title="We could not load your children" onRetry={() => void children.refetch()} />;
  }

  const familyChildren = children.data ?? [];
  const counts = getFamilyChildStatusCounts(familyChildren);

  return (
    <NPageLayout className="flex h-full min-h-0 flex-col gap-4">
      <NPageHeader
        icon={House}
        title={profile.data ? `Welcome, ${profile.data.name}` : "Family workspace"}
        subtitle="Review your family profile and the child records linked to it."
        actions={<PageHeaderGlobalActions />}
      />

      {profile.data ? (
        <FamilyHouseholdCard profile={profile.data} />
      ) : (
        <NCard title="Loading your household" description="Retrieving your protected family profile." loading />
      )}

      <section className="grid gap-4 sm:grid-cols-2">
        <NStatCard icon={Baby} label="Children" value={String(counts.total)} subtext="Linked to your household" />
        <NStatCard icon={UsersRound} label="Active child records" value={String(counts.active)} subtext={counts.inactive ? `${counts.inactive} inactive record${counts.inactive === 1 ? "" : "s"}` : "All child records are active"} />
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Your children</h2>
            <p className="text-sm text-muted-foreground">Only records linked to your household are shown.</p>
          </div>
          <NButton asChild variant="outline">
            <Link href="/family/children">View all children</Link>
          </NButton>
        </div>

        {children.isPending ? (
          <NCard title="Loading child records" description="Retrieving children linked to your household." loading />
        ) : familyChildren.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {familyChildren.slice(0, 3).map((child) => <FamilyChildCard child={child} key={child.id} />)}
          </div>
        ) : (
          <PageEmptyState title="No child records yet" description="An operator can add child records to your family profile." />
        )}
      </section>
    </NPageLayout>
  );
}
