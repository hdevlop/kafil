"use client";

import {
  Baby,
  Eye,
  Pencil,
  Trash2,
  UserRoundCheck,
  UserRoundX,
} from "lucide-react";
import { useUser } from "najm-auth/client/react";
import {
  NButton,
  NPageLayout,
  NTable,
  type NTableProps,
  useDialog,
} from "najm-kit";

import { PageEmptyState, PageErrorState } from "@/shared/PageState";
import PageHeaderGlobalActions from "@/shared/PageHeaderGlobalActions";
import { DashboardPageHeader as NPageHeader } from "@/shared/DashboardShell/DashboardPageHeader";
import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";

import { ChildCard } from "./ChildCard";
import { ChildDetails } from "./ChildDetails";
import {
  ChildStatusDialogContent,
  CreateChildDialogContent,
  DeleteChildDialogContent,
  UpdateChildDialogContent,
} from "./ChildForms";
import { useChildren } from "../hooks/useChildren";
import { useChildrenTableColumns } from "../hooks/useChildrenTableColumns";
import { useChildrenTableFilters } from "../hooks/useChildrenTableFilters";
import type { ChildRecord } from "../types";

const CHILD_LIST_LIMIT = 100;

export function ChildrenPage() {
  const { t } = useKafilLanguage();
  const dialog = useDialog();
  const user = useUser();
  const children = useChildren({ limit: CHILD_LIST_LIMIT, offset: 0 });
  const columns = useChildrenTableColumns();
  const filters = useChildrenTableFilters();
  const rows = children.data ?? [];

  const getRowClassName = (child: ChildRecord) =>
    child.familyStatus !== undefined && child.familyStatus !== "active"
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
      description: "Operator-only child and family relationship details.",
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
      title: `${action === "deactivate" ? "Deactivate" : "Reactivate"} ${child.legalName}`,
      description: "This lifecycle command is audited by the backend.",
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

  const tableProps: NTableProps<ChildRecord> = {
    data: rows,
    columns,
    filters,
    loading: children.isPending,
    error: children.error,
    getRowId: (child) => child.id,
    onCreate: openCreate,
    onView: openView,
    onEdit: openEdit,
    onRowClick: openView,
    renderCard: ChildCard,
    getRowClassName,
    renderEmpty: () => (
      <PageEmptyState
        action={<NButton onClick={openCreate}>{t("operator.children.create")}</NButton>}
        title={t("operator.children.emptyTitle")}
        description={t("operator.children.emptyDescription")}
      />
    ),
    renderError: (error) => (
      <PageErrorState error={error} onRetry={() => void children.refetch()} />
    ),
    menu: {
      row: (child) => {
        const isActive = child.status === "active";

        const actions = [
          {
            label: t("operator.children.view"),
            icon: Eye,
            onSelect: () => openView(child),
          },
          {
            label: t("operator.children.edit"),
            icon: Pencil,
            onSelect: () => openEdit(child),
          },
          {
            label: t(isActive ? "operator.children.deactivate" : "operator.children.reactivate"),
            icon: isActive ? UserRoundX : UserRoundCheck,
            danger: isActive,
            separatorBefore: true,
            onSelect: () => openStatus(child),
          },
        ];

        if (user?.role === "admin") {
          actions.push({
            label: t("operator.children.delete"),
            icon: Trash2,
            danger: true,
            separatorBefore: true,
            onSelect: () => openDelete(child),
          });
        }

        return actions;
      },
    },
    menuButton: true,
    showPagination: false,
    responsiveCards: true,
    defaultMode: "cards",
    classNames: {
      cards: "grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4",
    },
    addButtonText: t("operator.children.create"),
    noDataText: t("operator.children.noData"),
    loadingText: t("operator.children.loading"),
    dynamicHeight: true,
  };

  return (
    <NPageLayout className="flex h-full min-h-0 flex-col gap-4">
      <NPageHeader
        icon={Baby}
        title={t("operator.children.title")}
        subtitle={t("operator.children.subtitle")}
        actions={<PageHeaderGlobalActions />}
      />
      <div className="min-h-0 flex-1">
        <NTable {...tableProps} />
      </div>
    </NPageLayout>
  );
}
