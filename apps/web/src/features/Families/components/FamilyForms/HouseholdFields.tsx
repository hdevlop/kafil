"use client";

import { House } from "lucide-react";
import { FormInput, NFormSectionHeader } from "najm-kit";
import { useWatch } from "react-hook-form";

import { useTranslation } from "najm-i18n/react";
import { familyHousingItems } from "../../config/housingOptions";
import type { FamilyStoredHousingSituation } from "../../types";

export function FamilyHouseholdFields({
  disabled = false,
  showSectionHeader = true,
}: Readonly<{
  disabled?: boolean;
  showSectionHeader?: boolean;
}>) {
  const { t } = useTranslation();
  const housingSituation = useWatch({
    name: "housingSituation",
  }) as FamilyStoredHousingSituation | undefined;
  const housingItems = familyHousingItems(
    housingSituation,
    {
      hosted: t("operator.families.housingHosted"),
      owned: t("operator.families.housingOwned"),
      rented: t("operator.families.housingRented"),
      temporary: t("operator.families.housingTemporary"),
      unknown: t("operator.families.notRecorded"),
    },
    t("operator.families.notRecorded"),
  );
  const priorityItems = [
    {
      value: "normal",
      label: t("operator.families.supportPriorityNormal"),
    },
    { value: "high", label: t("operator.families.supportPriorityHigh") },
    { value: "urgent", label: t("operator.families.supportPriorityUrgent") },
  ];

  return (
    <div className="space-y-4">
      {showSectionHeader ? (
        <NFormSectionHeader icon={House} title={t("operator.families.householdStep")} />
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        <FormInput
          name="housingSituation"
          type="select"
          formLabel={t("operator.families.housingSituation")}
          placeholder={t("operator.families.chooseHousingSituation")}
          items={housingItems}
          icon="House"
          disabled={disabled}
          required
        />
        <FormInput
          name="registrationDate"
          type="date"
          formLabel={t("operator.families.registrationDate")}
          icon="CalendarDays"
          disabled={disabled}
          required
        />
        <FormInput
          name="supportPriority"
          type="select"
          formLabel={t("operator.families.supportPriority")}
          formDescription={t("operator.families.supportPriorityHelp")}
          placeholder={t("operator.families.chooseSupportPriority")}
          items={priorityItems}
          icon="Flag"
          disabled={disabled}
          required
        />
        <FormInput
          name="activationTargetMad"
          type="text"
          formLabel={t("operator.families.activationTarget")}
          placeholder={t("operator.families.targetExample")}
          icon="CircleDollarSign"
          disabled={disabled}
          required
        />
        <FormInput
          name="notes"
          type="textarea"
          formLabel={t("operator.families.familyNotes")}
          placeholder={t("operator.families.optionalOperatorNotes")}
          icon="NotebookPen"
          rows={4}
          className="h-full"
          disabled={disabled}
        />
        <FormInput
          name="exactAddress"
          type="textarea"
          formLabel={t("operator.families.exactAddress")}
          placeholder={t("operator.families.fullAddress")}
          icon="MapPin"
          rows={4}
          className="h-full"
          disabled={disabled}
          required
        />
      </div>
    </div>
  );
}
