"use client";

import { Baby, BadgeCheck, Flag, HeartHandshake } from "lucide-react";
import { useRouter } from "next/navigation";
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
  useSponsorFamilySupportCommand,
  useSponsorSupport,
} from "@/features/SupportAssignments/hooks/useSponsorSupport";
import { OnlySponsor, Operator, useKafilRole } from "@/shared/Authorization";
import { FundingProgressBar } from "@/shared/FundingProgressCard";
import { StatusBadge } from "@/shared/StatusBadge";
import { ProtectedImage } from "@/shared/ProtectedImage";
import { getFamilyAvatarImage } from "@/lib/personImages";
import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";

import { useFamilyCardStatus } from "../../hooks/useFamilyCardStatus";
import type { FamilyRecord } from "../../types";

function SupportFamilyButton({
  data,
  isClosed,
  disabledReason,
}: Readonly<{
  data: FamilyRecord;
  isClosed: boolean;
  disabledReason: string | null;
}>) {
  const { t } = useKafilLanguage();
  const { isExactSponsor } = useKafilRole();
  const router = useRouter();
  const support = useSponsorSupport(isExactSponsor);
  const selectFamily = useSponsorFamilySupportCommand();
  const activeAssignment = support.data?.find(
    (item) =>
      item.assignment.familyProfileId === data.id &&
      item.assignment.status === "active",
  );

  async function handleSupport() {
    const assignment = await selectFamily.mutateAsync({
      familyProfileId: data.id,
    });
    router.push(
      `/contribution?assignment=${encodeURIComponent(assignment.id)}`,
    );
  }

  function handleContribute() {
    if (activeAssignment) {
      router.push(
        `/contribution?assignment=${encodeURIComponent(activeAssignment.assignment.id)}`,
      );
    }
  }

  return (
    <NButton
      className={
        isClosed
          ? "w-full bg-gray-400/70 text-gray-700 hover:bg-gray-400/70 disabled:opacity-100 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
          : "w-full"
      }
      leftIcon={HeartHandshake}
      variant={isClosed ? "secondary" : "default"}
      disabled={!isExactSponsor || isClosed || selectFamily.isPending}
      title={disabledReason ?? undefined}
      onClick={(event) => {
        event.stopPropagation();
        if (activeAssignment) handleContribute();
        else void handleSupport();
      }}
    >
      {activeAssignment
        ? t("sponsor.directory.contribute")
        : t("sponsor.directory.support")}
    </NButton>
  );
}

export function FamilyCard({ data }: Readonly<{ data: FamilyRecord }>) {
  const { t } = useKafilLanguage();
  const dialog = useDialog();
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
    <div className="w-full">
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
          <Operator>
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
          </Operator>
          <NCardInfo
            icon={Baby}
            label={t("operator.families.children")}
            value={data.activeChildCount}
          />
          <Operator>
            <NCardInfo
              icon={HeartHandshake}
              label={t("operator.families.sponsors")}
              value={data.activeSponsorCount}
            />
          </Operator>
        </NCardSection>
      </NCard>
      <div className="space-y-3 px-3 pb-3 sm:px-4 sm:pb-4">
        {data.funding ? (
          <FundingProgressBar inline progress={data.funding} />
        ) : null}
        <Operator>
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
        </Operator>
        <OnlySponsor>
          <SupportFamilyButton
            data={data}
            disabledReason={disabledReason}
            isClosed={isClosed}
          />
        </OnlySponsor>
      </div>
    </div>
  );
}
