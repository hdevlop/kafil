"use client";

import { useRef } from "react";
import { NButton, useDialog } from "najm-kit";

import { useTranslation } from "najm-i18n/react";
import { useFamilyCommands } from "../../hooks/useFamilies";

export function BulkDeleteFamiliesDialogContent({
  familyIds,
  onDeleted,
}: Readonly<{ familyIds: string[]; onDeleted: () => void }>) {
  const { t } = useTranslation();
  const { pop } = useDialog();
  const { bulkRemove } = useFamilyCommands();
  const submittingRef = useRef(false);

  async function handleDelete() {
    if (submittingRef.current) return;
    submittingRef.current = true;

    try {
      await bulkRemove.mutateAsync(familyIds);
      onDeleted();
      await pop();
    } catch {
      submittingRef.current = false;
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-sm leading-6 text-muted-foreground">
        {t("operator.families.bulkDeleteWarning", { count: familyIds.length })}
      </p>
      <div className="flex justify-end pt-5">
        <NButton
          type="button"
          variant="destructive"
          disabled={bulkRemove.isPending}
          onClick={() => void handleDelete()}
        >
          {bulkRemove.isPending
            ? t("operator.families.bulkDeleting")
            : t("operator.families.bulkDeleteAccount")}
        </NButton>
      </div>
    </div>
  );
}
