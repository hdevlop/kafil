"use client";

import {
  Baby,
  BadgeCheck,
  Flag,
  HeartHandshake,
} from "lucide-react";
import type { SVGProps } from "react";
import {
  NButton,
  NBadge,
  NCard,
  NCardAction,
  NCardInfo,
  NCardMedia,
  NCardSection,
  useDialog,
} from "najm-kit";

import { getPersonImage } from "najm-kit/person-images";
import { CreateSupportAssignmentDialogContent } from "@/features/SupportAssignments/components/SupportAssignmentForms";
import { useSponsorFamilySupportCommand } from "@/features/SupportAssignments/hooks/useSponsorSupport";
import { FundingProgressBar } from "@/shared/FundingProgressCard";
import { NNextImage } from "najm-kit/next";
import { useTranslation } from "najm-i18n/react";

import { useFamilyCardStatus } from "../../hooks/useFamilyCardStatus";
import type { FamilyRecord, SponsorFamilyView } from "../../types";

type FamilyCardData = FamilyRecord | SponsorFamilyView;

function SupportedFamilyIcon(props: Readonly<SVGProps<SVGSVGElement>>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...props}>
      <path
        d="m12 2.75 2.72 5.52 6.09.89-4.41 4.29 1.04 6.07L12 16.66l-5.44 2.86 1.04-6.07-4.41-4.29 6.09-.89L12 2.75Z"
        fill="currentColor"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1"
      />
    </svg>
  );
}

function isSponsorFamily(data: FamilyCardData): data is SponsorFamilyView {
  return "relationship" in data;
}

function SponsorFamilyAction({
  data,
  isClosed,
  onContribute,
}: Readonly<{
  data: SponsorFamilyView;
  isClosed: boolean;
  onContribute?: (family: SponsorFamilyView, assignmentId: string) => void;
}>) {
  const { t } = useTranslation();
  const selectFamily = useSponsorFamilySupportCommand();
  const closedLabel = data.funding?.capacityStatus === "reserved"
    ? t("sponsor.directory.coveredByPending")
    : t("sponsor.directory.targetReached");

  async function continueSupport() {
    if (data.assignmentId) {
      onContribute?.(data, data.assignmentId);
      return;
    }

    const assignment = await selectFamily.mutateAsync({
      familyProfileId: data.id,
    });
    onContribute?.(data, assignment.id);
  }

  return (
    <NButton
        className={
          isClosed
            ? "w-full bg-gray-400/70 text-gray-700 hover:bg-gray-400/70 disabled:opacity-100 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
            : "w-full"
        }
        disabled={isClosed || selectFamily.isPending}
        leftIcon={HeartHandshake}
        title={isClosed ? t("funding.funded") : undefined}
        variant={isClosed ? "secondary" : "default"}
        onClick={() => void continueSupport()}
      >
        {isClosed
          ? closedLabel
          : t(
              data.assignmentId
                ? "sponsor.directory.contribute"
                : "sponsor.directory.support",
            )}
      </NButton>
  );
}

export function FamilyCard({
  data,
  onContribute,
}: Readonly<{
  data: FamilyCardData;
  onContribute?: (family: SponsorFamilyView, assignmentId: string) => void;
}>) {
  const { t } = useTranslation();
  const dialog = useDialog();
  const sponsorFamily = isSponsorFamily(data) ? data : null;
  const { fundingStatus, isClosed, disabledReason, supportPriorityLabel } =
    useFamilyCardStatus(data);

  function openSupport() {
    if (isClosed) return;
    void dialog.openDialog({
      title: t("operator.assignments.createTitle"),
      description: t("operator.assignments.createDescription"),
      children: (
        <CreateSupportAssignmentDialogContent familyProfileId={data.id} />
      ),
      showButtons: false,
      size: "xl",
      height: "auto",
    });
  }

  return (
    <div className="relative w-full">
      {sponsorFamily?.relationship === "supported" ? (
        <NBadge
          aria-label={t("sponsor.directory.mySupport")}
          className="absolute end-3 top-3 z-10 size-7 justify-center rounded-full border-2 border-amber-600 bg-amber-500 p-0 text-white shadow-md"
          color="warning"
          look="solid"
          shape="square"
          title={t("sponsor.directory.mySupport")}
        >
          <SupportedFamilyIcon className="!size-[22px] shrink-0" />
        </NBadge>
      ) : null}
      <NCard
        embedded
        title={
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate">{data.name}</span>
            {fundingStatus === "active" ? (
              <BadgeCheck
                aria-hidden
                className="size-4 shrink-0 fill-primary text-primary-foreground"
              />
            ) : null}
          </span>
        }
      >
        <NCardMedia variant="image" size={104}>
          <NNextImage unoptimized
            src={getPersonImage({ image: data.image, role: "family" })}
            alt={data.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 33vw, 20vw"
            className="object-cover"
          />
        </NCardMedia>
        <NCardAction>
          <div
            className={
              sponsorFamily ? "translate-y-16 sm:translate-y-0" : undefined
            }
          >
            <NBadge status={fundingStatus} />
          </div>
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
        {data.funding ? (
          <FundingProgressBar inline progress={data.funding} />
        ) : null}
        {!sponsorFamily ? (
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
        ) : (
          <SponsorFamilyAction
            data={sponsorFamily}
            isClosed={isClosed}
            onContribute={onContribute}
          />
        )}
      </div>
    </div>
  );
}
