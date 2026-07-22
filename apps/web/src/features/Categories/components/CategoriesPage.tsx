"use client";

import { useState } from "react";
import { CircleCheck, CircleOff, Eye, Pencil, Tags } from "lucide-react";
import { NButton, NPageLayout, NTable, type NTableProps, useDialog } from "najm-kit";

import { createOffsetPagination, getPageIndex, hasPossibleNextPage } from "@/lib/pagination";
import { PageEmptyState, PageErrorState } from "@/shared/PageState";
import PageHeaderGlobalActions from "@/shared/PageHeaderGlobalActions";
import { DashboardPageHeader as NPageHeader } from "@/shared/DashboardShell/DashboardPageHeader";

import { CategoryCard } from "./CategoryCard";
import { CategoryDetails } from "./CategoryDetails";
import {
  CategoryStatusDialogContent,
  CreateCategoryDialogContent,
  UpdateCategoryDialogContent,
} from "./CategoryForms";
import { useCategories } from "../hooks/useCategories";
import { useCategoriesTableColumns } from "../hooks/useCategoriesTableColumns";
import { useCategoriesTableFilters } from "../hooks/useCategoriesTableFilters";
import type { CategoryRecord } from "../types";

export function CategoriesPage() {
  const dialog = useDialog();
  const [pagination, setPagination] = useState(() => createOffsetPagination(0, 25));
  const categories = useCategories(pagination);
  const columns = useCategoriesTableColumns();
  const filters = useCategoriesTableFilters();
  const rows = categories.data ?? [];
  const pageIndex = getPageIndex(pagination);
  const pageCount = hasPossibleNextPage(rows.length, pagination) ? pageIndex + 2 : pageIndex + 1;

  function openCreate() {
    void dialog.openDialog({
      title: "Create category",
      description: "Add an active category to the operator-managed catalog.",
      children: <CreateCategoryDialogContent />,
      showButtons: false,
      size: "lg",
      height: "auto",
    });
  }

  function openView(category: CategoryRecord) {
    void dialog.openDialog({
      title: category.name,
      description: "Operator-managed catalog category details and history.",
      children: <CategoryDetails category={category} />,
      showButtons: false,
      size: "lg",
      height: "auto",
    });
  }

  function openEdit(category: CategoryRecord) {
    void dialog.openDialog({
      title: `Edit ${category.name}`,
      description: "Use a dedicated lifecycle command to change the category status.",
      children: <UpdateCategoryDialogContent category={category} />,
      showButtons: false,
      size: "lg",
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
    renderEmpty: () => <PageEmptyState action={<NButton onClick={openCreate}>Create category</NButton>} title="No catalog category yet" description="Create the first active category for your product catalog." />,
    renderError: (error) => <PageErrorState error={error} onRetry={() => void categories.refetch()} />,
    menu: {
      row: (category) => [
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
