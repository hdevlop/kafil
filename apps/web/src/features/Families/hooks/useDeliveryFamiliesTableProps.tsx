"use client";

import { useMemo, type Dispatch, type SetStateAction } from "react";
import { createCardPagination, NEmptyState, NErrorState, type NTableProps } from "najm-kit";

import { useTranslation } from "najm-i18n/react";
import { getPublicApiErrorMessage } from "@/services/apiError";

import { DeliveryFamilyCard } from "../components/DeliveryFamilyCard";
import { FamiliesPageIcon } from "../components/FamiliesPage/FamiliesPageIcon";
import type { DeliveryFamilyView } from "../types";
import { useResponsiveDeliveryFamilies, type DeliveryFamiliesFilters } from "./useDeliveryFamilies";
import { useDeliveryFamiliesTableColumns } from "./useDeliveryFamiliesTableColumns";
import type { ListDeliveryFamiliesFilters } from "@/services/dashboardApi";

export function useDeliveryFamiliesTableFilters(
  filters: DeliveryFamiliesFilters,
  setFilters: Dispatch<SetStateAction<DeliveryFamiliesFilters>>,
) {
  const { t } = useTranslation();
  return useMemo(
    () => [
      {
        type: "text",
        name: "search",
        placeholder: t("dashboard.delivery.familiesSearch"),
        value: filters.search ?? "",
        onChange: (search: string) => setFilters((current) => ({ ...current, search: search || undefined })),
      },
    ],
    [filters.search, setFilters, t],
  );
}

export function useDeliveryFamiliesTableProps(
  filters: DeliveryFamiliesFilters,
  setFilters: Dispatch<SetStateAction<DeliveryFamiliesFilters>>,
): NTableProps<DeliveryFamilyView> {
  const { t } = useTranslation();
  const families = useResponsiveDeliveryFamilies(filters);
  const columns = useDeliveryFamiliesTableColumns();
  const tableFilters = useDeliveryFamiliesTableFilters(filters, setFilters);
  const rows = families.data;
  const refetch = () => {
    void families.refetch();
  };

  return {
    data: rows,
    columns,
    filters: tableFilters,
    loading: families.loading,
    error: families.error,
    getRowId: (family) => family.familyProfileId,
    renderCard: ({ data }) => <DeliveryFamilyCard data={data} />,
    renderEmpty: () => (
      <NEmptyState
        surface="panel"
        icon={<FamiliesPageIcon className="size-8" />}
        title={t("dashboard.delivery.familiesEmpty")}
        description={t("dashboard.delivery.familiesEmptyHint")}
      />
    ),
    renderFilteredEmpty: () => (
      <NEmptyState
        surface="panel"
        icon={<FamiliesPageIcon className="size-8" />}
        title={t("dashboard.delivery.familiesEmpty")}
        description={t("dashboard.delivery.familiesEmptyHint")}
      />
    ),
    renderError: (error) => (
      <NErrorState
        message={getPublicApiErrorMessage(error, t("state.retry"))}
        onRetry={refetch}
        surface="panel"
      />
    ),
    responsiveCards: true,
    defaultMode: "cards",
    manualPagination: true,
    pageCount: families.pageCount,
    pagination: families.pagination,
    onPaginationChange: families.onPaginationChange,
    cardPagination: createCardPagination(families, t),
    showPagination: true,
    menuButton: false,
    dynamicHeight: true,
    classNames: {
      cards: "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
    },
    noDataText: t("dashboard.delivery.familiesNoData"),
    loadingText: t("dashboard.delivery.familiesLoading"),
  };
}

export type { DeliveryFamiliesFilters, ListDeliveryFamiliesFilters };
