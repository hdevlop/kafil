"use client";

import { useMemo, useState } from "react";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { NButton, NPageLayout, NTable, type NTableProps, useDialog } from "najm-kit";

import { createOffsetPagination, getPageIndex, hasPossibleNextPage } from "@/lib/pagination";
import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import { PageEmptyState, PageErrorState } from "@/shared/PageState";
import PageHeaderGlobalActions from "@/shared/PageHeaderGlobalActions";
import { DashboardPageHeader as NPageHeader } from "@/shared/DashboardShell/DashboardPageHeader";

import { SupportAssignmentCard } from "./SupportAssignmentCard";
import { SupportAssignmentDetails } from "./SupportAssignmentDetails";
import {
  CreateSupportAssignmentDialogContent,
  EditSupportAssignmentDialogContent,
  EndSupportAssignmentDialogContent,
} from "./SupportAssignmentForms";
import {
  useSupportAssignments,
  useSupportAssignmentSources,
} from "../hooks/useSupportAssignments";
import { useSupportAssignmentsTableColumns } from "../hooks/useSupportAssignmentsTableColumns";
import { useSupportAssignmentsTableFilters } from "../hooks/useSupportAssignmentsTableFilters";
import type { SupportAssignmentRecord, SupportAssignmentView } from "../types";

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

function toView(
  assignment: SupportAssignmentRecord,
  sources: Parameters<typeof decorateAssignments>[1],
  labels: { sponsor: string; family: string },
): SupportAssignmentView {
  const sponsor = sources.sponsors.find(
    (entry) => entry.id === assignment.sponsorProfileId,
  );
  const family = sources.families.find(
    (entry) => entry.id === assignment.familyProfileId,
  );
  const activePlan = sources.plans.find(
    (plan) =>
      plan.supportAssignmentId === assignment.id && plan.status === "active",
  );
  return {
    ...assignment,
    sponsorLabel: sponsor?.name ?? `${labels.sponsor} ${assignment.sponsorProfileId.slice(0, 8)}`,
    familyLabel: family?.guardianLegalName ?? `${labels.family} ${assignment.familyProfileId.slice(0, 8)}`,
    sponsorImage: sponsor?.image ?? null,
    sponsorGender: sponsor?.gender ?? null,
    sponsorEmail: sponsor?.email ?? null,
    sponsorPhone: sponsor?.phone ?? null,
    sponsorshipPriceMinor: activePlan?.amountMinor ?? null,
  };
}

function decorateAssignments(
  assignments: SupportAssignmentRecord[],
  sources: NonNullable<ReturnType<typeof useSupportAssignmentSources>["data"]>,
  labels: { sponsor: string; family: string },
) {
  return assignments.map((assignment) => toView(assignment, sources, labels));
}

export function SupportAssignmentsPage() {
  const { t } = useKafilLanguage();
  const dialog = useDialog();
  const [pagination, setPagination] = useState(() => createOffsetPagination(0, 25));
  const assignments = useSupportAssignments(pagination);
  const sources = useSupportAssignmentSources();
  const columns = useSupportAssignmentsTableColumns();
  const filters = useSupportAssignmentsTableFilters();
  const rows = useMemo(
    () => (sources.data ? decorateAssignments(assignments.data ?? [], sources.data, {
      sponsor: t("operator.assignments.sponsor"),
      family: t("operator.assignments.family"),
    }) : []),
    [assignments.data, sources.data, t],
  );
  const pageIndex = getPageIndex(pagination);
  const pageCount = hasPossibleNextPage(rows.length, pagination) ? pageIndex + 2 : pageIndex + 1;
  const error = assignments.error ?? sources.error;

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
    void dialog.openDialog({
      title: t("operator.assignments.viewTitle"),
      description: t("operator.assignments.viewDescription"),
      children: <SupportAssignmentDetails assignment={assignment} />,
      showButtons: false,
      size: "lg",
      height: "xl",
    });
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
    loading: assignments.isPending || sources.isPending,
    error,
    getRowId: (assignment) => assignment.id,
    onCreate: openCreate,
    onView: openView,
    renderCard: SupportAssignmentCard,
    renderEmpty: () => <PageEmptyState action={<NButton onClick={openCreate}>{t("operator.assignments.create")}</NButton>} title={t("operator.assignments.emptyTitle")} description={t("operator.assignments.emptyDescription")} />,
    renderError: (currentError) => (
      <PageErrorState
        error={currentError}
        onRetry={() => {
          void assignments.refetch();
          void sources.refetch();
        }}
      />
    ),
    menu: {
      row: (assignment) =>
        [
          {
            label: "View",
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
    manualPagination: true,
    pagination: { pageIndex, pageSize: pagination.limit },
    pageCount,
    onPaginationChange: ({ pageIndex: nextIndex, pageSize }) => setPagination(createOffsetPagination(nextIndex, pageSize)),
    pageSizeOptions: [10, 25, 50, 100],
    responsiveCards: true,
    defaultMode: "table",
    classNames: {
      cards: "grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4",
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
    </NPageLayout>
  );
}
