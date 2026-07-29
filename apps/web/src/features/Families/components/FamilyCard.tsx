"use client";

import {
  Baby,
  BadgeCheck,
  Flag,
  HeartHandshake,
} from "lucide-react";
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
import {
  fundingProgressPercent,
  FundingProgressBar,
} from "@/shared/FundingProgressCard";
import { StatusBadge } from "@/shared/StatusBadge";
import { ProtectedImage } from "@/shared/ProtectedImage";
import { getFamilyAvatarImage } from "@/lib/personImages";
import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";

import type { FamilyRecord } from "../types";

export function FamilyCard({ data }: Readonly<{ data: FamilyRecord }>) {
  const { t } = useKafilLanguage();
  const dialog = useDialog();
  const fundingStatus = data.funding?.status === "active" ? "active" : "pending";
  const capacityStatus = data.funding?.capacityStatus ?? "open";
  const hasReachedTarget = data.funding ? fundingProgressPercent(data.funding) >= 100 : false;
  const isClosed =
    hasReachedTarget || capacityStatus === "reserved" || capacityStatus === "funded";
  const disabledReason =
    hasReachedTarget || capacityStatus === "funded"
      ? t("funding.funded")
      : capacityStatus === "reserved"
        ? t("funding.reserved")
        : null;
  const supportPriorityLabel =
    data.supportPriority === "urgent"
      ? t("operator.families.supportPriorityUrgent")
      : data.supportPriority === "high"
        ? t("operator.families.supportPriorityHigh")
        : t("operator.families.supportPriorityNormal");

  function openSupport() {
    if (isClosed) return;
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
          <ProtectedImage
            src={getFamilyAvatarImage(data.image)}
            alt={data.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 33vw, 20vw"
            className="object-cover"
          />
        </NCardMedia>
        <NCardAction>
          <StatusBadge status={fundingStatus} />
        </NCardAction>
        <NCardSection>
          <NCardInfo
            icon={Flag}
            label={t("operator.families.supportPriority")}
            value={supportPriorityLabel}
            valueClassName={
              data.supportPriority === "urgent"
                ? "font-medium text-destructive"
                : data.supportPriority === "high"
                  ? "font-medium text-warning"
                  : undefined
            }
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
          className={
            isClosed
              ? "w-full bg-gray-400/70 text-gray-700 hover:bg-gray-400/70 disabled:opacity-100 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
              : "w-full"
          }
          leftIcon={HeartHandshake}
          variant={isClosed ? "secondary" : "default"}
          disabled={isClosed}
          title={disabledReason ?? undefined}
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
