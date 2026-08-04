"use client";

import { FormInput, NButton, NForm, useDialog } from "najm-kit";

import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";

import {
  applicantRejectReasonSchema,
  type ApplicantRejectReasonValues,
} from "../config/schemas";
import { useApplicantDecisionCommands } from "../hooks/useApplicants";
import type { ApplicantRecord } from "../types";

export function ApproveApplicantDialogContent({
  applicant,
}: Readonly<{ applicant: ApplicantRecord }>) {
  const { t } = useKafilLanguage();
  const { pop } = useDialog();
  const { approve } = useApplicantDecisionCommands();

  async function handleConfirm() {
    await approve.mutateAsync(applicant.id);
    await pop();
  }

  return (
    <div className="flex justify-end gap-3 pt-5">
      <NButton
        type="button"
        variant="outline"
        disabled={approve.isPending}
        onClick={() => void pop()}
      >
        {t("common.cancel")}
      </NButton>
      <NButton
        type="button"
        disabled={approve.isPending}
        onClick={() => void handleConfirm()}
      >
        {approve.isPending
          ? t("operator.applicants.approving")
          : t("operator.applicants.approve")}
      </NButton>
    </div>
  );
}

export function RejectApplicantDialogContent({
  applicant,
}: Readonly<{ applicant: ApplicantRecord }>) {
  const { t } = useKafilLanguage();
  const { pop } = useDialog();
  const { reject } = useApplicantDecisionCommands();
  const schema = applicantRejectReasonSchema({
    required: t("operator.applicants.rejectionReasonRequired"),
    tooLong: t("operator.applicants.rejectionReasonTooLong"),
  });

  async function handleSubmit(values: ApplicantRejectReasonValues) {
    await reject.mutateAsync({ id: applicant.id, reason: values.reason });
    await pop();
  }

  return (
    <NForm
      id={`reject-applicant-${applicant.id}`}
      schema={schema}
      defaultValues={{ reason: "" }}
      onSubmit={handleSubmit}
      className="space-y-5"
    >
      <FormInput
        name="reason"
        type="textarea"
        formLabel={t("operator.applicants.rejectionReasonLabel")}
        placeholder={t("operator.applicants.rejectionReasonPlaceholder")}
        required
      />
      <div className="flex justify-end gap-3 pt-5">
        <NButton
          type="button"
          variant="outline"
          disabled={reject.isPending}
          onClick={() => void pop()}
        >
          {t("common.cancel")}
        </NButton>
        <NButton
          type="submit"
          variant="destructive"
          disabled={reject.isPending}
        >
          {reject.isPending
            ? t("operator.applicants.rejecting")
            : t("operator.applicants.reject")}
        </NButton>
      </div>
    </NForm>
  );
}
