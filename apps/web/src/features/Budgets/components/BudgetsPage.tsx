"use client";

import { useState } from "react";
import { Landmark, PencilLine, SlidersHorizontal } from "lucide-react";
import {
  Combobox,
  NButton,
  NPageHeaderFilters,
  NPageLayout,
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
import { DashboardPageHeader as NPageHeader } from "@/shared/DashboardShell/DashboardPageHeader";

import { RecordContributionDialogContent } from "@/features/Contributions/components/RecordContributionForm";
import { BudgetLedgerCard } from "./BudgetLedgerCard";
import {
  ManualBudgetAdjustmentDialogContent,
  MonthlyBudgetLimitDialogContent,
} from "./BudgetForms";
import { BudgetSummaryCards } from "./BudgetSummaryCards";
import {
  useBudgetFamilies,
  useBudgetLedger,
  useBudgetSummary,
} from "../hooks/useBudgets";
import { useBudgetLedgerTableColumns } from "../hooks/useBudgetLedgerTableColumns";
import { useBudgetLedgerTableFilters } from "../hooks/useBudgetLedgerTableFilters";
import type { BudgetLedgerEntry } from "../types";

export function BudgetsPage() {
  const { t } = useKafilLanguage();
  const dialog = useDialog();
  const [familyProfileId, setFamilyProfileId] = useState("");
  const [pagination, setPagination] = useState(() =>
    createOffsetPagination(0, 25),
  );
  const families = useBudgetFamilies();
  const summary = useBudgetSummary(familyProfileId);
  const ledger = useBudgetLedger(familyProfileId, pagination);
  const columns = useBudgetLedgerTableColumns();
  const filters = useBudgetLedgerTableFilters();
  const familyOptions =
    families.data?.map((family) => ({
      value: family.id,
      label: `${family.guardianLegalName} — ${family.exactAddress}`,
    })) ?? [];
  const ledgerRows = ledger.data ?? [];
  const pageIndex = getPageIndex(pagination);
  const pageCount = hasPossibleNextPage(ledgerRows.length, pagination)
    ? pageIndex + 2
    : pageIndex + 1;

  function chooseFamily(nextFamilyProfileId: string) {
    setFamilyProfileId(nextFamilyProfileId);
    setPagination(createOffsetPagination(0, 25));
  }

  function renderFamilyFilter(className: string) {
    return (
      <Combobox
        className={className}
        options={familyOptions}
        value={familyProfileId}
        onChange={chooseFamily}
        placeholder={t("operator.budgets.filterPrivateFamily")}
        emptyText={t("operator.budgets.noFamily")}
        disabled={families.isPending}
      />
    );
  }

  function openMonthlyLimit() {
    if (!summary.data) return;

    void dialog.openDialog({
      title: t("operator.budgets.setMonthlyLimitTitle"),
      description: t("operator.budgets.setMonthlyLimitDescription"),
      children: (
        <MonthlyBudgetLimitDialogContent
          familyProfileId={familyProfileId}
          summary={summary.data}
        />
      ),
      showButtons: false,
      size: "md",
      height: "xl",
    });
  }

  function openAdjustment() {
    void dialog.openDialog({
      title: t("operator.budgets.manualAdjustmentTitle"),
      description: t("operator.budgets.manualAdjustmentDescription"),
      children: (
        <ManualBudgetAdjustmentDialogContent
          familyProfileId={familyProfileId}
        />
      ),
      showButtons: false,
      size: "md",
      height: "xl",
    });
  }

  function openRecord() {
    void dialog.openDialog({
      title: t("operator.contributions.recordTitle"),
      description: t("operator.contributions.recordDescription"),
      children: (
        <RecordContributionDialogContent familyProfileId={familyProfileId} />
      ),
      showButtons: false,
      size: "lg",
      height: "auto",
    });
  }

  const tableProps: NTableProps<BudgetLedgerEntry> = {
    data: ledgerRows,
    columns,
    filters,
    loading: ledger.isPending,
    error: ledger.error,
    getRowId: (entry) => entry.id,
    renderCard: BudgetLedgerCard,
    renderEmpty: () => (
      <PageEmptyState
        title={t("operator.budgets.ledgerEmptyTitle")}
        description={t("operator.budgets.ledgerEmptyDescription")}
      />
    ),
    renderError: (error) => (
      <PageErrorState error={error} onRetry={() => void ledger.refetch()} />
    ),
    manualPagination: true,
    pagination: { pageIndex, pageSize: pagination.limit },
    pageCount,
    onPaginationChange: ({ pageIndex: nextIndex, pageSize }) =>
      setPagination(createOffsetPagination(nextIndex, pageSize)),
    pageSizeOptions: [10, 25, 50, 100],
    responsiveCards: true,
    defaultMode: "table",
    noDataText: t("operator.budgets.noData"),
    loadingText: t("operator.budgets.loading"),
    addButtonText: t("operator.contributions.record"),
    onCreate: openRecord,
    dynamicHeight: true,
  };

  if (families.isError) {
    return (
      <PageErrorState
        error={families.error}
        title={t("operator.budgets.loadError")}
        onRetry={() => void families.refetch()}
      />
    );
  }

  return (
    <NPageLayout className="flex h-full min-h-0 flex-col gap-4">
      <NPageHeader
        icon={Landmark}
        title={t("operator.budgets.title")}
        subtitle={t("operator.budgets.subtitle")}
        headerClassName="relative"
        actions={
          <>
            <div className="absolute left-1/2 top-1/2 hidden w-[30rem] -translate-x-1/2 -translate-y-1/2 2xl:block">
              {renderFamilyFilter("w-full")}
            </div>
            <div className="flex flex-wrap gap-2">
              <NButton
                disabled={!summary.data}
                variant="outline"
                onClick={openMonthlyLimit}
              >
                <PencilLine className="size-4" />
                {t("operator.budgets.setMonthlyLimit")}
              </NButton>
              <NButton
                disabled={!summary.data}
                variant="destructive"
                onClick={openAdjustment}
              >
                <SlidersHorizontal className="size-4" />
                {t("operator.budgets.manualAdjustment")}
              </NButton>
            </div>
          </>
        }
      >
        <NPageHeaderFilters className="2xl:hidden">
          {renderFamilyFilter("w-full max-w-2xl")}
        </NPageHeaderFilters>
      </NPageHeader>

      {!familyProfileId ? (
        <PageEmptyState
          title={t("operator.budgets.emptyTitle")}
          description={t("operator.budgets.emptyDescription")}
        />
      ) : summary.isError ? (
        <PageErrorState
          error={summary.error}
          title={t("operator.budgets.summaryError")}
          onRetry={() => void summary.refetch()}
        />
      ) : summary.data ? (
        <>
          <BudgetSummaryCards summary={summary.data} />
          <div className="min-h-0 flex-1">
            <NTable {...tableProps} />
          </div>
        </>
      ) : (
        <PageEmptyState
          title={t("operator.budgets.loadingTitle")}
          description={t("operator.budgets.loadingDescription")}
        />
      )}
    </NPageLayout>
  );
}
