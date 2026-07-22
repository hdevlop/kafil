"use client";

import { useState } from "react";
import { CircleCheck, CircleOff, Eye, Package, Pencil } from "lucide-react";
import { NButton, NPageLayout, NTable, type NTableProps, useDialog } from "najm-kit";

import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import { createOffsetPagination, getPageIndex, hasPossibleNextPage } from "@/lib/pagination";
import { PageEmptyState, PageErrorState } from "@/shared/PageState";
import PageHeaderGlobalActions from "@/shared/PageHeaderGlobalActions";
import { DashboardPageHeader as NPageHeader } from "@/shared/DashboardShell/DashboardPageHeader";

import { ProductCard } from "./ProductCard";
import { ProductDetails } from "./ProductDetails";
import {
  CreateProductDialogContent,
  ProductStatusDialogContent,
  UpdateProductDialogContent,
} from "./ProductForms";
import { useProducts } from "../hooks/useProducts";
import { useProductsTableColumns } from "../hooks/useProductsTableColumns";
import { useProductsTableFilters } from "../hooks/useProductsTableFilters";
import type { ProductRecord } from "../types";

export function ProductsPage() {
  const dialog = useDialog();
  const { t } = useKafilLanguage();
  const [pagination, setPagination] = useState(() => createOffsetPagination(0, 25));
  const products = useProducts(pagination);
  const columns = useProductsTableColumns();
  const filters = useProductsTableFilters();
  const rows = products.data ?? [];
  const pageIndex = getPageIndex(pagination);
  const pageCount = hasPossibleNextPage(rows.length, pagination) ? pageIndex + 2 : pageIndex + 1;

  function openCreate() {
    void dialog.openDialog({
      title: "Create product",
      description: "Add an active product and initialize its inventory balance.",
      children: <CreateProductDialogContent />,
      showButtons: false,
      size: "xl",
      height: "auto",
    });
  }

  function openView(product: ProductRecord) {
    void dialog.openDialog({
      title: product.name,
      description: "Operator-managed product details, catalog placement, and lifecycle.",
      children: <ProductDetails product={product} />,
      showButtons: false,
      size: "lg",
      height: "auto",
    });
  }

  function openEdit(product: ProductRecord) {
    void dialog.openDialog({
      title: `Edit ${product.name}`,
      description: "Price and catalog details are editable; product status remains command-specific.",
      children: <UpdateProductDialogContent product={product} />,
      showButtons: false,
      size: "xl",
      height: "auto",
    });
  }

  function openStatus(product: ProductRecord) {
    const action = product.status === "active" ? "deactivate" : "activate";
    void dialog.openDialog({
      title: `${action === "deactivate" ? "Deactivate" : "Activate"} ${product.name}`,
      description: "This lifecycle command is audited by the backend.",
      children: <ProductStatusDialogContent action={action} product={product} />,
      showButtons: false,
      size: "sm",
    });
  }

  const tableProps: NTableProps<ProductRecord> = {
    data: rows,
    columns,
    filters,
    loading: products.isPending,
    error: products.error,
    getRowId: (product) => product.id,
    onCreate: openCreate,
    onView: openView,
    onEdit: openEdit,
    renderCard: ProductCard,
    renderEmpty: () => <PageEmptyState action={<NButton onClick={openCreate}>Create product</NButton>} title="No catalog product yet" description="Create the first product after adding an active category." />,
    renderError: (error) => <PageErrorState error={error} onRetry={() => void products.refetch()} />,
    menu: {
      row: (product) => [
        {
          label: "View",
          icon: Eye,
          onSelect: () => openView(product),
        },
        {
          label: "Edit",
          icon: Pencil,
          onSelect: () => openEdit(product),
        },
        {
          label: product.status === "active" ? "Deactivate" : "Activate",
          icon: product.status === "active" ? CircleOff : CircleCheck,
          danger: product.status === "active",
          separatorBefore: true,
          onSelect: () => openStatus(product),
        },
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
    addButtonText: "Create product",
    noDataText: "No catalog product found",
    loadingText: "Loading catalog products...",
    dynamicHeight: true,
  };

  return (
    <NPageLayout className="flex h-full min-h-0 flex-col gap-4">
      <NPageHeader icon={Package} title={t("nav.products")} subtitle={t("nav.productsSubtitle")} actions={<PageHeaderGlobalActions />} />
      <div className="min-h-0 flex-1">
        <NTable {...tableProps} />
      </div>
    </NPageLayout>
  );
}
