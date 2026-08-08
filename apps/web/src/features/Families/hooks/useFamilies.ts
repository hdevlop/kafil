"use client";

import { useEntityCommand } from "@/hooks/useEntityCommand";
import { useEntityQuery } from "@/hooks/useEntityQuery";
import { useOffsetInfiniteQuery, useResponsiveOffsetList } from "najm-kit/query";
import type { OffsetPagination } from "najm-kit/pagination";
import {
  type ListFamiliesFilters,
  type SponsorFamilyCatalogFilters,
  bulkDeleteFamilies,
  createFamily,
  deactivateFamily,
  deleteFamily,
  listFamilies,
  listSponsorFamilyCatalog,
  reactivateFamily,
  updateFamily,
} from "@/services/familyApi";

import { familyKeys } from "./familyKeys";

export function useFamilies(
  pagination: OffsetPagination,
  filters: ListFamiliesFilters = {},
  enabled = true,
) {
  return useEntityQuery({
    queryKey: familyKeys.list({ ...pagination, ...filters }),
    queryFn: async () => (await listFamilies(pagination, filters)).rows,
    enabled,
  });
}

export function useResponsiveFamilies(
  filters: ListFamiliesFilters = {},
  enabled = true,
) {
  return useResponsiveOffsetList({
    enabled,
    queryKey: [...familyKeys.all, "responsive", filters],
    fetchPage: (pagination) => listFamilies(pagination, filters),
  });
}

export function useSponsorFamilyCatalog(
  pagination: OffsetPagination,
  filters: SponsorFamilyCatalogFilters = {},
  enabled = true,
) {
  return useEntityQuery({
    queryKey: [...familyKeys.sponsorCatalog(filters), pagination],
    queryFn: async () => (await listSponsorFamilyCatalog(pagination, filters)).rows,
    enabled,
  });
}

export function useInfiniteSponsorFamilyCatalog(
  filters: SponsorFamilyCatalogFilters = {},
  enabled = true,
) {
  return useOffsetInfiniteQuery({
    enabled,
    queryKey: familyKeys.sponsorCatalog(filters),
    fetchPage: (pagination) => listSponsorFamilyCatalog(pagination, filters),
  });
}

export function useResponsiveSponsorFamilyCatalog(
  filters: SponsorFamilyCatalogFilters = {},
  enabled = true,
) {
  return useResponsiveOffsetList({
    enabled,
    queryKey: [...familyKeys.sponsorCatalog(filters), "responsive"],
    fetchPage: (pagination) => listSponsorFamilyCatalog(pagination, filters),
  });
}

export function useFamilyCommands() {
  const invalidate = [familyKeys.all];

  const create = useEntityCommand({
    mutationFn: createFamily,
    invalidate,
    successMessage: "Family account created. Initial login is ready.",
    errorMessage: "Could not create the family account.",
  });

  const update = useEntityCommand({
    mutationFn: updateFamily,
    invalidate: [familyKeys.all],
    successMessage: "Family profile updated.",
    errorMessage: "Could not update the family profile.",
  });

  const remove = useEntityCommand({
    mutationFn: deleteFamily,
    invalidate,
    successMessage: "Empty family account permanently deleted.",
    errorMessage: "Could not permanently delete the family account.",
  });

  const bulkRemove = useEntityCommand({
    mutationFn: bulkDeleteFamilies,
    invalidate,
    successMessage: "Selected family accounts permanently deleted.",
    errorMessage: "Could not permanently delete the selected family accounts.",
  });

  const deactivate = useEntityCommand({
    mutationFn: deactivateFamily,
    invalidate: [familyKeys.all],
    successMessage: "Family account deactivated.",
    errorMessage: "Could not deactivate the family account.",
  });

  const reactivate = useEntityCommand({
    mutationFn: reactivateFamily,
    invalidate: [familyKeys.all],
    successMessage: "Family account reactivated.",
    errorMessage: "Could not reactivate the family account.",
  });

  return { create, update, remove, bulkRemove, deactivate, reactivate };
}
