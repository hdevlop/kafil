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

import { Operator } from "@/shared/Authorization";
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
import type { FamilyCatalogCategory } from "@/features/FamilyCatalog/types";

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

  const categories = (workspace.categories ?? []) as CategoryRecord[];
  const familyCategories = (workspace.categories ?? []) as FamilyCatalogCategory[];
  const headerSubtitle = isExactFamily
    ? t("common.categoriesForHousehold")
    : t("common.categoriesManagementSubtitle");

  function openCreate() {
    void dialog.openDialog({
      title: t("common.create") + " " + t("nav.categories").toLowerCase(),
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
      title: `${t("common.edit")} ${category.name}`,
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
      title: `${t(action === "deactivate" ? "common.deactivate" : "common.activate")} ${category.name}`,
      description: t("common.orderLifecycleAudit"),
      children: <CategoryStatusDialogContent action={action} category={category} />,
      showButtons: false,
      size: "sm",
    });
  }

  function openDelete(category: CategoryRecord) {
    void dialog.openDialog({
      title: `${t("common.deleteForever")} ${category.name}?`,
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
    onCreate: openCreate,
    onView: openView,
    onEdit: openEdit,
    renderCard: CategoryCard,
    renderEmpty: () => (
      <Operator>
        <PageEmptyState
          icon={Tags}
          action={
            <NButton onClick={openCreate}>
              {t("common.create") + " " + t("nav.categories").toLowerCase()}
            </NButton>
          }
          title={t("common.emptyCatalogCategory")}
          description={t("common.emptyCatalogCategoryHint")}
        />
      </Operator>
    ),
    renderError: (error) => (
      <PageErrorState error={error} onRetry={() => void workspace.refetch()} />
    ),
    menu: {
      row: (category) => {
        const baseActions = [
          { label: t("common.view"), icon: Eye, onSelect: () => openView(category) },
          { label: t("common.edit"), icon: Pencil, onSelect: () => openEdit(category) },
          {
            label: t(category.status === "active" ? "common.deactivate" : "common.activate"),
            icon: category.status === "active" ? CircleOff : CircleCheck,
            danger: category.status === "active",
            separatorBefore: true,
            onSelect: () => openStatus(category),
          },
        ];
        if (workspace.mode !== "management") return baseActions;
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
      cards: "grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4 xl:grid-cols-6",
    },
    addButtonText: t("common.create") + " " + t("nav.categories").toLowerCase(),
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
      {isExactFamily ? (
        <CategoriesFamilyGrid
          categories={familyCategories}
          loading={workspace.loading}
          error={workspace.error}
          refetch={() => void workspace.refetch()}
          router={router}
          t={t}
        />
      ) : (
        <div className="min-h-0 flex-1">
          <NTable {...tableProps} />
        </div>
      )}
    </NPageLayout>
  );
}

interface CategoriesFamilyGridProps {
  loading: boolean;
  error: unknown;
  refetch: () => void;
  categories: FamilyCatalogCategory[];
  router: ReturnType<typeof useRouter>;
  t: ReturnType<typeof useKafilLanguage>["t"];
}

function CategoriesFamilyGrid({
  loading,
  error,
  refetch,
  categories,
  router,
  t,
}: Readonly<CategoriesFamilyGridProps>) {
  if (error) {
    return (
      <NPageLayout className="grid min-h-64 place-items-center">
        <PageErrorState error={error} onRetry={refetch} />
      </NPageLayout>
    );
  }
  if (loading && categories.length === 0) {
    return (
      <NPageLayout className="grid min-h-64 place-items-center">
        <PageEmptyState
          icon={Tags}
          title={t("common.loadingCategories")}
          description={t("common.loadingCategories")}
        />
      </NPageLayout>
    );
  }
  if (categories.length === 0) {
    return (
      <NPageLayout className="grid min-h-64 place-items-center">
        <PageEmptyState
          icon={Tags}
          title={t("common.emptyCategories")}
          description={t("common.emptyCategoriesHint")}
        />
      </NPageLayout>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {categories.map((category) => (
        <button
          key={category.id}
          className="rounded-2xl text-left transition-transform hover:scale-[1.01]"
          onClick={() =>
            router.push(`/products?category=${encodeURIComponent(category.id)}`)
          }
          type="button"
        >
          <CategoryCard data={category} />
        </button>
      ))}
    </div>
  );
}
