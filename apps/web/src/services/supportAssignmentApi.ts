import type { OffsetPagination } from "najm-kit/pagination";
import { api } from "@/services/http";
import type {
  CreateSupportAssignmentInput,
  EndSupportAssignmentInput,
  UpdateSupportAssignmentNotesInput,
  SupportAssignmentRecord,
  SupportAssignmentView,
  SupportAssignmentSources,
} from "@/features/SupportAssignments/types";

export interface ListSupportAssignmentFilters {
  sponsorSearch?: string;
  familySearch?: string;
  status?: "active" | "ended";
}

export function listSupportAssignments(
  pagination: OffsetPagination,
  filters: ListSupportAssignmentFilters = {},
) {
  return api.getPage<SupportAssignmentView>("/support-assignments", {
    query: { ...pagination, ...filters },
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

export async function listSupportAssignmentSources(filters: {
  sponsorSearch?: string;
  familySearch?: string;
} = {}): Promise<SupportAssignmentSources> {
  const [sponsors, families] = await Promise.all([
    api.get<SupportAssignmentSources["sponsors"]>("/sponsors", {
      query: { limit: 25, offset: 0, status: "active", search: filters.sponsorSearch },
    }),
    api.get<SupportAssignmentSources["families"]>("/families", {
      query: { limit: 25, offset: 0, status: "active", search: filters.familySearch },
    }),
  ]);

  return { sponsors, families };
}
