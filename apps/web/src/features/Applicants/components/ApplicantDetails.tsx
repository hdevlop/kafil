"use client";

import { CheckCircle2, Contact, FileKey2, UserRoundSearch, XCircle } from "lucide-react";
import { NButton, NDetailList, NErrorState, NLoadingState, NSection, useDialog } from "najm-kit";

import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import { formatKafilDate } from "@/lib/format";
import { getSponsorPersonImage } from "@/lib/personImages";
import { ManagedAvatar } from "@/shared/ManagedAvatar";
import { StatusBadge } from "@/shared/StatusBadge";

import {
  ApproveApplicantDialogContent,
  RejectApplicantDialogContent,
} from "./ApplicantDecisionDialogs";
import type { ApplicantRecord } from "../types";
import { useApplicant } from "../hooks/useApplicants";

export function ApplicantDetails({ initialApplicant }: Readonly<{ initialApplicant: ApplicantRecord }>) {
  const { language, t } = useKafilLanguage();
  const dialog = useDialog();
  const applicantQuery = useApplicant(initialApplicant.id, initialApplicant);
  const applicant = applicantQuery.data ?? initialApplicant;

  if (applicantQuery.isPending) {
    return <NLoadingState label={t("operator.applicants.loading")} />;
  }
  if (applicantQuery.isError) {
    return (
      <NErrorState
        title={t("operator.applicants.loadDetailError")}
        onRetry={() => void applicantQuery.refetch()}
      />
    );
  }

  const isPendingReview = applicant.status === "pending_review";
  const canApprove = isPendingReview || applicant.status === "rejected";

  function openApprove() {
    void dialog.openDialog({
      title: t("operator.applicants.approveTitle", { name: applicant.name }),
      description: t("operator.applicants.approveDescription", { name: applicant.name }),
      children: <ApproveApplicantDialogContent applicant={applicant} />,
      showButtons: false,
      size: "sm",
    });
  }

  function openReject() {
    void dialog.openDialog({
      title: t("operator.applicants.rejectTitle", { name: applicant.name }),
      description: t("operator.applicants.rejectDescription", { name: applicant.name }),
      children: <RejectApplicantDialogContent applicant={applicant} />,
      showButtons: false,
      size: "sm",
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4 rounded-2xl bg-muted/60 p-4">
        <ManagedAvatar
          src={getSponsorPersonImage(applicant.gender)}
          title={applicant.name}
          size="xl"
          classNames={{ avatar: "bg-muted" }}
        />
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold">{applicant.name}</p>
          <p className="truncate text-sm text-muted-foreground">{applicant.email}</p>
          <StatusBadge className="mt-2" status={applicant.status} />
        </div>
      </div>

      <NSection icon={Contact} title={t("operator.applicants.contact")}>
        <NDetailList
          items={[
            { label: t("operator.applicants.email"), value: applicant.email },
            { label: t("operator.applicants.phone"), value: applicant.phone },
            {
              label: t("operator.applicants.gender"),
              value: applicant.gender === "F"
                ? t("operator.applicants.female")
                : t("operator.applicants.male"),
            },
          ]}
        />
      </NSection>

      <NSection icon={FileKey2} title={t("operator.applicants.privateVerification")}>
        <NDetailList items={[{ label: t("operator.applicants.cin"), value: applicant.cin }]} />
      </NSection>

      <NSection icon={UserRoundSearch} title={t("operator.applicants.review")}>
        <NDetailList
          items={[
            {
              label: t("operator.applicants.submitted"),
              value: formatKafilDate(applicant.submittedAt, language),
            },
            {
              label: t("operator.applicants.reviewed"),
              value: applicant.reviewedAt
                ? formatKafilDate(applicant.reviewedAt, language)
                : t("operator.applicants.notReviewed"),
            },
            ...(applicant.rejectionReason
              ? [{
                  label: t("operator.applicants.rejectionReason"),
                  value: applicant.rejectionReason,
                }]
              : []),
          ]}
        />
      </NSection>

      {canApprove ? (
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-4">
          {isPendingReview ? (
            <NButton
              type="button"
              variant="destructive"
              leftIcon={XCircle}
              onClick={openReject}
            >
              {t("operator.applicants.reject")}
            </NButton>
          ) : null}
          <NButton type="button" leftIcon={CheckCircle2} onClick={openApprove}>
            {t("operator.applicants.approve")}
          </NButton>
        </div>
      ) : null}
    </div>
  );
}
