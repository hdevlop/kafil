"use client";

import {
  CalendarClock,
  CheckCircle2,
  Clock,
  Contact,
  IdCard,
  Mail,
  Phone,
  UserRound,
  XCircle,
} from "lucide-react";
import {
  NAvatar,
  NBadge,
  NButton,
  NDetailList,
  type NDetailListItem,
  NErrorState,
  NLoadingState,
  NSheet,
  useDialog,
  useNajmFormat,
} from "najm-kit";
import { getPersonImage } from "najm-kit/person-images";

import { useTranslation } from "najm-i18n/react";

import { ApproveApplicantDialogContent, RejectApplicantDialogContent } from "./ApplicantDecisionDialogs";
import type { ApplicantRecord } from "../types";
import { useApplicant } from "../hooks/useApplicants";

export function ApplicantDetailsSheet({
  applicant,
  open,
  onOpenChange,
}: Readonly<{
  applicant: ApplicantRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>) {
  const { language, t } = useTranslation();
  return (
    <NSheet
      open={open}
      onOpenChange={onOpenChange}
      icon={Contact}
      title={t("operator.applicants.viewTitle")}
      description={t("operator.applicants.viewDescription")}
      width={480}
      side={language === "ar" ? "left" : "right"}
      classNames={{
        content: "max-w-full bg-background",
        header: "bg-background",
        body: "bg-background",
      }}
    >
      {applicant ? <ApplicantDetails initialApplicant={applicant} /> : null}
    </NSheet>
  );
}

export function ApplicantDetails({ initialApplicant }: Readonly<{ initialApplicant: ApplicantRecord }>) {
  const { t } = useTranslation();
  const fmt = useNajmFormat();
  const dialog = useDialog();
  const applicantQuery = useApplicant(initialApplicant.id, initialApplicant);
  const applicant = applicantQuery.data ?? initialApplicant;

  if (applicantQuery.isPending) {
    return <NLoadingState label={t("operator.applicants.loading")} surface="panel" />;
  }
  if (applicantQuery.isError) {
    return (
      <NErrorState
        title={t("operator.applicants.loadDetailError")}
        onRetry={() => void applicantQuery.refetch()}
        surface="panel"
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

  const genderLabel =
    applicant.gender === "F"
      ? t("operator.applicants.female")
      : t("operator.applicants.male");

  const detailItems: NDetailListItem[] = [
    { icon: Phone, label: t("operator.applicants.phone"), value: applicant.phone },
    { icon: UserRound, label: t("operator.applicants.gender"), value: genderLabel },
    { icon: IdCard, label: t("operator.applicants.cin"), value: applicant.cin },
    {
      icon: CalendarClock,
      label: t("operator.applicants.submitted"),
      value: fmt.date(applicant.submittedAt),
    },
    {
      icon: Clock,
      label: t("operator.applicants.reviewed"),
      value: applicant.reviewedAt
        ? fmt.date(applicant.reviewedAt)
        : t("operator.applicants.notReviewed"),
    },
    ...(applicant.rejectionReason
      ? [{
          icon: XCircle,
          label: t("operator.applicants.rejectionReason"),
          value: applicant.rejectionReason,
        }]
      : []),
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center gap-2 text-center">
        <NAvatar
          src={getPersonImage({ image: null, role: "adult", gender: applicant.gender })}
          alt={applicant.name}
          size="xl"
          classNames={{ avatar: "size-20 bg-primary/10 text-primary" }}
        />
        <h2 className="text-lg font-semibold text-foreground">{applicant.name}</h2>
        <p className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
          <Mail className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{applicant.email}</span>
        </p>
        <NBadge
          label={t(`operator.applicants.statusLabel.${applicant.status}`)}
          status={applicant.status}
        />
      </div>

      <div className="border-t border-border" />

      <NDetailList items={detailItems} />

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
