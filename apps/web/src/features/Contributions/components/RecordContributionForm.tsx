"use client";

import { HandCoins } from "lucide-react";
import {
  FormInput,
  NButton,
  NForm,
  NFormSectionHeader,
  useDebouncedValue,
  useDialog,
  useNajmFormat,
} from "najm-kit";
import { useState } from "react";
import { useWatch } from "react-hook-form";

import { parseMadAmount } from "@/features/Budgets/config/budgetSchemas";
import { useKafilLanguage } from "@/i18n/useKafilLanguage";

import {
  currentContributionDate,
  recordContributionFormSchema,
  toRecordContributionInput,
  type RecordContributionFormValues,
} from "../config/contributionSchemas";
import {
  buildContributionRecordingOptions,
  type RecordingOptionView,
} from "../config/contributionRecordingOptions";
import {
  useContributionCommands,
  useContributionRecordingOptions,
} from "../hooks/useContributions";

function ContributionCapacityNotice({
  options,
}: Readonly<{ options: RecordingOptionView[] }>) {
  const { t } = useKafilLanguage();
  const fmt = useNajmFormat();
  const assignmentId = useWatch({ name: "supportAssignmentId" });
  const selected = options.find((option) => option.value === assignmentId);
  const hasOpen = options.some((option) => !option.disabled);

  if (selected?.maxAmountMinor) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("operator.contributions.availableAmount", {
          amount: fmt.money(selected.maxAmountMinor),
        })}
      </p>
    );
  }
  if (!hasOpen && options.length > 0) {
    return (
      <p className="text-sm text-warning">
        {t("operator.contributions.noAssignmentOpen")}
      </p>
    );
  }
  return null;
}

function ContributionSubmitButton({
  options,
  pending,
}: Readonly<{ options: RecordingOptionView[]; pending: boolean }>) {
  const { t } = useKafilLanguage();
  const fmt = useNajmFormat();
  const assignmentId = useWatch({ name: "supportAssignmentId" });
  const amountMad = useWatch({ name: "amountMad" });
  const selected = options.find((option) => option.value === assignmentId);
  const amountMinor = parseMadAmount(String(amountMad ?? ""));
  const exceedsCapacity = Boolean(
    selected &&
      amountMinor !== null &&
      amountMinor > selected.maxAmountMinor,
  );

  return (
    <div className="space-y-2 text-right">
      {exceedsCapacity && selected ? (
        <p className="text-sm font-medium text-destructive">
          {t("sponsor.contributions.amountTooHigh", {
            amount: fmt.money(selected.maxAmountMinor),
          })}
        </p>
      ) : null}
      <NButton
        type="submit"
        disabled={
          pending ||
          !selected ||
          selected.disabled ||
          amountMinor === null ||
          exceedsCapacity
        }
      >
        {pending
          ? t("operator.contributions.recording")
          : t("operator.contributions.record")}
      </NButton>
    </div>
  );
}

export function RecordContributionDialogContent({
  familyProfileId,
}: Readonly<{ familyProfileId?: string }>) {
  const { t } = useKafilLanguage();
  const { pop } = useDialog();
  const { record } = useContributionCommands();
  const [assignmentSearch, setAssignmentSearch] = useState("");
  const sources = useContributionRecordingOptions({
    familyProfileId,
    search: useDebouncedValue(assignmentSearch, 250) || undefined,
  });
  const assignmentOptions = buildContributionRecordingOptions(
    sources.data,
    familyProfileId,
    {
      funded: t("funding.funded"),
      reserved: t("funding.reserved"),
    },
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
      devTools={{ overrides: { supportAssignmentId: assignmentOptions } }}
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
        loading={sources.isFetching}
        loadingMessage={t("operator.contributions.loadingAssignments")}
        onSearchChange={setAssignmentSearch}
        shouldFilter={false}
        items={assignmentOptions}
        icon="Search"
        disabled={sources.isPending}
        required
      />
      <ContributionCapacityNotice options={assignmentOptions} />
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
        <ContributionSubmitButton
          options={assignmentOptions}
          pending={record.isPending || sources.isPending}
        />
      </div>
    </NForm>
  );
}
