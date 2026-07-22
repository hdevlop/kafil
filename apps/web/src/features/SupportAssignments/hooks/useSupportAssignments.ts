"use client";

import { useEntityCommand } from "@/hooks/useEntityCommand";
import { useEntityQuery } from "@/hooks/useEntityQuery";
import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import type { OffsetPagination } from "@/lib/pagination";
import {
  createSupportAssignment,
  endSupportAssignment,
  listSupportAssignments,
  listSupportAssignmentSources,
  updateSupportAssignmentNotes,
} from "@/services/supportAssignmentApi";

import { supportAssignmentKeys } from "./supportAssignmentKeys";

export function useSupportAssignments(pagination: OffsetPagination) {
  return useEntityQuery({
    queryKey: supportAssignmentKeys.list(pagination),
    queryFn: () => listSupportAssignments(pagination),
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
