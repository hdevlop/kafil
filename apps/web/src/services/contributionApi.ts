import type {
  ContributionCommandResult,
  ContributionListQuery,
  ContributionListRecord,
  ContributionReasonInput,
  ContributionRecord,
  ContributionRecordingOption,
  RecordContributionInput,
} from "@/features/Contributions/types";
import { api } from "@/services/http";

/**
 * One page of contributions, with the result total the endpoint now reports.
 *
 * `getPage` rather than `get`: the total lives on the response envelope, which
 * `api.get` discards. It is what lets the list render a real page count instead
 * of the cursor bound it used to synthesize — and it retires the probe request
 * that used to ask for one row past the page just to learn whether more existed.
 */
export function listContributions<TRecord extends ContributionListRecord = ContributionRecord>(query: ContributionListQuery) {
  return api.getPage<TRecord>("/contributions", {
    query: {
      familyProfileId: query.familyProfileId,
      search: query.search,
      paymentMethod: query.paymentMethod,
      limit: query.limit,
      offset: query.offset,
      status: query.status,
    },
  });
}

export function listContributionRecordingOptions(query: {
  search?: string;
  familyProfileId?: string;
} = {}) {
  return api.get<ContributionRecordingOption[]>(
    "/contributions/recording-options",
    { query: { limit: 25, offset: 0, ...query } },
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
