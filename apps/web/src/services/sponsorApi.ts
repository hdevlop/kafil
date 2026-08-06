import type { OffsetPagination } from "@/lib/pagination";
import { api } from "@/services/http";
import type {
  CreateSponsorInput,
  CreatedSponsorRecord,
  OperatorSponsorOverviewData,
  SponsorRecord,
  SponsorStatusInput,
  UpdateSponsorInput,
} from "@/features/Sponsors/types";

export interface ListSponsorsFilters {
  search?: string;
  status?: "active" | "inactive";
}

export function listSponsors(
  pagination: OffsetPagination,
  filters: ListSponsorsFilters = {},
) {
  return api.getPage<SponsorRecord>("/sponsors", {
    query: {
      limit: pagination.limit,
      offset: pagination.offset,
      ...(filters.search ? { search: filters.search } : {}),
      ...(filters.status ? { status: filters.status } : {}),
    },
  });
}

export function getSponsor(id: string) {
  return api.get<SponsorRecord>(`/sponsors/${id}`);
}

export function getSponsorOverview(id: string) {
  return api.get<OperatorSponsorOverviewData>(`/sponsors/${id}/overview`);
}

const SPONSOR_IMAGE_ROUTE = "/sponsor-images/files/";

function imageExtension(file: File) {
  const extensionByMimeType: Record<string, string> = {
    "image/avif": "avif",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };

  return extensionByMimeType[file.type] ?? "img";
}

export async function uploadSponsorImage(file: File) {
  const fileName = `${crypto.randomUUID()}.${imageExtension(file)}`;
  const uploaded = await api.upload<{ path: string }>(
    `${SPONSOR_IMAGE_ROUTE}${fileName}`,
    file,
  );
  return uploaded.path;
}

export function deleteSponsorImage(imagePath: string) {
  const fileName = imagePath.slice(imagePath.lastIndexOf("/") + 1);
  return api.deleteFile(`${SPONSOR_IMAGE_ROUTE}${encodeURIComponent(fileName)}`);
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

export function bulkDeleteSponsors(ids: string[]) {
  return api.post<SponsorRecord[]>("/sponsors/bulk-delete", { ids });
}

export function deactivateSponsor({ id, reason }: SponsorStatusInput) {
  return api.post<SponsorRecord>(`/sponsors/${id}/deactivate`, { reason });
}

export function reactivateSponsor({ id, reason }: SponsorStatusInput) {
  return api.post<SponsorRecord>(`/sponsors/${id}/reactivate`, { reason });
}
