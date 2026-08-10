"use client";

import { Baby, HandCoins, HeartHandshake } from "lucide-react";
import { NSheet } from "najm-kit";
import { getPersonImage } from "najm-kit/person-images";

import { SponsorContributionWorkspace } from "@/features/Contributions/components/SponsorContributionWorkspace";
import { useKafilLanguage } from "@/i18n/useKafilLanguage";
import { FundingProgressBar } from "@/shared/FundingProgressCard";
import { NNextImage } from "najm-kit/next";

import type { SponsorFamilyView } from "../types";

interface SponsorContributionSelection {
  assignmentId: string;
  family: SponsorFamilyView;
}

export function SponsorContributionSheet({
  onOpenChange,
  selection,
}: Readonly<{
  onOpenChange: (open: boolean) => void;
  selection: SponsorContributionSelection | null;
}>) {
  const { t } = useKafilLanguage();
  const family = selection?.family;

  return (
    <NSheet
      classNames={{ body: "p-4", content: "bg-background" }}
      icon={HandCoins}
      onOpenChange={onOpenChange}
      open={Boolean(selection)}
      title={t("action.submitContribution")}
      width={440}
    >
      {selection && family ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-muted">
              <NNextImage unoptimized
                src={getPersonImage({ image: family.image, role: "family" })}
                alt={family.name}
                fill
                sizes="64px"
                className="object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-foreground">
                {family.name}
              </p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Baby aria-hidden className="size-4" />
                  {t("operator.families.children")}: {family.activeChildCount}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <HeartHandshake aria-hidden className="size-4" />
                  {t("operator.families.sponsors")}: {family.activeSponsorCount}
                </span>
              </div>
            </div>
          </div>
          {family.funding ? (
            <FundingProgressBar inline progress={family.funding} />
          ) : null}
          <SponsorContributionWorkspace
            hideFunding
            initialAssignmentId={selection.assignmentId}
            lockAssignment
            onCompleted={() => onOpenChange(false)}
            showPlans={false}
          />
        </div>
      ) : null}
    </NSheet>
  );
}

export type { SponsorContributionSelection };
