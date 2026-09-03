"use client";

import { useState } from "react";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { createCardPagination, NEmptyState, NErrorState, NPageHeader, NButton, NPageLayout, NTable, type NTableProps, useDialog, useDesktopTableMode } from "najm-kit";

import { useKafilLanguage } from "@/i18n/useKafilLanguage";
import { getPublicApiErrorMessage } from "@/services/apiError";
import PageHeaderGlobalActions from "@/shared/PageHeaderGlobalActions";

import { SupportAssignmentCard } from "./SupportAssignmentCard";
import { SupportAssignmentDetailsSheet } from "./SupportAssignmentDetails";
import {
  CreateSupportAssignmentDialogContent,
  EditSupportAssignmentDialogContent,
  EndSupportAssignmentDialogContent,
} from "./SupportAssignmentForms";
import {
  useResponsiveSupportAssignments,
} from "../hooks/useSupportAssignments";
import { useSupportAssignmentsTableColumns } from "../hooks/useSupportAssignmentsTableColumns";
import { useSupportAssignmentsTableFilters } from "../hooks/useSupportAssignmentsTableFilters";
import type { SupportAssignmentView } from "../types";
import type { ListSupportAssignmentFilters } from "@/services/supportAssignmentApi";

function SupportAssignmentsIcon({ className }: Readonly<{ className?: string }>) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path
        d="M7.5 12.5 10.5 15.5 17 9M12 3.5c-3.7 0-6.7 3-6.7 6.7 0 5.1 4.6 8.4 6.7 9.8 2.1-1.4 6.7-4.7 6.7-9.8C18.7 6.5 15.7 3.5 12 3.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function SupportAssignmentsPage() {
  const { t } = useKafilLanguage();
  const dialog = useDialog();
  const tableMode = useDesktopTableMode();
  const [listFilters, setListFilters] = useState<ListSupportAssignmentFilters>({});
  const [viewingAssignment, setViewingAssignment] = useState<SupportAssignmentView | null>(null);
  const assignments = useResponsiveSupportAssignments(listFilters);
  const columns = useSupportAssignmentsTableColumns();
  const filters = useSupportAssignmentsTableFilters(listFilters, setListFilters);
  const rows = assignments.data;
  const error = assignments.error;

  function openCreate() {
    void dialog.openDialog({
      title: t("operator.assignments.createTitle"),
      description: t("operator.assignments.createDescription"),
      children: <CreateSupportAssignmentDialogContent />,
      showButtons: false,
      size: "xl",
      height: "auto",
    });
  }

  function openView(assignment: SupportAssignmentView) {
    setViewingAssignment(assignment);
  }

  function openEnd(assignment: SupportAssignmentView) {
    void dialog.openDialog({
      title: t("operator.assignments.endTitle"),
      description: t("operator.assignments.endDialogDescription"),
      children: <EndSupportAssignmentDialogContent assignment={assignment} />,
      showButtons: false,
      size: "sm",
    });
  }

  function openEdit(assignment: SupportAssignmentView) {
    void dialog.openDialog({
      title: t("operator.assignments.editTitle"),
      description: t("operator.assignments.editDescription"),
      children: <EditSupportAssignmentDialogContent assignment={assignment} />,
      showButtons: false,
      size: "sm",
    });
  }

  const tableProps: NTableProps<SupportAssignmentView> = {
    data: rows,
    columns,
    filters,
    loading: assignments.loading,
    error,
    getRowId: (assignment) => assignment.id,
    onCreate: openCreate,
    onView: openView,
    renderCard: SupportAssignmentCard,
    renderEmpty: () => <NEmptyState surface="panel" icon={<SupportAssignmentsIcon className="size-8" />} action={<NButton onClick={openCreate}>{t("operator.assignments.create")}</NButton>} title={t("operator.assignments.emptyTitle")} description={t("operator.assignments.emptyDescription")} />,
    renderError: (currentError) => (
      <NErrorState
        message={getPublicApiErrorMessage(currentError, t("state.retry"))}
        onRetry={() => {
          void assignments.refetch();
        }}
        surface="panel"
      />
    ),
    menu: {
      row: (assignment) =>
        [
          {
            label: t("common.view"),
            icon: Eye,
            onSelect: () => openView(assignment),
          },
          {
            label: t("operator.assignments.edit"),
            icon: Pencil,
            onSelect: () => openEdit(assignment),
          },
          ...(assignment.status === "active"
            ? [
                {
                  label: t("operator.assignments.delete"),
                  icon: Trash2,
                  danger: true,
                  separatorBefore: true,
                  onSelect: () => openEnd(assignment),
                },
              ]
            : []),
        ],
    },
    menuButton: true,
    showPagination: true,
    manualPagination: true,
    pagination: assignments.pagination,
    pageCount: assignments.pageCount,
    onPaginationChange: assignments.onPaginationChange,
    cardPagination: createCardPagination(assignments, t),
    pageSizeOptions: [10, 25, 50, 100],
    availableModes: ["cards", "table"],
    mode: tableMode,
    responsiveSkeleton: true,
    defaultMode: "table",
    responsiveCards: false,
    showColumnVisibility: false,
    showViewToggle: false,
    classNames: {
      header: "relative z-20",
      cards: "grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4",
      tableHeader: "[&_th:nth-child(2)]:w-[20%] [&_th:nth-child(5)]:w-[20%] [&_th:last-child]:w-12",
    },
    addButtonText: t("operator.assignments.create"),
    noDataText: t("operator.assignments.noData"),
    loadingText: t("operator.assignments.loading"),
    dynamicHeight: true,
  };

  return (
    <NPageLayout className="flex h-full min-h-0 flex-col gap-4">
      <NPageHeader icon={SupportAssignmentsIcon} title={t("operator.assignments.title")} subtitle={t("operator.assignments.subtitle")} actions={<PageHeaderGlobalActions />} />
      <div className="min-h-0 flex-1">
        <NTable {...tableProps} />
      </div>
      <SupportAssignmentDetailsSheet
        assignment={viewingAssignment}
        open={Boolean(viewingAssignment)}
        onOpenChange={(open) => {
          if (!open) setViewingAssignment(null);
        }}
      />
    </NPageLayout>
  );
}
