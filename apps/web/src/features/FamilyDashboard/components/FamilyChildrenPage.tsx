"use client";

import { Baby } from "lucide-react";
import { NPageLayout } from "najm-kit";

import { PageEmptyState, PageErrorState, PageLoadingState } from "@/shared/PageState";
import PageHeaderGlobalActions from "@/shared/PageHeaderGlobalActions";
import { DashboardPageHeader as NPageHeader } from "@/shared/DashboardShell/DashboardPageHeader";

import { useOwnFamilyChildren } from "../hooks/useFamilyDashboard";
import { FamilyChildCard } from "./FamilyChildCard";

export function FamilyChildrenPage() {
  const children = useOwnFamilyChildren();

  if (children.isPending) return <PageLoadingState label="Loading child records..." />;

  if (children.isError) {
    return <PageErrorState error={children.error} title="We could not load your children" onRetry={() => void children.refetch()} />;
  }

  const familyChildren = children.data ?? [];

  return (
    <NPageLayout className="flex h-full min-h-0 flex-col gap-4">
      <NPageHeader
        icon={Baby}
        title="Your children"
        subtitle="Review child records linked to your family profile."
        actions={<PageHeaderGlobalActions />}
      />
      {familyChildren.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {familyChildren.map((child) => <FamilyChildCard child={child} key={child.id} />)}
        </div>
      ) : (
        <PageEmptyState title="No child records yet" description="An operator can add child records to your family profile." />
      )}
    </NPageLayout>
  );
}
