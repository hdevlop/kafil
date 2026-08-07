"use client";

import { useRef, useState } from "react";
import {
  Eye,
  Pencil,
  ShieldPlus,
  Trash2,
  UserRoundCheck,
  UserRoundX,
} from "lucide-react";
import { useUser } from "najm-auth/client/react";
import { NPageHeader, NButton, NPageLayout, NTable, type NTableProps, useDialog } from "najm-kit";

import { useKafilLanguage } from "@/i18n/useKafilLanguage";
import { PageEmptyState, PageErrorState } from "@/shared/PageState";
import PageHeaderGlobalActions from "@/shared/PageHeaderGlobalActions";
import { UserShieldIcon } from "@/shared/icons/UserShieldIcon";
import { createCardPagination } from "@/lib/tablePagination";

import { StaffCard } from "./StaffCard";
import { StaffDetails } from "./StaffDetails";
import {
  BulkDeleteStaffDialogContent,
  CreateStaffDialogContent,
  DeleteStaffDialogContent,
  ProvisionStaffAccessDialogContent,
  StaffStatusDialogContent,
  UpdateStaffDialogContent,
} from "./StaffForms";
import { useResponsiveStaff } from "../hooks/useStaff";
import { useStaffTableColumns } from "../hooks/useStaffTableColumns";
import { useStaffTableFilters } from "../hooks/useStaffTableFilters";
import type { StaffRecord } from "../types";
import type { StaffFilters } from "../hooks/useStaff";

export function StaffPage() {
  const { t } = useKafilLanguage();
  const dialog = useDialog();
  const user = useUser();
  const [listFilters, setListFilters] = useState<StaffFilters>({});
  const staff = useResponsiveStaff(listFilters);
  const columns = useStaffTableColumns();
  const tableFilters = useStaffTableFilters(listFilters, setListFilters);
  const rows = staff.data;
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const bulkDeleteDialogOpenRef = useRef(false);
  const isAdmin = user?.role === "admin";

  function openCreate() {
    void dialog.openDialog({
      title: t("operator.staff.createTitle"),
      description: t("operator.staff.createDescription"),
      children: <CreateStaffDialogContent />,
      height: "auto",
      showButtons: false,
      size: "xl",
    });
  }

  function openView(target: StaffRecord) {
    void dialog.openDialog({
      title: t("operator.staff.viewTitle"),
      children: <StaffDetails staff={target} />,
      height: "auto",
      showButtons: false,
      size: "lg",
    });
  }

  function openEdit(target: StaffRecord) {
    void dialog.openDialog({
      title: t("operator.staff.editTitle", { name: target.name }),
      description: t("operator.staff.editDescription"),
      children: <UpdateStaffDialogContent staff={target} />,
      height: "auto",
      showButtons: false,
      size: "xl",
    });
  }

  function openStatus(target: StaffRecord) {
    const action = target.status === "active" ? "deactivate" : "reactivate";
    void dialog.openDialog({
      title: t(
        action === "deactivate"
          ? "operator.staff.deactivateTitle"
          : "operator.staff.reactivateTitle",
        { name: target.name },
      ),
      description: t("operator.staff.lifecycleDescription"),
      children: (
        <StaffStatusDialogContent action={action} staff={target} />
      ),
      showButtons: false,
      size: "sm",
    });
  }

  function openDelete(target: StaffRecord) {
    void dialog.openDialog({
      title: t("operator.staff.deleteTitle", { name: target.name }),
      description: t("operator.staff.deleteDescription"),
      children: <DeleteStaffDialogContent staff={target} />,
      showButtons: false,
      size: "sm",
    });
  }

  function openProvisionAccess(target: StaffRecord) {
    void dialog.openDialog({
      title: t("operator.staff.provisionAccessTitle", { name: target.name }),
      description: t("operator.staff.provisionAccessDescription"),
      children: (
        <ProvisionStaffAccessDialogContent staff={target} />
      ),
      showButtons: false,
      size: "sm",
    });
  }

  function openBulkDelete(staffIds: string[]) {
    if (bulkDeleteDialogOpenRef.current) return;
    bulkDeleteDialogOpenRef.current = true;

    void dialog
      .openDialog({
        title: t("operator.staff.bulkDeleteTitle", {
          count: staffIds.length,
        }),
        description: t("operator.staff.bulkDeleteDescription"),
        children: (
          <BulkDeleteStaffDialogContent
            staffIds={staffIds}
            onDeleted={() => setRowSelection({})}
          />
        ),
        showButtons: false,
        size: "sm",
      })
      .finally(() => {
        bulkDeleteDialogOpenRef.current = false;
      });
  }

  const tableProps: NTableProps<StaffRecord> = {
    addButtonText: t("operator.staff.create"),
    classNames: {
      cards: "grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5",
    },
    columns,
    data: rows,
    defaultMode: "cards",
    dynamicHeight: true,
    error: staff.error,
    filters: tableFilters,
    getRowId: (target) => target.id,
    loading: staff.loading,
    loadingText: t("operator.staff.loading"),
    menu: {
      row: (target) => {
        const isActive = target.status === "active";
        const canProvisionAccess =
          !target.hasOperatorAccess &&
          target.functions.includes("operator") &&
          target.affiliation === "internal";

        const actions = [
          {
            icon: Eye,
            label: t("operator.staff.view"),
            onSelect: () => openView(target),
          },
          {
            icon: Pencil,
            label: t("operator.staff.edit"),
            onSelect: () => openEdit(target),
          },
          {
            danger: isActive,
            icon: isActive ? UserRoundX : UserRoundCheck,
            label: t(isActive ? "operator.staff.deactivate" : "operator.staff.reactivate"),
            onSelect: () => openStatus(target),
            separatorBefore: true,
          },
        ];

        if (isAdmin && canProvisionAccess) {
          actions.push({
            icon: ShieldPlus,
            label: t("operator.staff.provisionAccess"),
            onSelect: () => openProvisionAccess(target),
          });
        }

        if (isAdmin) {
          actions.push({
            danger: true,
            icon: Trash2,
            label: t("operator.staff.delete"),
            onSelect: () => openDelete(target),
            separatorBefore: true,
          });
        }

        return actions;
      },
    },
    menuButton: true,
    noDataText: t("operator.staff.noData"),
    onBulkDelete: isAdmin ? openBulkDelete : undefined,
    onCreate: openCreate,
    onEdit: openEdit,
    onRowSelectionChange: setRowSelection,
    onView: openView,
    renderCard: StaffCard,
    renderEmpty: () => (
      <PageEmptyState
        action={
          <NButton onClick={openCreate}>{t("operator.staff.create")}</NButton>
        }
        description={t("operator.staff.emptyDescription")}
        icon={UserShieldIcon}
        title={t("operator.staff.emptyTitle")}
      />
    ),
    renderError: (error) => (
      <PageErrorState
        error={error}
        onRetry={() => void staff.refetch()}
      />
    ),
    responsiveCards: true,
    rowSelection,
    showCheckbox: isAdmin,
    manualPagination: true,
    pageCount: staff.pageCount,
    pagination: staff.pagination,
    onPaginationChange: staff.onPaginationChange,
    cardPagination: createCardPagination(staff, t),
    showPagination: true,
  };

  return (
    <NPageLayout className="flex h-full min-h-0 flex-col gap-4">
      <NPageHeader
        actions={<PageHeaderGlobalActions />}
        icon={UserShieldIcon}
        subtitle={t("operator.staff.subtitle")}
        title={t("operator.staff.title")}
      />
      <div className="min-h-0 flex-1">
        <NTable {...tableProps} />
      </div>
    </NPageLayout>
  );
}
