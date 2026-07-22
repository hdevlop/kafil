"use client";

import { useState } from "react";
import { Boxes, PackagePlus, SlidersHorizontal } from "lucide-react";
import {
  Combobox,
  NButton,
  NCard,
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
import { PageEmptyState, PageErrorState } from "@/shared/PageState";
import PageHeaderGlobalActions from "@/shared/PageHeaderGlobalActions";
import { DashboardPageHeader as NPageHeader } from "@/shared/DashboardShell/DashboardPageHeader";

import { InventoryAdjustmentDialogContent, InventoryRestockDialogContent } from "./InventoryForms";
import { InventoryLedgerCard } from "./InventoryLedgerCard";
import { InventorySummaryCards } from "./InventorySummaryCards";
import {
  useInventoryBalance,
  useInventoryLedger,
  useInventoryProducts,
} from "../hooks/useInventory";
import { useInventoryLedgerTableColumns } from "../hooks/useInventoryLedgerTableColumns";
import { useInventoryLedgerTableFilters } from "../hooks/useInventoryLedgerTableFilters";
import type { InventoryLedgerEntry } from "../types";

export function InventoryPage() {
  const dialog = useDialog();
  const [productId, setProductId] = useState("");
  const [pagination, setPagination] = useState(() => createOffsetPagination(0, 25));
  const products = useInventoryProducts();
  const balance = useInventoryBalance(productId);
  const ledger = useInventoryLedger(productId, pagination);
  const columns = useInventoryLedgerTableColumns();
  const filters = useInventoryLedgerTableFilters();
  const selectedProduct = products.data?.find((product) => product.id === productId);
  const productOptions = products.data?.map((product) => ({
    value: product.id,
    label: `${product.name} — ${product.sku} (${product.categoryName})`,
  })) ?? [];
  const ledgerRows = ledger.data ?? [];
  const pageIndex = getPageIndex(pagination);
  const pageCount = hasPossibleNextPage(ledgerRows.length, pagination)
    ? pageIndex + 2
    : pageIndex + 1;

  function chooseProduct(nextProductId: string) {
    setProductId(nextProductId);
    setPagination(createOffsetPagination(0, 25));
  }

  function openRestock() {
    if (!productId) return;

    void dialog.openDialog({
      title: "Record stock receipt",
      description: "Add received physical stock to the selected product.",
      children: <InventoryRestockDialogContent productId={productId} />,
      showButtons: false,
      size: "md",
      height: "xl",
    });
  }

  function openAdjustment() {
    if (!productId) return;

    void dialog.openDialog({
      title: "Manual stock adjustment",
      description: "Apply an audited correction to the selected product.",
      children: <InventoryAdjustmentDialogContent productId={productId} />,
      showButtons: false,
      size: "md",
      height: "xl",
    });
  }

  const tableProps: NTableProps<InventoryLedgerEntry> = {
    data: ledgerRows,
    columns,
    filters,
    loading: ledger.isPending,
    error: ledger.error,
    getRowId: (entry) => entry.id,
    renderCard: InventoryLedgerCard,
    renderEmpty: () => <PageEmptyState title="No inventory ledger entry yet" description="Stock receipts, adjustments, and order reservations appear here." />,
    renderError: (error) => <PageErrorState error={error} onRetry={() => void ledger.refetch()} />,
    manualPagination: true,
    pagination: { pageIndex, pageSize: pagination.limit },
    pageCount,
    onPaginationChange: ({ pageIndex: nextIndex, pageSize }) => setPagination(createOffsetPagination(nextIndex, pageSize)),
    pageSizeOptions: [10, 25, 50, 100],
    responsiveCards: true,
    defaultMode: "table",
    noDataText: "No inventory ledger entry found",
    loadingText: "Loading inventory ledger...",
    dynamicHeight: true,
  };

  if (products.isError) {
    return <PageErrorState error={products.error} title="We could not load products" onRetry={() => void products.refetch()} />;
  }

  return (
    <NPageLayout className="flex h-full min-h-0 flex-col gap-4">
      <NPageHeader
        icon={Boxes}
        title="Inventory"
        subtitle="Review stock balances, reservations, and the immutable product inventory ledger."
        actions={
          <div className="flex flex-wrap gap-2">
            <PageHeaderGlobalActions />
            <NButton disabled={!balance.data} variant="outline" onClick={openRestock}>
              <PackagePlus className="size-4" />
              Record stock receipt
            </NButton>
            <NButton disabled={!balance.data} variant="destructive" onClick={openAdjustment}>
              <SlidersHorizontal className="size-4" />
              Manual adjustment
            </NButton>
          </div>
        }
      />

      <NCard icon={Boxes} title="Catalog product" description="Inventory information is shown only after selecting an operator-visible product." loading={products.isPending}>
        <Combobox options={productOptions} value={productId} onChange={chooseProduct} placeholder="Choose a product" emptyText="No product found" disabled={products.isPending} />
        {selectedProduct ? (
          <p className="mt-3 text-sm text-muted-foreground">
            {selectedProduct.categoryName} · {selectedProduct.sku} · {selectedProduct.status}
          </p>
        ) : null}
      </NCard>

      {!productId ? (
        <PageEmptyState title="Choose a product inventory" description="Select an operator-visible product to review its balance and ledger." />
      ) : balance.isError ? (
        <PageErrorState error={balance.error} title="We could not load this inventory balance" onRetry={() => void balance.refetch()} />
      ) : balance.data ? (
        <>
          <InventorySummaryCards balance={balance.data} />
          <div className="min-h-0 flex-1">
            <NTable {...tableProps} />
          </div>
        </>
      ) : (
        <PageEmptyState title="Loading product inventory" description="The selected product&apos;s balance and ledger are being retrieved." />
      )}
    </NPageLayout>
  );
}
