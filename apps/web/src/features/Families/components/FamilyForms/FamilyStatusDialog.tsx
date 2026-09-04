"use client";

import { NButton, NForm, FormInput, useDialog } from "najm-kit";

import { useTranslation } from "najm-i18n/react";

import {
  familyStatusFormSchema,
  type FamilyStatusFormValues,
} from "../../config/familySchemas";
import { useFamilyCommands } from "../../hooks/useFamilies";
import type { FamilyRecord } from "../../types";

export function FamilyStatusDialogContent({
  action,
  family,
}: Readonly<{
  action: "deactivate" | "reactivate";
  family: FamilyRecord;
}>) {
  const { t } = useTranslation();
  const { pop } = useDialog();
  const commands = useFamilyCommands();
  const command = commands[action];

  async function handleSubmit(values: FamilyStatusFormValues) {
    await command.mutateAsync({ id: family.id, reason: values.reason });
    await pop();
  }

  return (
    <NForm
      id="family-status-form"
      schema={familyStatusFormSchema}
      defaultValues={{ reason: "" }}
      onSubmit={handleSubmit}
    >
      <FormInput
        name="reason"
        type="textarea"
        formLabel={t("operator.families.reason")}
        placeholder={t(
          "operator.families.reasonPlaceholder",
          {
            action: t(
              action === "deactivate"
                ? "operator.families.deactivate"
                : "operator.families.reactivate",
            ).toLowerCase(),
          },
        )}
        icon="MessageSquareText"
        required
      />
      <div className="flex justify-end pt-5">
        <NButton
          type="submit"
          variant={action === "deactivate" ? "destructive" : "default"}
          disabled={command.isPending}
        >
          {command.isPending
            ? t("operator.families.saving")
            : action === "deactivate"
              ? t("operator.families.deactivateAccount")
              : t("operator.families.reactivateAccount")}
        </NButton>
      </div>
    </NForm>
  );
}
