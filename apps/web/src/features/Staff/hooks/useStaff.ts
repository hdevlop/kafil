"use client";

import { useEntityCommand } from "@/hooks/useEntityCommand";
import { useEntityQuery } from "@/hooks/useEntityQuery";
import { useResponsiveOffsetList } from "@/hooks/useResponsiveOffsetList";
import { useKafilLanguage } from "@/i18n/useKafilLanguage";
import type { OffsetPagination } from "@/lib/pagination";
import {
  bulkDeleteStaff,
  createStaff,
  deactivateStaff,
  deleteStaff,
  listStaff,
  provisionStaffOperatorAccess,
  reactivateStaff,
  updateStaff,
} from "@/services/staffApi";

import { staffKeys } from "./staffKeys";
import type { StaffListQuery } from "../types";

export interface StaffFilters {
  search?: string;
  status?: StaffListQuery["status"];
  affiliation?: StaffListQuery["affiliation"];
  functionKey?: StaffListQuery["functionKey"];
  hasAccess?: boolean;
}

interface StaffPagination extends OffsetPagination {
  filters?: StaffFilters;
  sortBy?: StaffListQuery["sortBy"];
  sortDirection?: StaffListQuery["sortDirection"];
}

function toListQuery(
  pagination: StaffPagination,
): StaffListQuery {
  const { filters, limit, offset, sortBy, sortDirection } = pagination;
  return {
    limit,
    offset,
    search: filters?.search,
    status: filters?.status,
    affiliation: filters?.affiliation,
    functionKey: filters?.functionKey,
    hasAccess: filters?.hasAccess,
    sortBy,
    sortDirection,
  };
}

export function useStaff(pagination: StaffPagination) {
  const query = toListQuery(pagination);
  return useEntityQuery({
    queryKey: staffKeys.list(query),
    queryFn: () => listStaff(query),
  });
}

export function useResponsiveStaff(filters: StaffFilters = {}) {
  return useResponsiveOffsetList({
    queryKey: [...staffKeys.all, "responsive", filters],
    fetchPage: async (pagination) => {
      const page = await listStaff(toListQuery({ ...pagination, filters }));
      return page.items;
    },
  });
}

export function useStaffCommands() {
  const { t } = useKafilLanguage();
  const invalidate = [staffKeys.all];

  const create = useEntityCommand({
    mutationFn: createStaff,
    invalidate,
    successMessage: t("operator.staff.createSuccess"),
    errorMessage: t("operator.staff.createError"),
  });

  const update = useEntityCommand({
    mutationFn: updateStaff,
    invalidate,
    successMessage: t("operator.staff.updateSuccess"),
    errorMessage: t("operator.staff.updateError"),
  });

  const remove = useEntityCommand({
    mutationFn: deleteStaff,
    invalidate,
    successMessage: t("operator.staff.deleteSuccess"),
    errorMessage: t("operator.staff.deleteError"),
  });

  const bulkRemove = useEntityCommand({
    mutationFn: bulkDeleteStaff,
    invalidate,
    successMessage: t("operator.staff.bulkDeleteSuccess"),
    errorMessage: t("operator.staff.bulkDeleteError"),
  });

  const deactivate = useEntityCommand({
    mutationFn: deactivateStaff,
    invalidate,
    successMessage: t("operator.staff.deactivateSuccess"),
    errorMessage: t("operator.staff.deactivateError"),
  });

  const reactivate = useEntityCommand({
    mutationFn: reactivateStaff,
    invalidate,
    successMessage: t("operator.staff.reactivateSuccess"),
    errorMessage: t("operator.staff.reactivateError"),
  });

  const provisionAccess = useEntityCommand({
    mutationFn: provisionStaffOperatorAccess,
    invalidate,
    successMessage: t("operator.staff.provisionAccessSuccess"),
    errorMessage: t("operator.staff.provisionAccessError"),
  });

  return {
    bulkRemove,
    create,
    deactivate,
    provisionAccess,
    reactivate,
    remove,
    update,
  };
}
