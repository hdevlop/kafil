import type { OffsetPagination } from "@/lib/pagination";
import { api } from "@/services/http";
import type {
  CreateSponsorInput,
  CreatedSponsorRecord,
  SponsorRecord,
  SponsorStatusInput,
  UpdateSponsorInput,
} from "@/features/Sponsors/types";

export function listSponsors(pagination: OffsetPagination) {
  return api.get<SponsorRecord[]>("/sponsors", {
    query: { limit: pagination.limit, offset: pagination.offset },
  });
}

export function getSponsor(id: string) {
  return api.get<SponsorRecord>(`/sponsors/${id}`);
}

export function createSponsor(input: CreateSponsorInput) {
  return api.post<CreatedSponsorRecord>("/sponsors", input);
}

export function updateSponsor({
  id,
  input,
}: {
  id: string;
  input: UpdateSponsorInput;
}) {
  return api.put<SponsorRecord>(`/sponsors/${id}`, input);
}

export function deleteSponsor(id: string) {
  return api.delete<SponsorRecord>(`/sponsors/${id}`);
}

export function deactivateSponsor({ id, reason }: SponsorStatusInput) {
  return api.post<SponsorRecord>(`/sponsors/${id}/deactivate`, { reason });
}

export function reactivateSponsor({ id, reason }: SponsorStatusInput) {
  return api.post<SponsorRecord>(`/sponsors/${id}/reactivate`, { reason });
}
