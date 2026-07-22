"use client";

import {
  Baby,
  BadgeCheck,
  HeartHandshake,
  UserRound,
} from "lucide-react";
import Image from "next/image";
import {
  NButton,
  NCard,
  NCardAction,
  NCardInfo,
  NCardMedia,
  NCardSection,
  useDialog,
} from "najm-kit";

import { CreateSupportAssignmentDialogContent } from "@/features/SupportAssignments/components/SupportAssignmentForms";
import { FundingProgressBar } from "@/shared/FundingProgressCard";
import { StatusBadge } from "@/shared/StatusBadge";
import { getFamilyAvatarImage } from "@/lib/personImages";
import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";

import type { FamilyRecord } from "../types";

export function FamilyCard({ data }: Readonly<{ data: FamilyRecord }>) {
  const { t } = useKafilLanguage();
  const dialog = useDialog();
  const fundingStatus = data.funding?.status === "active" ? "active" : "pending";

  function openSupport() {
    void dialog.openDialog({
      title: t("operator.assignments.createTitle"),
      description: t("operator.assignments.createDescription"),
      children: <CreateSupportAssignmentDialogContent familyProfileId={data.id} />,
      showButtons: false,
      size: "xl",
      height: "auto",
    });
  }

  return (
    <div className="w-full">
      <NCard
        embedded
        title={(
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate">{data.name}</span>
            {fundingStatus === "active" ? (
              <BadgeCheck
                aria-hidden
                className="size-4 shrink-0 fill-primary text-primary-foreground"
              />
            ) : null}
          </span>
        )}
      >
        <NCardMedia variant="image" size={104}>
          <Image
            src={getFamilyAvatarImage(data.image, data.relationshipToChildren)}
            alt={data.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 33vw, 20vw"
            className="object-cover"
            unoptimized
          />
        </NCardMedia>
        <NCardAction>
          <StatusBadge status={fundingStatus} />
        </NCardAction>
        <NCardSection>
          <NCardInfo
            icon={UserRound}
            label={t("operator.families.guardian")}
            maxChars={25}
            value={data.guardianLegalName}
          />
          <NCardInfo
            icon={Baby}
            label={t("operator.families.children")}
            value={data.activeChildCount}
          />
          <NCardInfo
            icon={HeartHandshake}
            label={t("operator.families.sponsors")}
            value={data.activeSponsorCount}
          />
        </NCardSection>
      </NCard>
      <div className="space-y-3 px-3 pb-3 sm:px-4 sm:pb-4">
        {data.funding ? <FundingProgressBar inline progress={data.funding} /> : null}
        <NButton
          className="w-full"
          leftIcon={HeartHandshake}
          onClick={(event) => {
            event.stopPropagation();
            openSupport();
          }}
        >
          {t("operator.assignments.create")}
        </NButton>
      </div>
    </div>
  );
}
