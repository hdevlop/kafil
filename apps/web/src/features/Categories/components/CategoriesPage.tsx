"use client";

import { CircleCheck, CircleOff, Eye, Pencil, Tags, Trash2 } from "lucide-react";
import { usePermissions } from "najm-auth/client/react";
import { NButton, NPageLayout, NTable, type NTableProps, useDialog } from "najm-kit";

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
import { useCategories } from "../hooks/useCategories";
import { useCategoriesTableColumns } from "../hooks/useCategoriesTableColumns";
import { useCategoriesTableFilters } from "../hooks/useCategoriesTableFilters";
import type { CategoryRecord } from "../types";

const categoryListPagination = createOffsetPagination(0, 100);

export function CategoriesPage() {
  const dialog = useDialog();
  const { hasRole } = usePermissions();
  const categories = useCategories(categoryListPagination);
  const columns = useCategoriesTableColumns();
  const filters = useCategoriesTableFilters();
  const rows = categories.data ?? [];

  function openCreate() {
    void dialog.openDialog({
      title: "Create category",
      description: "Add an active category to the operator-managed catalog.",
      children: <CreateCategoryDialogContent />,
      showButtons: false,
      width: "lg",
      height: "auto",
    });
  }

  function openView(category: CategoryRecord) {
    void dialog.openDialog({
      title: category.name,
      description: "Operator-managed catalog category details and history.",
      children: <CategoryDetails category={category} />,
      showButtons: false,
      width: "lg",
      height: "auto",
    });
  }

  function openEdit(category: CategoryRecord) {
    void dialog.openDialog({
      title: `Edit ${category.name}`,
      description: "Use a dedicated lifecycle command to change the category status.",
      children: <UpdateCategoryDialogContent category={category} />,
      showButtons: false,
      width: "lg",
      height: "auto",
    });
  }

  function openStatus(category: CategoryRecord) {
    const action = category.status === "active" ? "deactivate" : "activate";
    void dialog.openDialog({
      title: `${action === "deactivate" ? "Deactivate" : "Activate"} ${category.name}`,
      description: "This lifecycle command is audited by the backend.",
      children: <CategoryStatusDialogContent action={action} category={category} />,
      showButtons: false,
      size: "sm",
    });
  }

  function openDelete(category: CategoryRecord) {
    void dialog.openDialog({
      title: `Permanently delete ${category.name}?`,
      description:
        "Bootstrap administrators can permanently delete pristine categories with no order or inventory history.",
      children: <DeleteCategoryDialogContent category={category} />,
      showButtons: false,
      size: "sm",
    });
  }

  const tableProps: NTableProps<CategoryRecord> = {
    data: rows,
    columns,
    filters,
    loading: categories.isPending,
    error: categories.error,
    getRowId: (category) => category.id,
    onCreate: openCreate,
    onView: openView,
    onEdit: openEdit,
    renderCard: CategoryCard,
    renderEmpty: () => <PageEmptyState icon={Tags} action={<NButton onClick={openCreate}>Create category</NButton>} title="No catalog category yet" description="Create the first active category for your product catalog." />,
    renderError: (error) => <PageErrorState error={error} onRetry={() => void categories.refetch()} />,
    menu: {
      row: (category) => {
        const actions = [
          {
            label: "View",
            icon: Eye,
            onSelect: () => openView(category),
          },
          {
            label: "Edit",
            icon: Pencil,
            onSelect: () => openEdit(category),
          },
          {
            label: category.status === "active" ? "Deactivate" : "Activate",
            icon: category.status === "active" ? CircleOff : CircleCheck,
            danger: category.status === "active",
            separatorBefore: true,
            onSelect: () => openStatus(category),
          },
        ];

        if (hasRole("admin")) {
          actions.push({
            label: "Delete permanently",
            icon: Trash2,
            danger: true,
            separatorBefore: true,
            onSelect: () => openDelete(category),
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
      cards: "grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4 xl:grid-cols-6",
    },
    addButtonText: "Create category",
    noDataText: "No catalog category found",
    loadingText: "Loading catalog categories...",
    dynamicHeight: true,
  };

  return (
    <NPageLayout className="flex h-full min-h-0 flex-col gap-4">
      <NPageHeader icon={Tags} title="Categories" subtitle="Manage catalog categories, display order, and audited active-catalog visibility." actions={<PageHeaderGlobalActions />} />
      <div className="min-h-0 flex-1">
        <NTable {...tableProps} />
      </div>
    </NPageLayout>
  );
}
