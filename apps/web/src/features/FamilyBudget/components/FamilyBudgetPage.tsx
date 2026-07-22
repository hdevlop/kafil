"use client";

import { useState } from "react";
import { WalletCards } from "lucide-react";
import { NCard, NPageLayout, NTable, type NTableProps } from "najm-kit";

import { createOffsetPagination, getPageIndex, hasPossibleNextPage } from "@/lib/pagination";
import { PageEmptyState, PageErrorState } from "@/shared/PageState";
import PageHeaderGlobalActions from "@/shared/PageHeaderGlobalActions";
import { FundingProgressCard } from "@/shared/FundingProgressCard";
import { DashboardPageHeader as NPageHeader } from "@/shared/DashboardShell/DashboardPageHeader";

import { FamilyBudgetLedgerCard } from "./FamilyBudgetLedgerCard";
import { FamilyBudgetSummaryCards } from "./FamilyBudgetSummaryCards";
import { useFamilyBudgetLedgerColumns } from "../hooks/useFamilyBudgetLedgerColumns";
import { useFamilyBudgetLedgerFilters } from "../hooks/useFamilyBudgetLedgerFilters";
import { useOwnFamilyBudgetLedger, useOwnFamilyBudgetSummary } from "../hooks/useFamilyBudget";
import type { FamilyBudgetLedgerEntry } from "../types";

export function FamilyBudgetPage() {
  const [pagination, setPagination] = useState(() => createOffsetPagination(0, 25));
  const summary = useOwnFamilyBudgetSummary();
  const ledger = useOwnFamilyBudgetLedger(pagination);
  const columns = useFamilyBudgetLedgerColumns();
  const filters = useFamilyBudgetLedgerFilters();
  const rows = ledger.data ?? [];
  const pageIndex = getPageIndex(pagination);
  const pageCount = hasPossibleNextPage(rows.length, pagination) ? pageIndex + 2 : pageIndex + 1;

  if (summary.isError) {
    return <PageErrorState error={summary.error} title="We could not load your budget" onRetry={() => void summary.refetch()} />;
  }

  const tableProps: NTableProps<FamilyBudgetLedgerEntry> = {
    data: rows,
    columns,
    filters,
    loading: ledger.isPending,
    error: ledger.error,
    getRowId: (entry) => entry.id,
    renderCard: FamilyBudgetLedgerCard,
    renderEmpty: () => <PageEmptyState title="No budget activity yet" description="Validated support and household order activity will appear here." />,
    renderError: (error) => <PageErrorState error={error} title="We could not load your budget ledger" onRetry={() => void ledger.refetch()} />,
    manualPagination: true,
    pagination: { pageIndex, pageSize: pagination.limit },
    pageCount,
    onPaginationChange: ({ pageIndex: nextIndex, pageSize }) => setPagination(createOffsetPagination(nextIndex, pageSize)),
    pageSizeOptions: [10, 25, 50, 100],
    responsiveCards: true,
    defaultMode: "table",
    noDataText: "No budget entry found",
    loadingText: "Loading budget ledger...",
    dynamicHeight: true,
  };

  return (
    <NPageLayout className="flex h-full min-h-0 flex-col gap-4">
      <NPageHeader icon={WalletCards} title="Your budget" subtitle="Review available support and its immutable household activity." actions={<PageHeaderGlobalActions />} />
      {summary.data ? (
        <>
          <FundingProgressCard progress={summary.data.funding} />
          <FamilyBudgetSummaryCards summary={summary.data} />
        </>
      ) : (
        <NCard title="Loading your budget" description="Retrieving your household's protected budget summary." loading />
      )}
      <div className="min-h-0 flex-1">
        <NTable {...tableProps} />
      </div>
    </NPageLayout>
  );
}
