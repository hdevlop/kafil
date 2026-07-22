import type { OffsetPagination } from "@/lib/pagination";
import { api } from "@/services/http";
import type {
  CreateSupportAssignmentInput,
  EndSupportAssignmentInput,
  UpdateSupportAssignmentNotesInput,
  AssignmentContributionPlanOption,
  SupportAssignmentRecord,
  SupportAssignmentSources,
} from "@/features/SupportAssignments/types";

export function listSupportAssignments(pagination: OffsetPagination) {
  return api.get<SupportAssignmentRecord[]>("/support-assignments", {
    query: { limit: pagination.limit, offset: pagination.offset },
  });
}

export function createSupportAssignment(input: CreateSupportAssignmentInput) {
  return api.post<SupportAssignmentRecord>("/support-assignments", input);
}

export function endSupportAssignment({ id, reason }: EndSupportAssignmentInput) {
  return api.post<SupportAssignmentRecord>(`/support-assignments/${id}/end`, {
    reason,
  });
}

export function updateSupportAssignmentNotes({
  id,
  notes,
}: UpdateSupportAssignmentNotesInput) {
  return api.put<SupportAssignmentRecord>(`/support-assignments/${id}/notes`, {
    notes,
  });
}

export async function listSupportAssignmentSources(): Promise<SupportAssignmentSources> {
  const [sponsors, families, plans] = await Promise.all([
    api.get<SupportAssignmentSources["sponsors"]>("/sponsors", {
      query: { limit: 100, offset: 0 },
    }),
    api.get<SupportAssignmentSources["families"]>("/families", {
      query: { limit: 100, offset: 0 },
    }),
    api.get<AssignmentContributionPlanOption[]>("/contributions/plans", {
      query: { limit: 100, offset: 0 },
    }),
  ]);

  return { sponsors, families, plans };
}
