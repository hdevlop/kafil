"use client";

import { useRef, useState } from "react";
import { BadgeCheck, CircleX, Eye, RotateCcw, Trash2 } from "lucide-react";
import { useUser } from "najm-auth/client/react";
import {
  IconButton,
  NButton,
  NPageLayout,
  NRowActions,
  NTable,
  SimpleTooltip,
  type NTableProps,
  useDialog,
} from "najm-kit";

import { createOffsetPagination, getPageIndex, hasPossibleNextPage } from "@/lib/pagination";
import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import { PageEmptyState, PageErrorState } from "@/shared/PageState";
import PageHeaderGlobalActions from "@/shared/PageHeaderGlobalActions";
import { DashboardPageHeader as NPageHeader } from "@/shared/DashboardShell/DashboardPageHeader";
import { Admin, Operator, useKafilRole } from "@/shared/Authorization";

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
import type { ContributionAudience, ContributionListRecord, ContributionRecord } from "../types";

function ContributionsIcon({ className }: Readonly<{ className?: string }>) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path d="M4 7.5h16M7 4.5h10a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-9a3 3 0 0 1 3-3Zm1 10h4m2 0h2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function isManagement(record: ContributionListRecord): record is ContributionRecord {
  return "sponsorName" in record;
}

export function ContributionsPage() {
  const { t } = useKafilLanguage();
  const dialog = useDialog();
  const user = useUser();
  const { exact } = useKafilRole();
  const audience: ContributionAudience = exact === "family" ? "family" : "management";
  const [pagination, setPagination] = useState(() => createOffsetPagination(0, 25));
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const bulkDeleteDialogOpenRef = useRef(false);
  const contributions = useContributions<ContributionListRecord>({ ...pagination, audience });
  const { validate, reject, refund, remove } = useContributionCommands();
  const filters = useContributionsTableFilters(audience);
  const rows = contributions.data ?? [];
  const pageIndex = getPageIndex(pagination);
  const pageCount = hasPossibleNextPage(rows.length, pagination) ? pageIndex + 2 : pageIndex + 1;
  const isAdmin = user?.role === "admin";

  function openView(contribution: ContributionListRecord) {
    void dialog.openDialog({
      title: t(audience === "family" ? "family.contributions.viewTitle" : "operator.contributions.viewTitle"),
      description: t(audience === "family" ? "family.contributions.viewDescription" : "operator.contributions.viewDescription"),
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

  function actionButton(label: string, icon: React.ReactNode, onClick: () => void, options?: { danger?: boolean; disabled?: boolean; title?: string }) {
    return (
      <SimpleTooltip content={options?.title ?? label}>
        <IconButton aria-label={label} disabled={options?.disabled} size="md" variant={options?.danger ? "destructive" : "ghost"} onClick={(event) => { event.stopPropagation(); onClick(); }}>
          {icon}
        </IconButton>
      </SimpleTooltip>
    );
  }

  function renderActions(contribution: ContributionListRecord) {
    const management = isManagement(contribution);
    const isPending = contribution.status === "pending";
    const isExpired = isPending && Boolean(contribution.expiresAt) && new Date(contribution.expiresAt!).getTime() <= Date.now();
    return (
      <NRowActions>
        {actionButton(t("operator.contributions.view"), <Eye className="size-4" />, () => openView(contribution))}
        {management ? (
          <Operator>
            {isPending ? (
              <>
                {actionButton(t("operator.contributions.validateAndCredit"), <BadgeCheck className="size-4" />, () => openValidate(contribution), { disabled: validate.isPending || isExpired, title: isExpired ? t("operator.contributions.expiredWarning") : undefined })}
                {actionButton(t("operator.contributions.reject"), <CircleX className="size-4" />, () => openReason("reject", contribution), { danger: true, disabled: reject.isPending })}
              </>
            ) : null}
            {contribution.status === "validated" ? actionButton(t("operator.contributions.refund"), <RotateCcw className="size-4" />, () => openReason("refund", contribution), { danger: true, disabled: refund.isPending }) : null}
          </Operator>
        ) : null}
        {management ? <Admin>{actionButton(t("operator.contributions.delete"), <Trash2 className="size-4" />, () => openDelete(contribution), { danger: true, disabled: remove.isPending })}</Admin> : null}
      </NRowActions>
    );
  }

  const columns = useContributionsTableColumns(audience, renderActions);
  const tableProps: NTableProps<ContributionListRecord> = {
    data: rows,
    columns,
    filters,
    loading: contributions.isPending,
    error: contributions.error,
    getRowId: (contribution) => contribution.id,
    onCreate: audience === "management" ? openRecord : undefined,
    onView: openView,
    renderCard: (props) => <ContributionCard {...props} actions={renderActions(props.data)} familySafe={audience === "family"} />,
    renderEmpty: () => (
      <PageEmptyState
        action={audience === "management" ? <NButton onClick={openRecord}>{t("operator.contributions.record")}</NButton> : undefined}
        icon={ContributionsIcon}
        title={t(audience === "family" ? "family.contributions.emptyTitle" : "operator.contributions.emptyTitle")}
        description={t(audience === "family" ? "family.contributions.emptyDescription" : "operator.contributions.emptyDescription")}
      />
    ),
    renderError: (error) => <PageErrorState error={error} onRetry={() => void contributions.refetch()} />,
    menuButton: false,
    showCheckbox: audience === "management" && isAdmin,
    rowSelection,
    onRowSelectionChange: setRowSelection,
    onBulkDelete: audience === "management" && isAdmin ? openBulkDelete : undefined,
    manualPagination: true,
    pagination: { pageIndex, pageSize: pagination.limit },
    pageCount,
    onPaginationChange: ({ pageIndex: nextIndex, pageSize }) => setPagination(createOffsetPagination(nextIndex, pageSize)),
    pageSizeOptions: [10, 25, 50, 100],
    responsiveCards: true,
    defaultMode: "table",
    noDataText: t(audience === "family" ? "family.contributions.noData" : "operator.contributions.noData"),
    loadingText: t("operator.contributions.loading"),
    dynamicHeight: true,
    addButtonText: audience === "management" ? t("operator.contributions.record") : undefined,
  };

  return (
    <NPageLayout className="flex h-full min-h-0 flex-col gap-4">
      <NPageHeader
        icon={ContributionsIcon}
        title={t(audience === "family" ? "family.contributions.title" : "operator.contributions.title")}
        subtitle={t(audience === "family" ? "family.contributions.subtitle" : "operator.contributions.subtitle")}
        actions={<PageHeaderGlobalActions />}
      />
      <div className="min-h-0 flex-1"><NTable {...tableProps} /></div>
    </NPageLayout>
  );
}
