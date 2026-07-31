"use client";

import { useMemo } from "react";
import {
  CircleCheck,
  CircleOff,
  Eye,
  Package,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  NButton,
  NPageLayout,
  NTable,
  type NTableProps,
  useDialog,
} from "najm-kit";
import { useSearchParams } from "next/navigation";

import { Operator } from "@/shared/Authorization";
import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import { useKafilRole } from "@/shared/Authorization/useKafilRole";
import { useOrderCart, useOrderCartStore } from "@/features/OrderCart";
import { CategoryFilterSheet } from "@/features/Categories/components/CategoryBar";
import { useProductsWorkspace } from "@/features/Products/hooks/useProductsWorkspace";
import { useProductsTableColumns } from "@/features/Products/hooks/useProductsTableColumns";
import { useProductsTableFilters } from "@/features/Products/hooks/useProductsTableFilters";
import {
  createOffsetPagination,
} from "@/lib/pagination";
import { PageEmptyState, PageErrorState } from "@/shared/PageState";
import PageHeaderGlobalActions from "@/shared/PageHeaderGlobalActions";
import { DashboardPageHeader as NPageHeader } from "@/shared/DashboardShell/DashboardPageHeader";

import { ProductCard, type ProductCardAddInput } from "./ProductCard";
import { ProductDetails } from "./ProductDetails";
import {
  CreateProductDialogContent,
  DeleteProductDialogContent,
  ProductStatusDialogContent,
  UpdateProductDialogContent,
} from "./ProductForms";
import type { ProductRecord } from "../types";

const productsPagination = createOffsetPagination(0, 100);

export function ProductsPage() {
  const dialog = useDialog();
  const { t } = useKafilLanguage();
  const { isExactFamily, isExactAdmin } = useKafilRole();
  const orderCart = useOrderCart();
  const setCartOpen = useOrderCartStore((state) => state.setDialogOpen);
  const columns = useProductsTableColumns();
  const searchParams = useSearchParams();
  const activeCategoryId = searchParams.get("category") ?? "";
  const workspace = useProductsWorkspace(
    productsPagination,
    {
      ...(activeCategoryId ? { categoryId: activeCategoryId } : {}),
    },
  );
  const filters = useProductsTableFilters(workspace.categories);

  const products = useMemo(() => {
    if (!isExactFamily) return (workspace.products ?? []) as ProductRecord[];
    return (workspace.products ?? []) as unknown as ProductRecord[];
  }, [isExactFamily, workspace.products]);
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
    onCreate: openCreate,
    onView: openView,
    onEdit: openEdit,
    renderCard: (props) => (
      <ProductCard
        {...props}
        onAdd={handleAdd}
        onOpenCart={openCart}
        quantityInCart={cartQuantityByProductId.get(props.data.id) ?? 0}
      />
    ),
    renderEmpty: () => (
      <Operator>
        <PageEmptyState
          icon={Package}
          action={
            <NButton onClick={openCreate}>{t("common.createProduct")}</NButton>
          }
          title={t("common.emptyCatalogProduct")}
          description={t("common.emptyCatalogProductHint")}
        />
      </Operator>
    ),
    renderError: (error) => (
      <PageErrorState error={error} onRetry={() => void workspace.refetch()} />
    ),
    menu: {
      row: (product) => {
        const baseActions = [
          { label: t("common.view"), icon: Eye, onSelect: () => openView(product) },
          { label: t("common.edit"), icon: Pencil, onSelect: () => openEdit(product) },
          {
            label: t(product.status === "active" ? "common.deactivate" : "common.activate"),
            icon: product.status === "active" ? CircleOff : CircleCheck,
            danger: product.status === "active",
            separatorBefore: true,
            onSelect: () => openStatus(product),
          },
        ];
        if (workspace.mode !== "management") return baseActions;
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
    defaultPagination: { pageIndex: 0, pageSize: productsPagination.limit },
    showPagination: false,
    responsiveCards: true,
    defaultMode: "cards",
    classNames: {
      cards: "grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3 xl:grid-cols-6 2xl:grid-cols-8",
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
      {isExactFamily ? (
        <ProductsFamilyGrid
          error={workspace.error}
          loading={workspace.loading}
          onAdd={handleAdd}
          onOpenCart={openCart}
          products={products}
          quantityByProductId={cartQuantityByProductId}
          refetch={() => void workspace.refetch()}
        />
      ) : (
        <div className="min-h-0 flex-1">
          <NTable {...tableProps} />
        </div>
      )}
    </NPageLayout>
  );
}

interface ProductsFamilyGridProps {
  loading: boolean;
  error: unknown;
  refetch: () => void;
  products: ProductRecord[];
  quantityByProductId: ReadonlyMap<string, number>;
  onAdd: (input: ProductCardAddInput) => Promise<void> | void;
  onOpenCart: () => void;
}

function ProductsFamilyGrid({
  loading,
  error,
  refetch,
  products,
  quantityByProductId,
  onAdd,
  onOpenCart,
}: Readonly<ProductsFamilyGridProps>) {
  const { t } = useKafilLanguage();
  if (error) {
    return (
      <NPageLayout className="grid min-h-64 place-items-center">
        <PageErrorState error={error} onRetry={refetch} />
      </NPageLayout>
    );
  }
  if (loading && products.length === 0) {
    return (
      <PageEmptyState
        icon={Package}
        title={t("common.loadingProducts")}
        description={t("common.loadingProducts")}
      />
    );
  }
  if (products.length === 0) {
    return (
      <PageEmptyState
        icon={Package}
        title={t("common.emptyProducts")}
        description={t("common.emptyProductsHint")}
      />
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            data={product}
            onAdd={onAdd}
            onOpenCart={onOpenCart}
            quantityInCart={quantityByProductId.get(product.id) ?? 0}
          />
        ))}
      </div>
    </div>
  );
}
