"use client";

import { useMemo } from "react";
import { createCardPagination, NEmptyState, NErrorState, type NTableProps } from "najm-kit";

import { useKafilLanguage } from "@/i18n/useKafilLanguage";
import { getPublicApiErrorMessage } from "@/services/apiError";

import { FamilyCard } from "../components/FamilyCard";
import { FamiliesPageIcon } from "../components/FamiliesPage/FamiliesPageIcon";
import { buildSponsorFamilyViews } from "../lib/buildSponsorFamilyViews";
import type { SponsorFamilyView } from "../types";
import { useResponsiveSponsorFamilyCatalog } from "./useFamilies";

export function useSponsorFamiliesTableProps(
  onContribute: (family: SponsorFamilyView, assignmentId: string) => void,
): NTableProps<SponsorFamilyView> {
  const { t } = useKafilLanguage();
  const families = useResponsiveSponsorFamilyCatalog();
  const rows = useMemo(
    () => buildSponsorFamilyViews(families.data),
    [families.data],
  );
  const columns = useMemo<NTableProps<SponsorFamilyView>["columns"]>(
    () => [
      {
        accessorKey: "name",
        header: t("operator.families.account"),
      },
      {
        accessorKey: "relationship",
        header: t("sponsor.directory.relationship"),
      },
    ],
    [t],
  );
  const filters = useMemo(
    () => [
      {
        type: "text",
        name: "name",
        placeholder: t("operator.families.searchAccount"),
      },
      {
        type: "select",
        name: "relationship",
        placeholder: t("sponsor.directory.allFamilies"),
        options: [
          {
            value: "supported",
            label: t("sponsor.directory.mySupport"),
          },
          {
            value: "available",
            label: t("sponsor.directory.otherFamilies"),
          },
        ],
      },
    ],
    [t],
  );
  const refetch = () => {
    void families.refetch();
  };

  return {
    data: rows,
    columns,
    filters,
    loading: families.loading,
    error: families.error,
    getRowId: (family) => family.id,
    renderCard: ({ data }) => (
      <FamilyCard data={data} onContribute={onContribute} />
    ),
    renderEmpty: () => (
      <NEmptyState
        surface="panel"
        icon={<FamiliesPageIcon className="size-8" />}
        title={t("sponsor.directory.emptyTitle")}
        description={t("sponsor.directory.emptyDescription")}
      />
    ),
    renderFilteredEmpty: () => (
      <NEmptyState
        surface="panel"
        icon={<FamiliesPageIcon className="size-8" />}
        title={t("sponsor.directory.filteredEmptyTitle")}
        description={t("sponsor.directory.filteredEmptyDescription")}
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
    availableModes: ["cards"],
    defaultMode: "cards",
    showViewToggle: false,
    manualPagination: true,
    pageCount: families.pageCount,
    pagination: families.pagination,
    onPaginationChange: families.onPaginationChange,
    cardPagination: createCardPagination(families, t),
    showPagination: true,
    menuButton: false,
    dynamicHeight: true,
    classNames: {
      cards:
        "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5",
    },
    loadingText: t("sponsor.directory.loading"),
    noDataText: t("sponsor.directory.emptyTitle"),
  };
}
