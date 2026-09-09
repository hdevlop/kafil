import { useRef } from "react";
import { Trash2 } from "lucide-react";
import { useDialog, useDialogStore } from "najm-kit";

import { useTranslation } from "najm-i18n/react";

import { FamilyDetails } from "../components/FamilyDetails";
import {
  BulkDeleteFamiliesDialogContent,
  CreateFamilyDialogContent,
  FamilyStatusDialogContent,
  UpdateFamilyDialogContent,
} from "../components/FamilyForms";
import { useFamilyCommands } from "./useFamilies";
import type { FamilyRecord } from "../types";

export function useFamiliesPageDialogs() {
  const { t } = useTranslation();
  const dialog = useDialog();
  const dialogStore = useDialogStore();
  const { remove } = useFamilyCommands();
  const bulkDeleteDialogOpenRef = useRef(false);

  function openCreate() {
    void dialog.openDialog({
      title: t("operator.families.createTitle"),
      children: <CreateFamilyDialogContent />,
      showButtons: false,
      width: "xxl",
      height: "xl",
    });
  }

  function openView(family: FamilyRecord) {
    void dialog.openDialog({
      title: family.name,
      children: <FamilyDetails family={family} />,
      showButtons: false,
      width: "4xl",
    });
  }

  function openEdit(family: FamilyRecord) {
    void dialog.openDialog({
      title: t("operator.families.editTitle", { name: family.name }),
      description: t("operator.families.editDescription"),
      children: <UpdateFamilyDialogContent family={family} />,
      showButtons: false,
      width: "xxl",
      height: "xl",
    });
  }

  function openStatus(family: FamilyRecord) {
    const action = family.status === "active" ? "deactivate" : "reactivate";
    void dialog.openDialog({
      title: t(
        action === "deactivate"
          ? "operator.families.deactivateTitle"
          : "operator.families.reactivateTitle",
        { name: family.name },
      ),
      description: t("operator.families.lifecycleDescription"),
      children: (
        <FamilyStatusDialogContent action={action} family={family} />
      ),
      showButtons: false,
      size: "sm",
    });
  }

  function openDelete(family: FamilyRecord) {
    const confirmText = t("common.delete");

    void dialog.confirmDelete({
      title: t("operator.families.deleteDialogTitle"),
      description: t("operator.families.deleteDialogMessage"),
      itemName: family.name,
      icon: Trash2,
      warningText: t("operator.families.deleteDialogMessage"),
      confirmText,
      cancelText: t("common.cancel"),
      size: "sm",
      onConfirm: async () => {
        const dialogId = dialogStore.getState().getCurrentDialog()?.id;
        dialogStore.getState().updatePrimaryButton(
          { text: t("operator.families.deleting") },
          dialogId,
        );

        try {
          await remove.mutateAsync(family.id);
        } catch (error) {
          dialogStore.getState().updatePrimaryButton(
            { text: confirmText },
            dialogId,
          );
          throw error;
        }
      },
    });
  }

  function openBulkDelete(familyIds: string[], onDeleted: () => void) {
    if (bulkDeleteDialogOpenRef.current) return;
    bulkDeleteDialogOpenRef.current = true;

    void dialog
      .openDialog({
        title: t("operator.families.bulkDeleteTitle", {
          count: familyIds.length,
        }),
        description: t("operator.families.bulkDeleteDescription"),
        children: (
          <BulkDeleteFamiliesDialogContent
            familyIds={familyIds}
            onDeleted={onDeleted}
          />
        ),
        showButtons: false,
        size: "sm",
      })
      .finally(() => {
        bulkDeleteDialogOpenRef.current = false;
      });
  }

  return {
    openCreate,
    openView,
    openEdit,
    openStatus,
    openDelete,
    openBulkDelete,
  };
}
