"use client";

import { HandCoins } from "lucide-react";
import {
  FormInput,
  NButton,
  NForm,
  NFormSectionHeader,
  useDialog,
} from "najm-kit";

import { devFormTools } from "@/lib/devFormFill";
import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";

import {
  currentContributionDate,
  recordContributionFormSchema,
  toRecordContributionInput,
  type RecordContributionFormValues,
} from "../config/contributionSchemas";
import { buildContributionRecordingOptions } from "../config/contributionRecordingOptions";
import {
  useContributionCommands,
  useContributionRecordingOptions,
} from "../hooks/useContributions";

export function RecordContributionDialogContent({
  familyProfileId,
}: Readonly<{ familyProfileId?: string }>) {
  const { t } = useKafilLanguage();
  const { pop } = useDialog();
  const { record } = useContributionCommands();
  const sources = useContributionRecordingOptions();
  const assignmentOptions = buildContributionRecordingOptions(
    sources.data,
    familyProfileId,
  );

  async function handleSubmit(values: RecordContributionFormValues) {
    await record.mutateAsync(toRecordContributionInput(values));
    await pop();
  }

  return (
    <NForm
      id="record-contribution-form"
      schema={recordContributionFormSchema}
      defaultValues={{
        supportAssignmentId: "",
        amountMad: "",
        paymentMethod: "cash",
        paidOn: currentContributionDate(),
        externalReference: "",
      }}
      onSubmit={handleSubmit}
      devTools={devFormTools(recordContributionFormSchema, {
        supportAssignmentId: assignmentOptions,
      })}
    >
      <NFormSectionHeader icon={HandCoins} title={t("operator.contributions.offlinePayment")} />
      <FormInput
        name="supportAssignmentId"
        type="combobox"
        formLabel={t(
          familyProfileId
            ? "operator.contributions.sponsor"
            : "operator.contributions.sponsorAndFamily",
        )}
        placeholder={
          sources.isPending
            ? t("operator.contributions.loadingAssignments")
            : t(
                familyProfileId
                  ? "operator.contributions.chooseSponsor"
                  : "operator.contributions.chooseSponsorAndFamily",
              )
        }
        searchPlaceholder={t(
          familyProfileId
            ? "operator.contributions.searchSponsors"
            : "operator.contributions.searchSponsorsOrFamilies",
        )}
        emptyMessage={t(
          familyProfileId
            ? "operator.contributions.noActiveSponsor"
            : "operator.contributions.noActiveAssignment",
        )}
        items={assignmentOptions}
        icon="Search"
        disabled={sources.isPending}
        required
      />
      <div className="grid gap-4 md:grid-cols-2">
        <FormInput
          name="amountMad"
          type="text"
          formLabel={t("operator.contributions.amountMad")}
          placeholder={t("operator.contributions.amountPlaceholder")}
          icon="CircleDollarSign"
          required
        />
        <FormInput
          name="paidOn"
          type="date"
          formLabel={t("operator.contributions.paymentDate")}
          icon="Calendar"
          required
        />
        <FormInput
          name="paymentMethod"
          type="select"
          formLabel={t("operator.contributions.paymentMethod")}
          items={[
            { value: "cash", label: t("operator.contributions.cash") },
            { value: "bank_transfer", label: t("operator.contributions.bankTransfer") },
            { value: "cheque", label: t("operator.contributions.cheque") },
            { value: "mobile_transfer", label: t("operator.contributions.mobileTransfer") },
            { value: "other", label: t("operator.contributions.other") },
          ]}
          icon="Landmark"
          required
        />
        <FormInput
          name="externalReference"
          type="text"
          formLabel={t("operator.contributions.optionalReference")}
          placeholder={t("operator.contributions.referencePlaceholder")}
          icon="ReceiptText"
        />
      </div>
      <p className="text-sm leading-6 text-muted-foreground">
        {t("operator.contributions.recordHelp")}
      </p>
      <div className="flex justify-end pt-5">
        <NButton
          type="submit"
          disabled={record.isPending || sources.isPending}
        >
          {record.isPending ? t("operator.contributions.recording") : t("operator.contributions.record")}
        </NButton>
      </div>
    </NForm>
  );
}
