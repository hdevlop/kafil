"use client";

import { useState } from "react";
import { BadgeCheck, CircleX, Eye, RotateCcw, Trash2 } from "lucide-react";
import { useUser } from "najm-auth/client/react";
import {
  NPageLayout,
  NButton,
  NTable,
  type NTableProps,
  useDialog,
} from "najm-kit";

import {
  createOffsetPagination,
  getPageIndex,
  hasPossibleNextPage,
} from "@/lib/pagination";
import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import { PageEmptyState, PageErrorState } from "@/shared/PageState";
import PageHeaderGlobalActions from "@/shared/PageHeaderGlobalActions";
import { DashboardPageHeader as NPageHeader } from "@/shared/DashboardShell/DashboardPageHeader";

import { ContributionCard } from "./ContributionCard";
import { ContributionDetails } from "./ContributionDetails";
import { RecordContributionDialogContent } from "./RecordContributionForm";
import {
  BulkDeleteContributionsDialogContent,
  ContributionReasonDialogContent,
  DeleteContributionDialogContent,
  ValidateContributionDialogContent,
} from "./ContributionForms";
import { useContributionCommands, useContributions } from "../hooks/useContributions";
import { useContributionsTableColumns } from "../hooks/useContributionsTableColumns";
import { useContributionsTableFilters } from "../hooks/useContributionsTableFilters";
import type { ContributionRecord } from "../types";

function ContributionsIcon({ className }: Readonly<{ className?: string }>) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M4 7.5h16M7 4.5h10a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-9a3 3 0 0 1 3-3Zm1 10h4m2 0h2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function ContributionsPage({
  familyProfileId,
}: Readonly<{ familyProfileId?: string }>) {
  const { t } = useKafilLanguage();
  const dialog = useDialog();
  const user = useUser();
  const [pagination, setPagination] = useState(() =>
    createOffsetPagination(0, 25),
  );
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>(
    {},
  );
  const contributions = useContributions({ ...pagination, familyProfileId });
  const { validate, reject, refund, remove } = useContributionCommands();
  const columns = useContributionsTableColumns();
  const filters = useContributionsTableFilters();
  const rows = contributions.data ?? [];
  const pageIndex = getPageIndex(pagination);
  const pageCount = hasPossibleNextPage(rows.length, pagination)
    ? pageIndex + 2
    : pageIndex + 1;

  function openView(contribution: ContributionRecord) {
    void dialog.openDialog({
      title: t("operator.contributions.viewTitle"),
      description: t("operator.contributions.viewDescription"),
      children: <ContributionDetails contribution={contribution} />,
      showButtons: false,
      size: "lg",
      height: "xl",
    });
  }

  function openRecord() {
    void dialog.openDialog({
      title: t("operator.contributions.recordTitle"),
      description: t("operator.contributions.recordDescription"),
      children: <RecordContributionDialogContent />,
      showButtons: false,
      size: "lg",
      height: "auto",
    });
  }

  function openValidate(contribution: ContributionRecord) {
    void dialog.openDialog({
      title: t("operator.contributions.validateTitle"),
      description: t("operator.contributions.validateDescription"),
      children: <ValidateContributionDialogContent contribution={contribution} />,
      showButtons: false,
      size: "sm",
    });
  }

  function openReason(
    action: "reject" | "refund",
    contribution: ContributionRecord,
  ) {
    void dialog.openDialog({
      title: t(
        action === "refund"
          ? "operator.contributions.refundTitle"
          : "operator.contributions.rejectTitle",
      ),
      description:
        action === "refund"
          ? t("operator.contributions.refundDescription")
          : t("operator.contributions.rejectDescription"),
      children: (
        <ContributionReasonDialogContent
          action={action}
          contribution={contribution}
        />
      ),
      showButtons: false,
      size: "sm",
    });
  }

  function openDelete(contribution: ContributionRecord) {
    void dialog.openDialog({
      title: t("operator.contributions.deleteTitle"),
      description: t("operator.contributions.deleteDescription"),
      children: <DeleteContributionDialogContent contribution={contribution} />,
      showButtons: false,
      size: "sm",
    });
  }

  function openBulkDelete(contributionIds: string[]) {
    void dialog.openDialog({
      title: t("operator.contributions.bulkDeleteTitle", {
        count: contributionIds.length,
      }),
      description: t("operator.contributions.bulkDeleteDescription"),
      children: (
        <BulkDeleteContributionsDialogContent
          contributionIds={contributionIds}
          onDeleted={() => setRowSelection({})}
        />
      ),
      showButtons: false,
      size: "sm",
    });
  }

  const isAdmin = user?.role === "admin";

  const tableProps: NTableProps<ContributionRecord> = {
    data: rows,
    columns,
    filters,
    loading: contributions.isPending,
    error: contributions.error,
    getRowId: (contribution) => contribution.id,
    onCreate: openRecord,
    onView: openView,
    renderCard: ContributionCard,
    renderEmpty: () => (
      <PageEmptyState
        action={<NButton onClick={openRecord}>{t("operator.contributions.record")}</NButton>}
        title={t("operator.contributions.emptyTitle")}
        description={t("operator.contributions.emptyDescription")}
      />
    ),
    renderError: (error) => (
      <PageErrorState
        error={error}
        onRetry={() => void contributions.refetch()}
      />
    ),
    menu: {
      row: (contribution) => {
        const canDelete = isAdmin;
        const viewAction = {
          label: t("operator.contributions.view"),
          icon: Eye,
          onSelect: () => openView(contribution),
        };
        const deleteAction = {
          label: t("operator.contributions.delete"),
          icon: Trash2,
          danger: true,
          separatorBefore: true,
          onSelect: () => openDelete(contribution),
          disabled: remove.isPending,
        };

        if (contribution.status === "pending") {
          const actions = [
            viewAction,
            {
              label: t("operator.contributions.validateAndCredit"),
              icon: BadgeCheck,
              separatorBefore: true,
              onSelect: () => openValidate(contribution),
              disabled: validate.isPending,
            },
            {
              label: t("operator.contributions.reject"),
              icon: CircleX,
              danger: true,
              onSelect: () => openReason("reject", contribution),
              disabled: reject.isPending,
            },
          ];
          if (canDelete) actions.push(deleteAction);
          return actions;
        }

        if (contribution.status === "validated") {
          const actions = [
            viewAction,
            {
              label: t("operator.contributions.refund"),
              icon: RotateCcw,
              separatorBefore: true,
              danger: true,
              onSelect: () => openReason("refund", contribution),
              disabled: refund.isPending,
            },
          ];
          if (canDelete) actions.push(deleteAction);
          return actions;
        }

        return canDelete ? [viewAction, deleteAction] : [viewAction];
      },
    },
    menuButton: true,
    showCheckbox: isAdmin,
    rowSelection,
    onRowSelectionChange: setRowSelection,
    onBulkDelete: isAdmin ? openBulkDelete : undefined,
    manualPagination: true,
    pagination: { pageIndex, pageSize: pagination.limit },
    pageCount,
    onPaginationChange: ({ pageIndex: nextIndex, pageSize }) =>
      setPagination(createOffsetPagination(nextIndex, pageSize)),
    pageSizeOptions: [10, 25, 50, 100],
    responsiveCards: true,
    defaultMode: "table",
    noDataText: t("operator.contributions.noData"),
    loadingText: t("operator.contributions.loading"),
    dynamicHeight: true,
    addButtonText: t("operator.contributions.record"),
  };

  return (
    <NPageLayout className="flex h-full min-h-0 flex-col gap-4">
      <NPageHeader
        icon={ContributionsIcon}
        title={t("operator.contributions.title")}
        subtitle={t("operator.contributions.subtitle")}
        actions={<PageHeaderGlobalActions />}
      />
      <div className="min-h-0 flex-1">
        <NTable {...tableProps} />
      </div>
    </NPageLayout>
  );
}
