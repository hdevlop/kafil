"use client";

import { useMemo, useState } from "react";
import {
  CircleCheck,
  CircleOff,
  Eye,
  Package,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  NPageHeader,
  NButton,
  NEmptyState,
  NErrorState,
  NPageLayout,
  NTable,
  type NTableProps,
  useDialog,
  createCardPagination,
} from "najm-kit";
import { useSearchParams } from "next/navigation";

import { useTranslation } from "najm-i18n/react";
import { useKafilRole } from "@/shared/Authorization/useKafilRole";
import { useOrderCart, useOrderCartStore } from "@/features/OrderCart";
import { CategoryFilterSheet } from "@/features/Categories/components/CategoryBar";
import { useProductsWorkspace, type ProductsWorkspaceFilters } from "@/features/Products/hooks/useProductsWorkspace";
import { useProductsTableColumns } from "@/features/Products/hooks/useProductsTableColumns";
import { useProductsTableFilters } from "@/features/Products/hooks/useProductsTableFilters";
import {
  createOffsetPagination,
} from "najm-kit/pagination";
import { getPublicApiErrorMessage } from "@/services/apiError";
import PageHeaderGlobalActions from "@/shared/PageHeaderGlobalActions";

import { ProductCard, type ProductCardAddInput } from "./ProductCard";
import { ProductDetails } from "./ProductDetails";
import {
  CreateProductDialogContent,
  DeleteProductDialogContent,
  ProductStatusDialogContent,
  UpdateProductDialogContent,
} from "./ProductForms";
import type { ProductRecord } from "../types";

const productsPagination = createOffsetPagination(0, 25);

export function ProductsPage() {
  const dialog = useDialog();
  const { t } = useTranslation();
  const { isExactAdmin } = useKafilRole();
  const orderCart = useOrderCart();
  const setCartOpen = useOrderCartStore((state) => state.setDialogOpen);
  const columns = useProductsTableColumns();
  const searchParams = useSearchParams();
  const activeCategoryId = searchParams.get("category") ?? "";
  const [listFilters, setListFilters] = useState<ProductsWorkspaceFilters>({});
  // The card grid continues on scroll on every viewport. The table view keeps
  // numbered pages: rows there are unvirtualized, and infinite table scroll is
  // out of scope (see PAGINATION-PLAN.md).
  const [tableView, setTableView] = useState(false);
  const workspace = useProductsWorkspace(
    productsPagination,
    {
      ...listFilters,
      ...(activeCategoryId ? { categoryId: activeCategoryId } : {}),
    },
    tableView ? "paged" : "infinite",
  );
  const filters = useProductsTableFilters(workspace.categories, {
    ...listFilters,
    ...(activeCategoryId ? { categoryId: activeCategoryId } : {}),
  }, setListFilters);

  const products = useMemo(
    () =>
      (workspace.products ?? []).map((product) => ({
        createdAt: "",
        updatedAt: "",
        ...product,
      })) as ProductRecord[],
    [workspace.products],
  );
  const cartQuantityByProductId = useMemo(
    () => new Map(orderCart.items.map((item) => [item.productId, item.quantity])),
    [orderCart.items],
  );
  function openCreate() {
    void dialog.openDialog({
      title: t("common.createProduct"),
      description: t("common.createProductDescription"),
      children: <CreateProductDialogContent />,
      showButtons: false,
      width: "lg",
      height: "auto",
    });
  }

  function openView(product: ProductRecord) {
    void dialog.openDialog({
      title: product.name,
      description: t("common.editProductDescription"),
      children: <ProductDetails product={product} />,
      showButtons: false,
      width: "lg",
      height: "auto",
    });
  }

  function openEdit(product: ProductRecord) {
    void dialog.openDialog({
      title: `${t("common.edit")} ${product.name}`,
      description: t("common.editProductDescription"),
      children: <UpdateProductDialogContent product={product} />,
      showButtons: false,
      width: "lg",
      height: "auto",
    });
  }

  function openStatus(product: ProductRecord) {
    const action = product.status === "active" ? "deactivate" : "activate";
    void dialog.openDialog({
      title: `${t(action === "deactivate" ? "common.deactivate" : "common.activate")} ${product.name}`,
      description: t("common.orderLifecycleAudit"),
      children: <ProductStatusDialogContent action={action} product={product} />,
      showButtons: false,
      size: "sm",
    });
  }

  function openDelete(product: ProductRecord) {
    void dialog.openDialog({
      title: `${t("common.deleteForever")} ${product.name}?`,
      description: t("common.permanentDeleteProductDescription"),
      children: <DeleteProductDialogContent product={product} />,
      showButtons: false,
      size: "sm",
    });
  }

  async function handleAdd(input: ProductCardAddInput) {
    await orderCart.add({
      productId: input.productId,
      productName: input.productName,
      sku: input.sku,
      imageUrl: input.imageUrl,
      quantity: input.quantity,
      estimatedUnitPriceMinor: input.estimatedUnitPriceMinor,
    });
  }

  function openCart() {
    setCartOpen(true);
  }

  const tableProps: NTableProps<ProductRecord> = {
    data: products,
    columns,
    filters,
    loading: workspace.loading,
    error: workspace.error,
    getRowId: (product) => product.id,
    onCreate: workspace.mode === "management" ? openCreate : undefined,
    onView: openView,
    onEdit: workspace.mode === "management" ? openEdit : undefined,
    renderCard: (props) => (
      <ProductCard
        {...props}
        onAdd={handleAdd}
        onOpenCart={openCart}
        quantityInCart={cartQuantityByProductId.get(props.data.id) ?? 0}
      />
    ),
    renderEmpty: () => (
      <NEmptyState
        surface="panel"
        icon={Package}
        action={
          workspace.mode === "management" ? (
            <NButton onClick={openCreate}>{t("common.createProduct")}</NButton>
          ) : undefined
        }
        title={t("common.emptyCatalogProduct")}
        description={t("common.emptyCatalogProductHint")}
      />
    ),
    renderError: (error) => (
      <NErrorState
        message={getPublicApiErrorMessage(error, t("state.retry"))}
        onRetry={() => void workspace.refetch()}
        surface="panel"
      />
    ),
    menu: {
      row: (product) => {
        const viewAction = {
          label: t("common.view"), icon: Eye, onSelect: () => openView(product),
        };
        if (workspace.mode !== "management") return [viewAction];
        const baseActions = [
          viewAction,
          { label: t("common.edit"), icon: Pencil, onSelect: () => openEdit(product) },
          {
            label: t(product.status === "active" ? "common.deactivate" : "common.activate"),
            icon: product.status === "active" ? CircleOff : CircleCheck,
            danger: product.status === "active",
            separatorBefore: true,
            onSelect: () => openStatus(product),
          },
        ];
        if (!isExactAdmin) return baseActions;
        const permanentDelete = {
          label: t("common.deleteForever"),
          icon: Trash2,
          danger: true,
          separatorBefore: true,
          onSelect: () => openDelete(product),
        };
        return [...baseActions, permanentDelete];
      },
    },
    menuButton: true,
    manualPagination: true,
    pageCount: workspace.paginationController.pageCount,
    pagination: workspace.paginationController.pagination,
    onPaginationChange: workspace.paginationController.onPaginationChange,
    cardPagination: createCardPagination(workspace.paginationController, t),
    showPagination: true,
    responsiveCards: true,
    defaultMode: "cards",
    onModeChange: (mode) => setTableView(mode === "table"),
    classNames: {
      cards: "grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 xl:grid-cols-6 2xl:grid-cols-8",
    },
    addButtonText: t("common.createProduct"),
    noDataText: t("common.noCatalogProduct"),
    loadingText: t("common.loadingCatalogProducts"),
    dynamicHeight: true,
  };

  return (
    <NPageLayout className="flex h-full min-h-0 flex-col gap-4">
      <NPageHeader
        icon={Package}
        title={t("nav.products")}
        subtitle={t("nav.productsSubtitle")}
        actions={
          <>
            <CategoryFilterSheet
              basePath="/products"
              paginationController={workspace.categoryPaginationController}
              items={workspace.categories.map((category) => ({
                id: category.id,
                name: category.name,
                image: category.image,
                itemCount: category.itemCount,
                status: category.status,
              }))}
            />
            <PageHeaderGlobalActions />
          </>
        }
      />
      <div className="min-h-0 flex-1">
        <NTable {...tableProps} />
      </div>
    </NPageLayout>
  );
}
