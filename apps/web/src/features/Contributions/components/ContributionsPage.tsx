"use client";

import { useRef, useState } from "react";
import { BadgeCheck, CircleX, Eye, RotateCcw, Trash2 } from "lucide-react";
import { useUser } from "najm-auth/client/react";
import {
  NButton,
  NPageLayout,
  NTable,
  type ContextMenuItem,
  type NTableProps,
  useDialog,
} from "najm-kit";

import { createOffsetPagination, getPageIndex } from "@/lib/pagination";
import { useAvailableTablePageSize } from "@/hooks/useAvailableTablePageSize";
import { useCardViewport, useDesktopTableMode } from "@/hooks/useDesktopTableMode";
import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import { PageEmptyState, PageErrorState } from "@/shared/PageState";
import PageHeaderGlobalActions from "@/shared/PageHeaderGlobalActions";
import { DashboardPageHeader as NPageHeader } from "@/shared/DashboardShell/DashboardPageHeader";
import { useKafilRole } from "@/shared/Authorization";
import { createCardPagination } from "@/lib/tablePagination";

import { ContributionCard } from "./ContributionCard";
import { ContributionDetailsSheet } from "./ContributionDetails";
import { RecordContributionDialogContent } from "./RecordContributionForm";
import {
  BulkDeleteContributionsDialogContent,
  ContributionReasonDialogContent,
  DeleteContributionDialogContent,
  ValidateContributionDialogContent,
} from "./ContributionForms";
import { useContributionCommands, useContributionPage, useInfiniteContributions } from "../hooks/useContributions";
import { useContributionsTableColumns } from "../hooks/useContributionsTableColumns";
import { useContributionsTableFilters } from "../hooks/useContributionsTableFilters";
import type { ContributionAudience, ContributionListRecord, ContributionRecord } from "../types";

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
  const { t } = useKafilLanguage();
  const dialog = useDialog();
  const user = useUser();
  const { exact } = useKafilRole();
  const tableMode = useDesktopTableMode();
  const isCardViewport = useCardViewport();
  const [pagination, setPagination] = useState(() => createOffsetPagination(0, 25));
  const containerRef = useAvailableTablePageSize((availablePageSize) => {
    if (isCardViewport) return;
    setPagination((current) => current.limit === availablePageSize
      ? current
      : createOffsetPagination(0, availablePageSize));
  });
  const audience: ContributionAudience =
    exact === "family"
      ? "family"
      : exact === "sponsor"
        ? "sponsor"
        : "management";
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [viewingContribution, setViewingContribution] = useState<ContributionListRecord | null>(null);
  const bulkDeleteDialogOpenRef = useRef(false);
  const pagedContributions = useContributionPage<ContributionListRecord>(
    { ...pagination, audience },
    !isCardViewport,
  );
  const incrementalContributions = useInfiniteContributions<ContributionListRecord>(
    { audience },
    isCardViewport,
  );
  const { validate, reject, refund, remove } = useContributionCommands();
  const rows = isCardViewport ? incrementalContributions.rows : (pagedContributions.data?.rows ?? []);
  const contributions = isCardViewport ? incrementalContributions : pagedContributions;
  const filters = useContributionsTableFilters(audience, rows);
  const pageIndex = getPageIndex(pagination);
  const pageCount = !isCardViewport && pagedContributions.data?.hasNextPage ? pageIndex + 2 : pageIndex + 1;
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
    loading: contributions.isPending,
    error: contributions.error,
    getRowId: (contribution) => contribution.id,
    onCreate: audience === "management" ? openRecord : undefined,
    renderCard: ContributionCard,
    renderEmpty: () => (
      <PageEmptyState
        action={audience === "management" ? <NButton onClick={openRecord}>{t("operator.contributions.record")}</NButton> : undefined}
        icon={ContributionsIcon}
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
    renderError: (error) => <PageErrorState error={error} onRetry={() => void contributions.refetch()} />,
    menu: { row: rowActions },
    menuButton: true,
    showCheckbox: audience === "management" && isAdmin,
    rowSelection,
    onRowSelectionChange: setRowSelection,
    onBulkDelete: audience === "management" && isAdmin ? openBulkDelete : undefined,
    ...(!isCardViewport
      ? {
          manualPagination: true,
          pagination: { pageIndex, pageSize: pagination.limit },
          pageCount,
          onPaginationChange: ({ pageIndex: nextIndex, pageSize }: { pageIndex: number; pageSize: number }) => {
            if (pagedContributions.isFetching) return;
            setPagination(createOffsetPagination(nextIndex, pageSize));
          },
        }
      : {}),
    pageSizeOptions: [...new Set([pagination.limit, 10, 25, 50, 100])].sort((a, b) => a - b),
    showPagination: true,
    cardPagination: createCardPagination({
      cardViewport: isCardViewport,
      hasNextPage: incrementalContributions.hasNextPage,
      loadingMore: incrementalContributions.isFetchingNextPage,
      loadMoreError: incrementalContributions.isFetchNextPageError
        ? incrementalContributions.error
        : null,
      onLoadMore: () => incrementalContributions.fetchNextPage(),
    }, t),
    availableModes: ["cards", "table"],
    mode: tableMode,
    defaultMode: "table",
    responsiveCards: false,
    showColumnVisibility: false,
    showViewToggle: false,
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
      <div ref={containerRef} className="min-h-0 flex-1"><NTable {...tableProps} /></div>
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
