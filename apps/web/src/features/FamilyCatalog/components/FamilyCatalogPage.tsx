"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, PackageSearch, Search } from "lucide-react";
import { NButton, NCard, NPageLayout } from "najm-kit";

import {
  createOffsetPagination,
  getPageIndex,
  hasPossibleNextPage,
} from "@/lib/pagination";
import PageHeaderGlobalActions from "@/shared/PageHeaderGlobalActions";
import { DashboardPageHeader as NPageHeader } from "@/shared/DashboardShell/DashboardPageHeader";
import { PageEmptyState } from "@/shared/PageState";

import { FamilyCatalogProductCard } from "./FamilyCatalogProductCard";
import { useFamilyOrderingCommands } from "@/features/FamilyOrdering/hooks/useFamilyOrdering";
import {
  useFamilyCatalogCategories,
  useFamilyCatalogProducts,
} from "../hooks/useFamilyCatalog";

export function FamilyCatalogPage() {
  const [categoryId, setCategoryId] = useState<string>();
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState(() => createOffsetPagination(0, 12));
  const categories = useFamilyCatalogCategories();
  const cart = useFamilyOrderingCommands();
  const products = useFamilyCatalogProducts({
    ...pagination,
    categoryId,
    search: search.trim() || undefined,
  });
  const rows = products.data ?? [];
  const pageIndex = getPageIndex(pagination);
  const hasNextPage = hasPossibleNextPage(rows.length, pagination);

  function changeCategory(nextCategoryId?: string) {
    setCategoryId(nextCategoryId);
    setPagination(createOffsetPagination(0, pagination.limit));
  }

  function changeSearch(nextSearch: string) {
    setSearch(nextSearch);
    setPagination(createOffsetPagination(0, pagination.limit));
  }

  function changePage(nextPageIndex: number) {
    setPagination(createOffsetPagination(nextPageIndex, pagination.limit));
  }

  return (
    <NPageLayout className="flex h-full min-h-0 flex-col gap-4">
      <NPageHeader
        icon={PackageSearch}
        title="Catalog"
        subtitle="Browse products currently active for your household. Cart controls follow in the next step."
        actions={<PageHeaderGlobalActions />}
      />

      <NCard
        title="Find products"
        description="Search the active catalog or narrow the list to a category."
        loading={categories.isPending}
      >
        <label className="block">
          <span className="mb-2 block text-sm font-medium">Search the catalog</span>
          <span className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              maxLength={100}
              onChange={(event) => changeSearch(event.target.value)}
              placeholder="Search by product name"
              type="search"
              value={search}
            />
          </span>
        </label>

        {categories.isError ? (
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-destructive">
            <span>We could not load catalog categories.</span>
            <NButton size="sm" variant="outline" onClick={() => void categories.refetch()}>
              Try again
            </NButton>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            <NButton
              size="sm"
              variant={categoryId ? "outline" : "default"}
              onClick={() => changeCategory()}
            >
              All products
            </NButton>
            {(categories.data ?? []).map((category) => (
              <NButton
                key={category.id}
                size="sm"
                variant={categoryId === category.id ? "default" : "outline"}
                onClick={() => changeCategory(category.id)}
              >
                {category.name}
              </NButton>
            ))}
          </div>
        )}
      </NCard>

      {products.isPending ? (
        <NCard
          description="Retrieving active products that your household can browse."
          loading
          title="Loading catalog"
        />
      ) : products.isError ? (
        <NCard
          description="Please try again in a moment."
          title="We could not load the catalog"
        >
          <NButton variant="outline" onClick={() => void products.refetch()}>
            Try again
          </NButton>
        </NCard>
      ) : rows.length ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((product) => (
              <FamilyCatalogProductCard adding={cart.add.isPending} key={product.id} product={product} onAdd={(productId) => void cart.add.mutateAsync({ productId, quantity: 1 })} />
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Page {pageIndex + 1}</p>
            <div className="flex gap-2">
              <NButton
                disabled={pageIndex === 0 || products.isFetching}
                size="sm"
                variant="outline"
                onClick={() => changePage(pageIndex - 1)}
              >
                <ChevronLeft className="size-4" />
                Previous
              </NButton>
              <NButton
                disabled={!hasNextPage || products.isFetching}
                size="sm"
                variant="outline"
                onClick={() => changePage(pageIndex + 1)}
              >
                Next
                <ChevronRight className="size-4" />
              </NButton>
            </div>
          </div>
        </>
      ) : (
        <PageEmptyState
          description="Try a different search or category. Operators can publish catalog products when they are ready."
          title="No active products match your search"
        />
      )}
    </NPageLayout>
  );
}
