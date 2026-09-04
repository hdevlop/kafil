import { useRef } from "react";
import { useDialog } from "najm-kit";

import { useTranslation } from "najm-i18n/react";

import { FamilyDetails } from "../components/FamilyDetails";
import {
  BulkDeleteFamiliesDialogContent,
  CreateFamilyDialogContent,
  DeleteFamilyDialogContent,
  FamilyStatusDialogContent,
  UpdateFamilyDialogContent,
} from "../components/FamilyForms";
import type { FamilyRecord } from "../types";

export function useFamiliesPageDialogs() {
  const { t } = useTranslation();
  const dialog = useDialog();
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
      size: "xxl",
      height: "auto",
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
    void dialog.openDialog({
      title: t("operator.families.deleteTitle", { name: family.name }),
      description: t("operator.families.deleteDescription"),
      children: <DeleteFamilyDialogContent family={family} />,
      showButtons: false,
      size: "sm",
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
