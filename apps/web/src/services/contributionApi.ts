import type {
  ContributionCommandResult,
  ContributionListQuery,
  ContributionListRecord,
  ContributionReasonInput,
  ContributionRecord,
  ContributionRecordingOption,
  RecordContributionInput,
} from "@/features/Contributions/types";
import { listAllOffsetPages } from "@/lib/pagination";
import { api } from "@/services/http";

export function listContributions<TRecord extends ContributionListRecord = ContributionRecord>(query: ContributionListQuery) {
  return api.get<TRecord[]>("/contributions", {
    query: {
      familyProfileId: query.familyProfileId,
      limit: query.limit,
      offset: query.offset,
      status: query.status,
    },
  });
}

export async function listContributionPage<TRecord extends ContributionListRecord = ContributionRecord>(
  query: ContributionListQuery,
) {
  const rows = await listContributions<TRecord>(query);
  const hasNextPage = rows.length === query.limit
    ? (await listContributions<TRecord>({ ...query, limit: 1, offset: query.offset + query.limit })).length > 0
    : false;

  return { rows, hasNextPage };
}

export function listAllContributions<TRecord extends ContributionListRecord = ContributionRecord>(
  query: Omit<ContributionListQuery, "limit" | "offset">,
) {
  return listAllOffsetPages<TRecord>((pagination) =>
    listContributions<TRecord>({ ...query, ...pagination }),
  );
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
