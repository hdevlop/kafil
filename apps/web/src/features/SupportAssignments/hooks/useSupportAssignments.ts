"use client";

import { useEntityCommand } from "@/hooks/useEntityCommand";
import { useEntityQuery } from "@/hooks/useEntityQuery";
import { useOffsetInfiniteQuery } from "@/hooks/useOffsetInfiniteQuery";
import { useResponsiveOffsetList } from "@/hooks/useResponsiveOffsetList";
import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import type { OffsetPagination } from "@/lib/pagination";
import {
  createSupportAssignment,
  endSupportAssignment,
  listAllSupportAssignments,
  listSupportAssignments,
  listSupportAssignmentSources,
  updateSupportAssignmentNotes,
} from "@/services/supportAssignmentApi";

import { supportAssignmentKeys } from "./supportAssignmentKeys";

export function useSupportAssignments(pagination: OffsetPagination, enabled = true) {
  return useEntityQuery({
    queryKey: supportAssignmentKeys.list(pagination),
    queryFn: () => listSupportAssignments(pagination),
    enabled,
  });
}

export function useAllSupportAssignments(enabled = true) {
  return useEntityQuery({
    queryKey: supportAssignmentKeys.full,
    queryFn: listAllSupportAssignments,
    enabled,
  });
}

export function useInfiniteSupportAssignments(enabled = true) {
  return useOffsetInfiniteQuery({
    enabled,
    queryKey: supportAssignmentKeys.full,
    fetchPage: listSupportAssignments,
  });
}

export function useResponsiveSupportAssignments(enabled = true) {
  return useResponsiveOffsetList({
    enabled,
    queryKey: [...supportAssignmentKeys.all, "responsive"],
    fetchPage: listSupportAssignments,
  });
}

export function useSupportAssignmentSources(enabled = true) {
  return useEntityQuery({
    queryKey: supportAssignmentKeys.sources,
    queryFn: listSupportAssignmentSources,
    enabled,
  });
}

export function useSupportAssignmentCommands() {
  const { t } = useKafilLanguage();
  const invalidate = [supportAssignmentKeys.all];

  const create = useEntityCommand({
    mutationFn: createSupportAssignment,
    invalidate,
    successMessage: t("operator.assignments.createSuccess"),
    errorMessage: t("operator.assignments.createError"),
  });

  const end = useEntityCommand({
    mutationFn: endSupportAssignment,
    invalidate,
    successMessage: t("operator.assignments.endSuccess"),
    errorMessage: t("operator.assignments.endError"),
  });

  const updateNotes = useEntityCommand({
    mutationFn: updateSupportAssignmentNotes,
    invalidate,
    successMessage: t("operator.assignments.updateSuccess"),
    errorMessage: t("operator.assignments.updateError"),
  });

  return { create, updateNotes, end };
}
