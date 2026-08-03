"use client";

import { useRef, useState } from "react";
import { BadgeCheck, CircleX, Eye, MoreHorizontal, RotateCcw, Trash2 } from "lucide-react";
import { useUser } from "najm-auth/client/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  IconButton,
  NButton,
  NPageLayout,
  NTable,
  SimpleTooltip,
  type NTableProps,
  useDialog,
} from "najm-kit";

import { createOffsetPagination, getPageIndex, hasPossibleNextPage } from "@/lib/pagination";
import { useDesktopTableMode } from "@/hooks/useDesktopTableMode";
import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import { PageEmptyState, PageErrorState } from "@/shared/PageState";
import PageHeaderGlobalActions from "@/shared/PageHeaderGlobalActions";
import { DashboardPageHeader as NPageHeader } from "@/shared/DashboardShell/DashboardPageHeader";
import { Admin, OnlySponsor, Operator, useKafilRole } from "@/shared/Authorization";

import { ContributionCard } from "./ContributionCard";
import { ContributionDetailsSheet } from "./ContributionDetails";
import { SponsorContributionWorkspace } from "./SponsorContributionWorkspace";
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
  return "paymentMethod" in record && "familyName" in record;
}

export function ContributionsPage({
  initialAssignmentId = "",
}: Readonly<{ initialAssignmentId?: string }>) {
  const { t } = useKafilLanguage();
  const dialog = useDialog();
  const user = useUser();
  const { exact } = useKafilRole();
  const tableMode = useDesktopTableMode();
  const audience: ContributionAudience =
    exact === "family"
      ? "family"
      : exact === "sponsor"
        ? "sponsor"
        : "management";
  const [pagination, setPagination] = useState(() => createOffsetPagination(0, 25));
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [viewingContribution, setViewingContribution] = useState<ContributionListRecord | null>(null);
  const bulkDeleteDialogOpenRef = useRef(false);
  const contributions = useContributions<ContributionListRecord>({ ...pagination, audience });
  const { validate, reject, refund, remove } = useContributionCommands();
  const filters = useContributionsTableFilters(audience);
  const rows = contributions.data ?? [];
  const pageIndex = getPageIndex(pagination);
  const pageCount = hasPossibleNextPage(rows.length, pagination) ? pageIndex + 2 : pageIndex + 1;
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

  function actionItem(label: string, icon: React.ReactNode, onClick: () => void, options?: { danger?: boolean; disabled?: boolean; title?: string }) {
    return (
      <DropdownMenuItem
        disabled={options?.disabled}
        title={options?.title}
        variant={options?.danger ? "destructive" : "default"}
        onSelect={(event) => { event.stopPropagation(); onClick(); }}
      >
        {icon}
        {label}
      </DropdownMenuItem>
    );
  }

  function renderActions(contribution: ContributionListRecord) {
    const management = isManagement(contribution);
    const isPending = contribution.status === "pending";
    const isExpired = isPending && Boolean(contribution.expiresAt) && new Date(contribution.expiresAt!).getTime() <= Date.now();
    return (
      <DropdownMenu>
        <SimpleTooltip content={t("common.actions")}>
          <DropdownMenuTrigger asChild>
            <IconButton
              aria-label={t("common.actions")}
              size="sm"
              variant="ghost"
              onClick={(event) => event.stopPropagation()}
            >
              <MoreHorizontal className="size-4" />
            </IconButton>
          </DropdownMenuTrigger>
        </SimpleTooltip>
        <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
          {actionItem(t("operator.contributions.view"), <Eye className="size-4" />, () => openView(contribution))}
          {management ? (
            <Operator>
              {isPending ? (
                <>
                  {actionItem(t("operator.contributions.validateAndCredit"), <BadgeCheck className="size-4" />, () => openValidate(contribution), { disabled: validate.isPending || isExpired, title: isExpired ? t("operator.contributions.expiredWarning") : undefined })}
                  {actionItem(t("operator.contributions.reject"), <CircleX className="size-4" />, () => openReason("reject", contribution), { danger: true, disabled: reject.isPending })}
                </>
              ) : null}
              {contribution.status === "validated" ? actionItem(t("operator.contributions.refund"), <RotateCcw className="size-4" />, () => openReason("refund", contribution), { danger: true, disabled: refund.isPending }) : null}
            </Operator>
          ) : null}
          {management ? <Admin>{actionItem(t("operator.contributions.delete"), <Trash2 className="size-4" />, () => openDelete(contribution), { danger: true, disabled: remove.isPending })}</Admin> : null}
          {audience === "sponsor" ? null : null}
        </DropdownMenuContent>
      </DropdownMenu>
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
    renderCard: (props) => <ContributionCard {...props} actions={renderActions(props.data)} />,
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
    classNames: { pagination: "hidden lg:flex" },
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
      <OnlySponsor>
        <SponsorContributionWorkspace initialAssignmentId={initialAssignmentId} />
      </OnlySponsor>
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
