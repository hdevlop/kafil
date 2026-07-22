import type {
  ContributionCommandResult,
  ContributionListQuery,
  ContributionReasonInput,
  ContributionRecord,
  ContributionRecordingOption,
  RecordContributionInput,
} from "@/features/Contributions/types";
import { api } from "@/services/http";

export function listContributions(query: ContributionListQuery) {
  return api.get<ContributionRecord[]>("/contributions", {
    query: {
      familyProfileId: query.familyProfileId,
      limit: query.limit,
      offset: query.offset,
      status: query.status,
    },
  });
}

export function listContributionRecordingOptions() {
  return api.get<ContributionRecordingOption[]>(
    "/contributions/recording-options",
  );
}

export function recordContribution(input: RecordContributionInput) {
  return api.post<ContributionRecord>("/contributions", input);
}

export function validateContribution(id: string) {
  return api.post<ContributionCommandResult>(`/contributions/${id}/validate`);
}

export function rejectContribution({ id, reason }: ContributionReasonInput) {
  return api.post<ContributionRecord>(`/contributions/${id}/reject`, { reason });
}

export function refundContribution({ id, reason }: ContributionReasonInput) {
  return api.post<ContributionCommandResult>(`/contributions/${id}/refund`, {
    reason,
  });
}

export function deleteContribution(id: string) {
  return api.delete<ContributionRecord>(`/contributions/${id}`);
}

export function bulkDeleteContributions(ids: string[]) {
  return api.post<ContributionRecord[]>("/contributions/bulk-delete", { ids });
}
