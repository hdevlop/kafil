"use client";

import { CircleCheck, CircleOff, Eye, Pencil, Tags, Trash2 } from "lucide-react";
import {
  NButton,
  NPageLayout,
  NTable,
  type NTableProps,
  useDialog,
} from "najm-kit";
import { useRouter } from "next/navigation";

import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import { useKafilRole } from "@/shared/Authorization/useKafilRole";
import { useCategoryCommands } from "@/features/Categories/hooks/useCategories";
import { useCategoriesWorkspace } from "@/features/Categories/hooks/useCategoriesWorkspace";
import { useCategoriesTableColumns } from "@/features/Categories/hooks/useCategoriesTableColumns";
import { useCategoriesTableFilters } from "@/features/Categories/hooks/useCategoriesTableFilters";
import { createOffsetPagination } from "@/lib/pagination";
import { PageEmptyState, PageErrorState } from "@/shared/PageState";
import PageHeaderGlobalActions from "@/shared/PageHeaderGlobalActions";
import { DashboardPageHeader as NPageHeader } from "@/shared/DashboardShell/DashboardPageHeader";

import { CategoryCard } from "./CategoryCard";
import { CategoryDetails } from "./CategoryDetails";
import {
  CategoryStatusDialogContent,
  CreateCategoryDialogContent,
  DeleteCategoryDialogContent,
  UpdateCategoryDialogContent,
} from "./CategoryForms";
import type { CategoryRecord } from "../types";

const pagination = createOffsetPagination(0, 100);

export function CategoriesPage() {
  const dialog = useDialog();
  const router = useRouter();
  const { t } = useKafilLanguage();
  const { isExactFamily, isExactAdmin } = useKafilRole();
  const columns = useCategoriesTableColumns();
  const filters = useCategoriesTableFilters();
  useCategoryCommands();
  const workspace = useCategoriesWorkspace(
    isExactFamily ? createOffsetPagination(0, 100) : pagination,
  );

  const categories = (workspace.categories ?? []).map((category) => ({
    ...category,
    image: category.image ?? null,
    sortOrder: "sortOrder" in category ? category.sortOrder : 0,
    createdAt: "createdAt" in category ? category.createdAt : "",
    updatedAt: "updatedAt" in category ? category.updatedAt : "",
    status: category.status ?? "active",
  })) as CategoryRecord[];
  const headerSubtitle = isExactFamily
    ? t("common.categoriesForHousehold")
    : t("common.categoriesManagementSubtitle");

  function openCreate() {
    void dialog.openDialog({
      title: t("common.createCategory"),
      description: t("common.createCategoryDescription"),
      children: <CreateCategoryDialogContent />,
      showButtons: false,
      width: "lg",
      height: "auto",
    });
  }

  function openView(category: CategoryRecord) {
    void dialog.openDialog({
      title: category.name,
      description: t("common.editCategoryDescription"),
      children: <CategoryDetails category={category} />,
      showButtons: false,
      width: "lg",
      height: "auto",
    });
  }

  function openEdit(category: CategoryRecord) {
    void dialog.openDialog({
      title: t("operator.categories.editTitle", { name: category.name }),
      description: t("common.editCategoryDescription"),
      children: <UpdateCategoryDialogContent category={category} />,
      showButtons: false,
      width: "lg",
      height: "auto",
    });
  }

  function openStatus(category: CategoryRecord) {
    const action = category.status === "active" ? "deactivate" : "activate";
    void dialog.openDialog({
      title: t(
        action === "deactivate"
          ? "operator.categories.deactivateTitle"
          : "operator.categories.activateTitle",
        { name: category.name },
      ),
      description: t("common.orderLifecycleAudit"),
      children: <CategoryStatusDialogContent action={action} category={category} />,
      showButtons: false,
      size: "sm",
    });
  }

  function openDelete(category: CategoryRecord) {
    void dialog.openDialog({
      title: t("operator.categories.deleteTitle", { name: category.name }),
      description: t("common.permanentDeleteCategoryDescription"),
      children: <DeleteCategoryDialogContent category={category} />,
      showButtons: false,
      size: "sm",
    });
  }

  const tableProps: NTableProps<CategoryRecord> = {
    data: categories,
    columns,
    filters,
    loading: workspace.loading,
    error: workspace.error,
    getRowId: (category) => category.id,
    onCreate: workspace.mode === "management" ? openCreate : undefined,
    onView: openView,
    onEdit: workspace.mode === "management" ? openEdit : undefined,
    onRowClick: (category) => {
      router.push(`/products?category=${encodeURIComponent(category.id)}`);
    },
    renderCard: CategoryCard,
    renderEmpty: () => (
      <PageEmptyState
        icon={Tags}
        action={
          workspace.mode === "management" ? (
            <NButton onClick={openCreate}>
              {t("common.createCategory")}
            </NButton>
          ) : undefined
        }
        title={t("common.emptyCatalogCategory")}
        description={t("common.emptyCatalogCategoryHint")}
      />
    ),
    renderError: (error) => (
      <PageErrorState error={error} onRetry={() => void workspace.refetch()} />
    ),
    menu: {
      row: (category) => {
        const viewAction = {
          label: t("common.view"), icon: Eye, onSelect: () => openView(category),
        };
        if (workspace.mode !== "management") return [viewAction];
        const baseActions = [
          viewAction,
          { label: t("common.edit"), icon: Pencil, onSelect: () => openEdit(category) },
          {
            label: t(category.status === "active" ? "common.deactivate" : "common.activate"),
            icon: category.status === "active" ? CircleOff : CircleCheck,
            danger: category.status === "active",
            separatorBefore: true,
            onSelect: () => openStatus(category),
          },
        ];
        if (!isExactAdmin) return baseActions;
        const permanentDelete = {
          label: t("common.deleteForever"),
          icon: Trash2,
          danger: true,
          separatorBefore: true,
          onSelect: () => openDelete(category),
        };
        return [...baseActions, permanentDelete];
      },
    },
    menuButton: true,
    showPagination: false,
    responsiveCards: true,
    defaultMode: "cards",
    classNames: {
      cards: "grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6",
    },
    addButtonText: t("common.createCategory"),
    noDataText: t("common.noCatalogCategory"),
    loadingText: t("common.loadingCatalogCategories"),
    dynamicHeight: true,
  };

  return (
    <NPageLayout className="flex h-full min-h-0 flex-col gap-4">
      <NPageHeader
        icon={Tags}
        title={t("nav.categories")}
        subtitle={headerSubtitle}
        actions={<PageHeaderGlobalActions />}
      />
      <div className="min-h-0 flex-1">
        <NTable {...tableProps} />
      </div>
    </NPageLayout>
  );
}
