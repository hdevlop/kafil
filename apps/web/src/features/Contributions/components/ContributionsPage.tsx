"use client";

import { useRef, useState } from "react";
import { BadgeCheck, CircleX, Eye, RotateCcw, Trash2 } from "lucide-react";
import { useUser } from "najm-auth/client/react";
import { createCardPagination, NEmptyState, NErrorState, NPageHeader, NButton, NPageLayout, NTable, type ContextMenuItem, type NTableProps, useDialog, useDesktopTableMode } from "najm-kit";

import { useTranslation } from "najm-i18n/react";
import { getPublicApiErrorMessage } from "@/services/apiError";
import PageHeaderGlobalActions from "@/shared/PageHeaderGlobalActions";
import { useKafilRole } from "@/shared/Authorization";

import { ContributionCard } from "./ContributionCard";
import { ContributionDetailsSheet } from "./ContributionDetails";
import { RecordContributionDialogContent } from "./RecordContributionForm";
import {
  BulkDeleteContributionsDialogContent,
  ContributionReasonDialogContent,
  DeleteContributionDialogContent,
  ValidateContributionDialogContent,
} from "./ContributionForms";
import { useContributionCommands, useResponsiveContributions } from "../hooks/useContributions";
import { useContributionsTableColumns } from "../hooks/useContributionsTableColumns";
import { useContributionsTableFilters } from "../hooks/useContributionsTableFilters";
import type { ContributionAudience, ContributionListQuery, ContributionListRecord, ContributionRecord } from "../types";

function ContributionsIcon({ className }: Readonly<{ className?: string }>) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path d="M4 7.5h16M7 4.5h10a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-9a3 3 0 0 1 3-3Zm1 10h4m2 0h2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function isManagement(record: ContributionListRecord): record is ContributionRecord {
  return "paymentMethod" in record && "familyName" in record;
}

export function ContributionsPage() {
  const { t } = useTranslation();
  const dialog = useDialog();
  const user = useUser();
  const { exact } = useKafilRole();
  const tableMode = useDesktopTableMode();
  const [listFilters, setListFilters] = useState<Omit<ContributionListQuery, "limit" | "offset" | "audience">>({});
  // Page size, viewport strategy, and the reset on a filter change all belong to
  // `useResponsiveContributions` now — NTable measures the container itself and
  // reports the size it wants back through `onPaginationChange`.
  const audience: ContributionAudience =
    exact === "family"
      ? "family"
      : exact === "sponsor"
        ? "sponsor"
        : "management";
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [viewingContribution, setViewingContribution] = useState<ContributionListRecord | null>(null);
  const bulkDeleteDialogOpenRef = useRef(false);
  const contributions = useResponsiveContributions<ContributionListRecord>({
    ...listFilters,
    audience,
  });
  const { validate, reject, refund, remove } = useContributionCommands();
  const rows = contributions.data;
  const filters = useContributionsTableFilters(listFilters, setListFilters);
  const isAdmin = user?.role === "admin";

  function openView(contribution: ContributionListRecord) {
    setViewingContribution(contribution);
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

  function openReason(action: "reject" | "refund", contribution: ContributionRecord) {
    void dialog.openDialog({
      title: t(action === "refund" ? "operator.contributions.refundTitle" : "operator.contributions.rejectTitle"),
      description: t(action === "refund" ? "operator.contributions.refundDescription" : "operator.contributions.rejectDescription"),
      children: <ContributionReasonDialogContent action={action} contribution={contribution} />,
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
    if (bulkDeleteDialogOpenRef.current) return;
    bulkDeleteDialogOpenRef.current = true;
    void dialog.openDialog({
      title: t("operator.contributions.bulkDeleteTitle", { count: contributionIds.length }),
      description: t("operator.contributions.bulkDeleteDescription"),
      children: <BulkDeleteContributionsDialogContent contributionIds={contributionIds} onDeleted={() => setRowSelection({})} />,
      showButtons: false,
      size: "sm",
    }).finally(() => { bulkDeleteDialogOpenRef.current = false; });
  }

  function rowActions(contribution: ContributionListRecord) {
    const management = isManagement(contribution);
    const isPending = contribution.status === "pending";
    const isExpired = isPending && Boolean(contribution.expiresAt) && new Date(contribution.expiresAt!).getTime() <= Date.now();
    const actions: ContextMenuItem[] = [{
      label: t("operator.contributions.view"),
      icon: Eye,
      onSelect: () => openView(contribution),
    }];
    if (management && isPending) {
      actions.push({
        label: t("operator.contributions.validateAndCredit"),
        icon: BadgeCheck,
        disabled: validate.isPending || isExpired,
        onSelect: () => openValidate(contribution),
      });
      actions.push({
        label: t("operator.contributions.reject"),
        icon: CircleX,
        danger: true,
        disabled: reject.isPending,
        onSelect: () => openReason("reject", contribution),
      });
    }
    if (management && contribution.status === "validated") {
      actions.push({
        label: t("operator.contributions.refund"),
        icon: RotateCcw,
        danger: true,
        disabled: refund.isPending,
        onSelect: () => openReason("refund", contribution),
      });
    }
    if (management && isAdmin) {
      actions.push({
        label: t("operator.contributions.delete"),
        icon: Trash2,
        danger: true,
        disabled: remove.isPending,
        onSelect: () => openDelete(contribution),
      });
    }
    return actions;
  }

  const columns = useContributionsTableColumns(audience);
  const tableProps: NTableProps<ContributionListRecord> = {
    data: rows,
    columns,
    filters,
    loading: contributions.loading,
    error: contributions.error,
    getRowId: (contribution) => contribution.id,
    onCreate: audience === "management" ? openRecord : undefined,
    onRowClick: openView,
    renderCard: ContributionCard,
    renderEmpty: () => (
      <NEmptyState
        surface="panel"
        action={audience === "management" ? <NButton onClick={openRecord}>{t("operator.contributions.record")}</NButton> : undefined}
        icon={<ContributionsIcon className="size-8" />}
        title={t(
          audience === "family"
            ? "family.contributions.emptyTitle"
            : audience === "sponsor"
              ? "sponsor.contributions.emptyTitle"
              : "operator.contributions.emptyTitle"
        )}
        description={t(
          audience === "family"
            ? "family.contributions.emptyDescription"
            : audience === "sponsor"
              ? "sponsor.contributions.emptyDescription"
              : "operator.contributions.emptyDescription"
        )}
      />
    ),
    renderError: (error) => (
      <NErrorState
        message={getPublicApiErrorMessage(error, t("state.retry"))}
        onRetry={() => void contributions.refetch()}
        surface="panel"
      />
    ),
    menu: { row: rowActions },
    menuButton: true,
    showCheckbox: audience === "management" && isAdmin,
    rowSelection,
    onRowSelectionChange: setRowSelection,
    onBulkDelete: audience === "management" && isAdmin ? openBulkDelete : undefined,
    manualPagination: true,
    // A real result total, so the page buttons cover the whole result from the
    // first page instead of appearing one at a time as the reader finds them.
    pageCount: contributions.pageCount,
    pagination: contributions.pagination,
    onPaginationChange: contributions.onPaginationChange,
    showPagination: true,
    cardPagination: createCardPagination(contributions, t),
    availableModes: ["cards", "table"],
    mode: tableMode,
    responsiveSkeleton: true,
    defaultMode: "table",
    responsiveCards: false,
    showColumnVisibility: false,
    showViewToggle: false,
    classNames: {
      tableHeader:
        audience === "management" && isAdmin
          ? "[&_th:nth-child(2)]:w-[20%] [&_th:nth-child(3)]:w-[20%] [&_th:last-child]:w-12"
          : audience === "management" || audience === "sponsor"
            ? "[&_th:nth-child(1)]:w-[20%] [&_th:nth-child(2)]:w-[20%] [&_th:last-child]:w-12"
            : "[&_th:nth-child(1)]:w-[20%] [&_th:last-child]:w-12",
    },
    noDataText: t(
      audience === "family"
        ? "family.contributions.noData"
        : audience === "sponsor"
          ? "sponsor.contributions.noData"
          : "operator.contributions.noData"
    ),
    loadingText: t("operator.contributions.loading"),
    dynamicHeight: true,
    addButtonText: audience === "management" ? t("operator.contributions.record") : undefined,
  };

  return (
    <NPageLayout className="flex h-full min-h-0 flex-col gap-4">
      <NPageHeader
        icon={ContributionsIcon}
        title={t(
          audience === "family"
            ? "family.contributions.title"
            : audience === "sponsor"
              ? "sponsor.contributions.title"
              : "operator.contributions.title"
        )}
        subtitle={t(
          audience === "family"
            ? "family.contributions.subtitle"
            : audience === "sponsor"
              ? "sponsor.contributions.subtitle"
              : "operator.contributions.subtitle"
        )}
        actions={<PageHeaderGlobalActions />}
      />
      <div className="min-h-0 flex-1"><NTable {...tableProps} /></div>
      <ContributionDetailsSheet
        contribution={viewingContribution}
        open={Boolean(viewingContribution)}
        onOpenChange={(open) => {
          if (!open) setViewingContribution(null);
        }}
      />
    </NPageLayout>
  );
}
