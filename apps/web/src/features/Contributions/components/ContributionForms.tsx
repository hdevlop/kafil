"use client";

import { AlertTriangle } from "lucide-react";
import { FormInput, NButton, NForm, useDialog } from "najm-kit";

import { devFormTools } from "@/lib/devFormFill";
import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";

import {
  contributionReasonFormSchema,
  toContributionReasonInput,
  type ContributionReasonFormValues,
} from "../config/contributionSchemas";
import { useContributionCommands } from "../hooks/useContributions";
import type { ContributionRecord } from "../types";

export function ValidateContributionDialogContent({
  contribution,
}: Readonly<{ contribution: ContributionRecord }>) {
  const { t } = useKafilLanguage();
  const { pop } = useDialog();
  const { validate } = useContributionCommands();

  async function handleValidate() {
    await validate.mutateAsync(contribution.id);
    await pop();
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-3 rounded-xl bg-amber-500/10 p-4 text-sm leading-6 text-muted-foreground">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
        <p>
          {t("operator.contributions.validationWarning")}
        </p>
      </div>
      <div className="flex justify-end pt-5">
        <NButton disabled={validate.isPending} onClick={() => void handleValidate()}>
          {validate.isPending ? t("operator.contributions.validating") : t("operator.contributions.validateAndCreditBudget")}
        </NButton>
      </div>
    </div>
  );
}

export function ContributionReasonDialogContent({
  action,
  contribution,
}: Readonly<{
  action: "reject" | "refund";
  contribution: ContributionRecord;
}>) {
  const { t } = useKafilLanguage();
  const { pop } = useDialog();
  const commands = useContributionCommands();
  const command = commands[action];
  const isRefund = action === "refund";

  async function handleSubmit(values: ContributionReasonFormValues) {
    await command.mutateAsync(
      toContributionReasonInput(contribution.id, values),
    );
    await pop();
  }

  return (
    <NForm
      id={`${action}-contribution-form`}
      schema={contributionReasonFormSchema}
      defaultValues={{ reason: "" }}
      onSubmit={handleSubmit}
      devTools={devFormTools(contributionReasonFormSchema)}
      className="space-y-5"
    >
      <p className="text-sm leading-6 text-muted-foreground">
        {isRefund
          ? t("operator.contributions.refundHelp")
          : t("operator.contributions.rejectHelp")}
      </p>
      <FormInput
        name="reason"
        type="textarea"
        formLabel={t("operator.contributions.reason")}
        placeholder={
          isRefund
            ? t("operator.contributions.refundReasonPlaceholder")
            : t("operator.contributions.rejectReasonPlaceholder")
        }
        icon="MessageSquareText"
        required
      />
      <div className="flex justify-end pt-5">
        <NButton
          type="submit"
          variant={isRefund ? "destructive" : "default"}
          disabled={command.isPending}
        >
          {command.isPending
            ? t("operator.contributions.saving")
            : isRefund
              ? t("operator.contributions.refundContribution")
              : t("operator.contributions.rejectContribution")}
        </NButton>
      </div>
    </NForm>
  );
}

export function DeleteContributionDialogContent({
  contribution,
}: Readonly<{ contribution: ContributionRecord }>) {
  const { t } = useKafilLanguage();
  const { pop } = useDialog();
  const { remove } = useContributionCommands();

  async function handleDelete() {
    await remove.mutateAsync(contribution.id);
    await pop();
  }

  return (
    <div className="space-y-5">
      <p className="text-sm leading-6 text-muted-foreground">
        {t("operator.contributions.deleteWarning")}
      </p>
      <div className="flex justify-end pt-5">
        <NButton
          type="button"
          variant="destructive"
          disabled={remove.isPending}
          onClick={() => void handleDelete()}
        >
          {remove.isPending
            ? t("operator.contributions.deleting")
            : t("operator.contributions.deleteContribution")}
        </NButton>
      </div>
    </div>
  );
}

export function BulkDeleteContributionsDialogContent({
  contributionIds,
  onDeleted,
}: Readonly<{
  contributionIds: string[];
  onDeleted: () => void;
}>) {
  const { t } = useKafilLanguage();
  const { pop } = useDialog();
  const { bulkRemove } = useContributionCommands();

  async function handleDelete() {
    await bulkRemove.mutateAsync(contributionIds);
    onDeleted();
    await pop();
  }

  return (
    <div className="space-y-5">
      <p className="text-sm leading-6 text-muted-foreground">
        {t("operator.contributions.bulkDeleteWarning", {
          count: contributionIds.length,
        })}
      </p>
      <div className="flex justify-end pt-5">
        <NButton
          type="button"
          variant="destructive"
          disabled={bulkRemove.isPending}
          onClick={() => void handleDelete()}
        >
          {bulkRemove.isPending
            ? t("operator.contributions.bulkDeleting")
            : t("operator.contributions.bulkDeleteContribution")}
        </NButton>
      </div>
    </div>
  );
}
