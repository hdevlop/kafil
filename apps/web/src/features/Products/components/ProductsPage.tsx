"use client";

import { CircleCheck, CircleOff, Eye, Package, Pencil, Trash2 } from "lucide-react";
import { usePermissions } from "najm-auth/client/react";
import { NButton, NPageLayout, NTable, type NTableProps, useDialog } from "najm-kit";

import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import { createOffsetPagination } from "@/lib/pagination";
import { PageEmptyState, PageErrorState } from "@/shared/PageState";
import PageHeaderGlobalActions from "@/shared/PageHeaderGlobalActions";
import { DashboardPageHeader as NPageHeader } from "@/shared/DashboardShell/DashboardPageHeader";

import { ProductCard } from "./ProductCard";
import { ProductDetails } from "./ProductDetails";
import {
  CreateProductDialogContent,
  DeleteProductDialogContent,
  ProductStatusDialogContent,
  UpdateProductDialogContent,
} from "./ProductForms";
import { useProducts } from "../hooks/useProducts";
import { useProductsTableColumns } from "../hooks/useProductsTableColumns";
import { useProductsTableFilters } from "../hooks/useProductsTableFilters";
import type { ProductRecord } from "../types";

const productListPagination = createOffsetPagination(0, 100);

export function ProductsPage() {
  const dialog = useDialog();
  const { hasRole } = usePermissions();
  const { t } = useKafilLanguage();
  const products = useProducts(productListPagination);
  const columns = useProductsTableColumns();
  const filters = useProductsTableFilters();
  const rows = products.data ?? [];

  function openCreate() {
    void dialog.openDialog({
      title: "Create product",
      description: "Add an active product the family can request.",
      children: <CreateProductDialogContent />,
      showButtons: false,
      width: "lg",
      height: "auto",
    });
  }

  function openView(product: ProductRecord) {
    void dialog.openDialog({
      title: product.name,
      description: "Operator-managed product details, catalog placement, and lifecycle.",
      children: <ProductDetails product={product} />,
      showButtons: false,
      width: "lg",
      height: "auto",
    });
  }

  function openEdit(product: ProductRecord) {
    void dialog.openDialog({
      title: `Edit ${product.name}`,
      description: "Price and catalog details are editable; product status remains command-specific.",
      children: <UpdateProductDialogContent product={product} />,
      showButtons: false,
      width: "lg",
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

  function openDelete(product: ProductRecord) {
    void dialog.openDialog({
      title: `Permanently delete ${product.name}?`,
      description:
        "Bootstrap administrators can permanently delete pristine products with no order or inventory history.",
      children: <DeleteProductDialogContent product={product} />,
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
    renderEmpty: () => <PageEmptyState icon={Package} action={<NButton onClick={openCreate}>Create product</NButton>} title="No catalog product yet" description="Create the first product after adding an active category." />,
    renderError: (error) => <PageErrorState error={error} onRetry={() => void products.refetch()} />,
    menu: {
      row: (product) => {
        const actions = [
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
        ];

        if (hasRole("admin")) {
          actions.push({
            label: "Delete permanently",
            icon: Trash2,
            danger: true,
            separatorBefore: true,
            onSelect: () => openDelete(product),
          });
        }

        return actions;
      },
    },
    menuButton: true,
    showPagination: false,
    responsiveCards: true,
    defaultMode: "cards",
    classNames: {
      cards: "grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3 xl:grid-cols-5",
    },
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
