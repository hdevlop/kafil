"use client";

import { useRef, useState } from "react";
import {
  Baby,
  Eye,
  Pencil,
  Trash2,
  UserRoundCheck,
  UserRoundX,
} from "lucide-react";
import {
  NPageHeader,
  NEmptyState,
  NErrorState,
  type ContextMenuItem,
  NButton,
  NPageLayout,
  NTable,
  type NTableProps,
  useDialog,
  createCardPagination,
} from "najm-kit";

import { getPublicApiErrorMessage } from "@/services/apiError";
import PageHeaderGlobalActions from "@/shared/PageHeaderGlobalActions";
import { useKafilLanguage } from "@/i18n/useKafilLanguage";
import { Operator, useKafilRole } from "@/shared/Authorization";

import { ChildCard } from "./ChildCard";
import { ChildDetails } from "./ChildDetails";
import {
  BulkDeleteChildrenDialogContent,
  ChildStatusDialogContent,
  CreateChildDialogContent,
  DeleteChildDialogContent,
  UpdateChildDialogContent,
} from "./ChildForms";
import { useResponsiveChildren } from "../hooks/useChildren";
import { useChildrenTableColumns } from "../hooks/useChildrenTableColumns";
import { useChildrenTableFilters } from "../hooks/useChildrenTableFilters";
import type { ChildRecord } from "../types";
import type { ListChildrenFilters } from "@/services/childApi";

export function ChildrenPage() {
  const { t } = useKafilLanguage();
  const dialog = useDialog();
  const { isExactAdmin, isExactFamily } = useKafilRole();
  const [listFilters, setListFilters] = useState<ListChildrenFilters>({});
  const children = useResponsiveChildren(listFilters);
  const columns = useChildrenTableColumns();
  const filters = useChildrenTableFilters(listFilters, setListFilters);
  const rows = children.data;
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const bulkDeleteDialogOpenRef = useRef(false);

  const getRowClassName = (child: ChildRecord) =>
    child.status === "inactive" ||
    (child.familyStatus !== undefined && child.familyStatus !== "active")
      ? "bg-muted/60 text-muted-foreground opacity-60 grayscale hover:bg-muted/80 [&_td]:text-muted-foreground"
      : undefined;

  function openCreate() {
    void dialog.openDialog({
      title: t("operator.children.createTitle"),
      description: t("operator.children.createDescription"),
      children: <CreateChildDialogContent />,
      showButtons: false,
      size: "lg",
      height: "auto",
    });
  }

  function openView(child: ChildRecord) {
    void dialog.openDialog({
      title: child.legalName,
      description: isExactFamily
        ? t("family.children.viewDescription")
        : "Operator-only child and family relationship details.",
      children: <ChildDetails child={child} />,
      showButtons: false,
      size: "lg",
      height: "xl",
    });
  }

  function openEdit(child: ChildRecord) {
    void dialog.openDialog({
      title: `Edit ${child.legalName}`,
      description: "Household ownership stays fixed after the child record is created.",
      children: <UpdateChildDialogContent child={child} />,
      showButtons: false,
      size: "lg",
      height: "auto",
    });
  }

  function openStatus(child: ChildRecord) {
    const action = child.status === "active" ? "deactivate" : "reactivate";
    void dialog.openDialog({
      title: t("operator.children.statusDialogTitle", {
        action: action === "deactivate" ? t("common.deactivate") : t("common.activate"),
        name: child.legalName,
      }),
      description: t("operator.children.lifecycleDescription"),
      children: <ChildStatusDialogContent action={action} child={child} />,
      showButtons: false,
      size: "sm",
    });
  }

  function openDelete(child: ChildRecord) {
    void dialog.openDialog({
      title: `Permanently delete ${child.legalName}?`,
      children: <DeleteChildDialogContent child={child} />,
      showButtons: false,
      size: "sm",
    });
  }

  function openBulkDelete(childIds: string[]) {
    if (bulkDeleteDialogOpenRef.current) return;
    bulkDeleteDialogOpenRef.current = true;

    void dialog.openDialog({
      title: `Permanently delete ${childIds.length} children?`,
      description: "Only bootstrap administrators can permanently delete child records.",
      children: (
        <BulkDeleteChildrenDialogContent
          childIds={childIds}
          onDeleted={() => setRowSelection({})}
        />
      ),
      showButtons: false,
      size: "sm",
    }).finally(() => {
      bulkDeleteDialogOpenRef.current = false;
    });
  }

  const tableProps: NTableProps<ChildRecord> = {
    data: rows,
    columns,
    filters,
    loading: children.loading,
    error: children.error,
    getRowId: (child) => child.id,
    onCreate: isExactFamily ? undefined : openCreate,
    onView: openView,
    onEdit: isExactFamily ? undefined : openEdit,
    onRowClick: openView,
    renderCard: ChildCard,
    getRowClassName,
    renderEmpty: () => (
      <NEmptyState
        surface="panel"
        action={
          <Operator>
            <NButton onClick={openCreate}>
              {t("operator.children.create")}
            </NButton>
          </Operator>
        }
        icon={Baby}
        title={t(isExactFamily ? "family.children.emptyTitle" : "operator.children.emptyTitle")}
        description={t(isExactFamily ? "family.children.emptyDescription" : "operator.children.emptyDescription")}
      />
    ),
    renderError: (error) => (
      <NErrorState
        message={getPublicApiErrorMessage(error, t("state.retry"))}
        onRetry={() => void children.refetch()}
        surface="panel"
      />
    ),
    menu: {
      row: (child) => {
        const isActive = child.status === "active";
        const list: ContextMenuItem[] = [
          {
            label: t("operator.children.view"),
            icon: Eye,
            onSelect: () => openView(child),
          },
        ];

        if (!isExactFamily) {
          list.push({
            label: t("operator.children.edit"),
            icon: Pencil,
            onSelect: () => openEdit(child),
          });
          list.push({
            label: t(isActive ? "operator.children.deactivate" : "operator.children.reactivate"),
            icon: isActive ? UserRoundX : UserRoundCheck,
            danger: isActive,
            separatorBefore: true,
            onSelect: () => openStatus(child),
          });
        }

        if (isExactAdmin) {
          list.push({
            label: t("operator.children.delete"),
            icon: Trash2,
            danger: true,
            separatorBefore: true,
            onSelect: () => openDelete(child),
          });
        }

        return list;
      },
    },
    menuButton: !isExactFamily,
    showCheckbox: isExactAdmin,
    rowSelection,
    onRowSelectionChange: setRowSelection,
    onBulkDelete: isExactAdmin ? openBulkDelete : undefined,
    manualPagination: true,
    pageCount: children.pageCount,
    pagination: children.pagination,
    onPaginationChange: children.onPaginationChange,
    cardPagination: createCardPagination(children, t),
    showPagination: true,
    responsiveCards: true,
    defaultMode: "cards",
    classNames: {
      cards: "grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5",
    },
    addButtonText: t("operator.children.create"),
    noDataText: t(isExactFamily ? "family.children.noData" : "operator.children.noData"),
    loadingText: t("operator.children.loading"),
    dynamicHeight: true,
  };

  return (
    <NPageLayout className="flex h-full min-h-0 flex-col gap-4">
      <NPageHeader
        icon={Baby}
        title={t(isExactFamily ? "family.children.title" : "operator.children.title")}
        subtitle={t(isExactFamily ? "family.children.subtitle" : "operator.children.subtitle")}
        actions={<PageHeaderGlobalActions />}
      />
      <div className="min-h-0 flex-1">
        <NTable {...tableProps} />
      </div>
    </NPageLayout>
  );
}
