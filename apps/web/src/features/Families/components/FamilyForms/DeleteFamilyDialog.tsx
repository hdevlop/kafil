"use client";

import { NButton, useDialog } from "najm-kit";

import { useTranslation } from "najm-i18n/react";
import { useFamilyCommands } from "../../hooks/useFamilies";
import type { FamilyRecord } from "../../types";

export function DeleteFamilyDialogContent({
  family,
}: Readonly<{ family: FamilyRecord }>) {
  const { t } = useTranslation();
  const { pop } = useDialog();
  const { remove } = useFamilyCommands();

  async function handleDelete() {
    await remove.mutateAsync(family.id);
    await pop();
  }

  return (
    <div className="space-y-5">
      <p className="text-sm leading-6 text-muted-foreground">
        {t("operator.families.deleteWarning")}
      </p>
      <div className="flex justify-end pt-5">
        <NButton
          type="button"
          variant="destructive"
          disabled={remove.isPending}
          onClick={() => void handleDelete()}
        >
          {remove.isPending
            ? t("operator.families.deleting")
            : t("operator.families.deleteAccount")}
        </NButton>
      </div>
    </div>
  );
}
