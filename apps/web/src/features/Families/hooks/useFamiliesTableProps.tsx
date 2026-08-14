"use client";

import { useState } from "react";
import {
  Eye,
  Pencil,
  Trash2,
  UserRoundCheck,
  UserRoundX,
} from "lucide-react";
import { createCardPagination, type ContextMenuItem, NButton, NEmptyState, NErrorState, type NTableProps } from "najm-kit";

import { useKafilLanguage } from "@/i18n/useKafilLanguage";
import { getPublicApiErrorMessage } from "@/services/apiError";
import { Operator, useKafilRole } from "@/shared/Authorization";

import { FamiliesPageIcon } from "../components/FamiliesPage/FamiliesPageIcon";
import { FamilyCard } from "../components/FamilyCard";
import type { FamilyRecord } from "../types";
import { useResponsiveFamilies } from "./useFamilies";
import { useFamiliesPageDialogs } from "./useFamiliesPageDialogs";
import { useFamiliesTableColumns } from "./useFamiliesTableColumns";
import { useFamiliesTableFilters } from "./useFamiliesTableFilters";
import type { ListFamiliesFilters } from "@/services/familyApi";

export function useFamiliesTableProps() {
  const { t } = useKafilLanguage();
  const { isExactAdmin } = useKafilRole();
  const [listFilters, setListFilters] = useState<ListFamiliesFilters>({});
  const operatorFamilies = useResponsiveFamilies(listFilters);
  const columns = useFamiliesTableColumns();
  const filters = useFamiliesTableFilters(listFilters, setListFilters);
  const rows: FamilyRecord[] = operatorFamilies.data;
  const loading = operatorFamilies.loading;
  const error = operatorFamilies.error;
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});

  const {
    openCreate,
    openView,
    openEdit,
    openStatus,
    openDelete,
    openBulkDelete,
  } = useFamiliesPageDialogs();

  const refetch = () => {
    void operatorFamilies.refetch();
  };

  const tableProps: NTableProps<FamilyRecord> = {
    data: rows,
    columns,
    filters,
    loading,
    error,
    getRowId: (family) => family.id,
    onCreate: openCreate,
    onView: openView,
    onEdit: openEdit,
    onRowClick: openView,
    renderCard: FamilyCard,
    renderEmpty: () => (
      <NEmptyState
        surface="panel"
        className="flex flex-col items-center justify-center gap-3"
        action={
          <Operator>
            <NButton onClick={openCreate}>
              {t("operator.families.create")}
            </NButton>
          </Operator>
        }
        icon={<FamiliesPageIcon className="size-12" />}
        title={t("operator.families.emptyTitle")}
        description={t("operator.families.emptyDescription")}
      />
    ),
    renderError: (error) => (
      <NErrorState
        message={getPublicApiErrorMessage(error, t("state.retry"))}
        onRetry={refetch}
        surface="panel"
      />
    ),
    menu: {
      row: (family) => {
        const isActive = family.status === "active";
        const result: ContextMenuItem[] = [
          {
            label: t("operator.families.view"),
            icon: Eye,
            onSelect: () => openView(family),
          },
        ];

        result.push({
          label: t("operator.families.edit"),
          icon: Pencil,
          onSelect: () => openEdit(family),
        });
        result.push({
          label: t(
            isActive
              ? "operator.families.deactivate"
              : "operator.families.reactivate",
          ),
          icon: isActive ? UserRoundX : UserRoundCheck,
          danger: isActive,
          separatorBefore: true,
          onSelect: () => openStatus(family),
        });

        if (isExactAdmin) {
          result.push({
            label: t("operator.families.delete"),
            icon: Trash2,
            danger: true,
            separatorBefore: true,
            onSelect: () => openDelete(family),
          });
        }

        return result;
      },
    },
    menuButton: true,
    showCheckbox: isExactAdmin,
    rowSelection,
    onRowSelectionChange: setRowSelection,
    onBulkDelete: isExactAdmin
      ? (ids) => openBulkDelete(ids, () => setRowSelection({}))
      : undefined,
    manualPagination: true,
    pageCount: operatorFamilies.pageCount,
    pagination: operatorFamilies.pagination,
    onPaginationChange: operatorFamilies.onPaginationChange,
    cardPagination: createCardPagination(operatorFamilies, t),
    showPagination: true,
    responsiveCards: true,
    defaultMode: "cards",
    classNames: {
      header: "relative z-20",
      cards:
        "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5",
    },
    addButtonText: t("operator.families.create"),
    noDataText: t("operator.families.noData"),
    loadingText: t("operator.families.loading"),
    dynamicHeight: true,
  };

  return tableProps;
}
