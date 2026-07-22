"use client";

import { Baby, HeartHandshake } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { NButton, NCard, NPageLayout, NSectionInfo } from "najm-kit";

import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import { getFamilyAvatarImage } from "@/lib/personImages";
import { FundingProgressBar } from "@/shared/FundingProgressCard";
import { PageEmptyState } from "@/shared/PageState";
import PageHeaderGlobalActions from "@/shared/PageHeaderGlobalActions";
import { DashboardPageHeader as NPageHeader } from "@/shared/DashboardShell/DashboardPageHeader";

import {
  useSponsorFamilyCatalog,
  useSponsorFamilySupportCommand,
  useSponsorSupport,
} from "../hooks/useSponsorWorkspace";
import type { SponsorFamilyCatalogEntry } from "../types";

function SponsorFamilyCard({
  family,
  assignmentId,
  disabled,
  onSupport,
  onContribute,
}: Readonly<{
  family: SponsorFamilyCatalogEntry;
  assignmentId?: string;
  disabled: boolean;
  onSupport: (familyId: string) => void;
  onContribute: (assignmentId: string) => void;
}>) {
  const { t } = useKafilLanguage();

  return (
    <article className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="relative h-40 overflow-hidden rounded-xl bg-muted">
        <Image
          src={getFamilyAvatarImage(family.image, null)}
          alt={family.reference}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover"
          unoptimized
        />
      </div>
      <p className="font-semibold">{family.reference}</p>
      <div className="rounded-xl bg-muted/50 p-3">
        <NSectionInfo
          icon={Baby}
          label={t("sponsor.directory.activeChildren")}
          value={family.activeChildCount}
        />
      </div>
      {family.funding ? <FundingProgressBar inline progress={family.funding} /> : null}
      <NButton
        className="w-full"
        disabled={disabled}
        leftIcon={HeartHandshake}
        onClick={() => {
          if (assignmentId) {
            onContribute(assignmentId);
            return;
          }
          onSupport(family.id);
        }}
      >
        {assignmentId
          ? t("sponsor.directory.contribute")
          : t("sponsor.directory.support")}
      </NButton>
    </article>
  );
}

export function SponsorSupportPage() {
  const { t } = useKafilLanguage();
  const router = useRouter();
  const catalog = useSponsorFamilyCatalog();
  const support = useSponsorSupport();
  const selectFamily = useSponsorFamilySupportCommand();

  function contribute(assignmentId: string) {
    router.push(`/sponsor/contributions?assignment=${encodeURIComponent(assignmentId)}`);
  }

  async function selectAndContribute(familyId: string) {
    const assignment = await selectFamily.mutateAsync({ familyProfileId: familyId });
    contribute(assignment.id);
  }

  const header = (
    <NPageHeader
      actions={<PageHeaderGlobalActions />}
      icon={HeartHandshake}
      subtitle={t("sponsor.directory.subtitle")}
      title={t("sponsor.directory.title")}
    />
  );

  if (catalog.isPending || support.isPending) {
    return (
      <NPageLayout className="flex h-full min-h-0 flex-col gap-4">
        {header}
        <NCard title={t("sponsor.directory.loading")} loading />
      </NPageLayout>
    );
  }

  if (catalog.isError || support.isError) {
    return (
      <NPageLayout className="flex h-full min-h-0 flex-col gap-4">
        {header}
        <NCard title={t("sponsor.directory.error")}>
          <NButton variant="outline" onClick={() => void catalog.refetch()}>
            {t("action.retry")}
          </NButton>
        </NCard>
      </NPageLayout>
    );
  }

  const activeAssignments = new Map(
    (support.data ?? [])
      .filter((item) => item.assignment.status === "active" && !item.assignment.childId)
      .map((item) => [item.assignment.familyProfileId, item.assignment.id]),
  );

  return (
    <NPageLayout className="flex h-full min-h-0 flex-col gap-4">
      {header}
      {catalog.data?.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {catalog.data.map((family) => (
            <SponsorFamilyCard
              assignmentId={activeAssignments.get(family.id)}
              disabled={selectFamily.isPending}
              family={family}
              key={family.id}
              onContribute={contribute}
              onSupport={(familyId) => void selectAndContribute(familyId)}
            />
          ))}
        </div>
      ) : (
        <PageEmptyState
          description={t("sponsor.directory.emptyDescription")}
          title={t("sponsor.directory.emptyTitle")}
        />
      )}
    </NPageLayout>
  );
}
