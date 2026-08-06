"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Tags } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { NButton, NSheet, NTable, type NTableProps } from "najm-kit";

import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import { createCardPagination } from "@/lib/tablePagination";
import type { ResolvedListMode } from "@/hooks/useResponsiveOffsetList";

import { CategoryCard } from "./CategoryCard";

export interface CategoryBarItem {
  id: string;
  name: string;
  image?: string | null;
  itemCount?: number;
  status?: string;
}

interface CategoryBarProps {
  items: CategoryBarItem[];
  basePath: string;
  queryParam?: string;
  paginationController: {
    cardViewport: boolean;
    mode?: ResolvedListMode;
    hasNextPage: boolean;
    loadingMore: boolean;
    loadMoreError: unknown;
    onLoadMore: () => Promise<unknown>;
    loading: boolean;
    pageCount: number;
    pagination: { pageIndex: number; pageSize: number };
    onPaginationChange: (next: { pageIndex: number; pageSize: number }) => void;
  };
}

export function CategoryFilterSheet({
  items,
  basePath,
  queryParam = "category",
  paginationController,
}: Readonly<CategoryBarProps>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useKafilLanguage();
  const [open, setOpen] = useState(false);
  const activeId = searchParams.get(queryParam) ?? "";

  const select = useCallback(
    (id: string) => {
      const next = new URLSearchParams(searchParams.toString());
      if (!id) {
        next.delete(queryParam);
      } else {
        next.set(queryParam, id);
      }
      const query = next.toString();
      router.replace(query ? `${basePath}?${query}` : basePath, {
        scroll: false,
      });
      setOpen(false);
    },
    [basePath, queryParam, router, searchParams],
  );

  const filterLabel = t("common.categoryFilterAria", {
    defaultValue: "Category filter",
  });
  const categoriesLabel = t("nav.categories", { defaultValue: "Categories" });
  const columns = useMemo<NTableProps<CategoryBarItem>["columns"]>(
    () => [{ accessorKey: "name", header: categoriesLabel }],
    [categoriesLabel],
  );

  return (
    <>
      <NButton
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={filterLabel}
        className="size-8 gap-0 p-0 sm:w-auto sm:gap-2 sm:px-3"
        onClick={() => setOpen(true)}
        size="sm"
        type="button"
        variant="outline"
      >
        <Tags aria-hidden className="size-4" />
        <span className="hidden sm:inline">{categoriesLabel}</span>
      </NButton>
      <NSheet
        classNames={{ body: "p-4", content: "bg-background" }}
        description={filterLabel}
        icon={Tags}
        onOpenChange={setOpen}
        open={open}
        title={categoriesLabel}
        width={420}
      >
        <div data-testid="category-sheet-options">
          <NTable<CategoryBarItem>
            availableModes={["cards"]}
            classNames={{ cards: "grid grid-cols-3 gap-2" }}
            columns={columns}
            data={items}
            defaultMode="cards"
            dynamicHeight={false}
            getRowClassName={(item) =>
              activeId === item.id
                ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                : undefined
            }
            getRowId={(item) => item.id}
            menuButton={false}
            loading={paginationController.loading}
            manualPagination
            pagination={paginationController.pagination}
            pageCount={paginationController.pageCount}
            onPaginationChange={paginationController.onPaginationChange}
            cardPagination={createCardPagination(paginationController, t)}
            noDataText={t("common.emptyCategories", {
              defaultValue: "No active categories",
            })}
            renderCard={({ data }) => (
              <NButton
                aria-label={data.name}
                aria-pressed={activeId === data.id}
                className="aspect-square h-auto w-full justify-start p-0 text-start"
                onClick={() => select(activeId === data.id ? "" : data.id)}
                type="button"
                variant="ghost"
              >
                <CategoryCard compact data={data} />
              </NButton>
            )}
            responsiveCards
            showAddButton={false}
            showCheckbox={false}
            showColumnVisibility={false}
            showPagination
            showSorting={false}
            showViewToggle={false}
          />
        </div>
      </NSheet>
    </>
  );
}
