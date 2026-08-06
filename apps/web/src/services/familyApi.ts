import type { OffsetPagination } from "@/lib/pagination";
import { api } from "@/services/http";
import type {
  CreateFamilyInput,
  CreatedFamilyRecord,
  FamilyRecord,
  FamilyStatusInput,
  SponsorFamilyCatalogEntry,
  UpdateFamilyInput,
} from "@/features/Families/types";

export interface ListFamiliesFilters {
  search?: string;
  status?: "active" | "inactive";
}

export interface SponsorFamilyCatalogFilters {
  search?: string;
  relationship?: "supported" | "available";
}

export function listFamilies(
  pagination: OffsetPagination,
  filters: ListFamiliesFilters = {},
) {
  return api.getPage<FamilyRecord>("/families", {
    query: {
      limit: pagination.limit,
      offset: pagination.offset,
      ...(filters.search ? { search: filters.search } : {}),
      ...(filters.status ? { status: filters.status } : {}),
    },
  });
}

export function getFamily(id: string) {
  return api.get<FamilyRecord>(`/families/${id}`);
}

export function listSponsorFamilyCatalog(
  pagination: OffsetPagination,
  filters: SponsorFamilyCatalogFilters = {},
) {
  return api.getPage<SponsorFamilyCatalogEntry>("/support-assignments/catalog", {
    query: {
      limit: pagination.limit,
      offset: pagination.offset,
      ...(filters.search ? { search: filters.search } : {}),
      ...(filters.relationship ? { relationship: filters.relationship } : {}),
    },
  });
}

export function createFamily(input: CreateFamilyInput) {
  return api.post<CreatedFamilyRecord>("/families", input);
}

const FAMILY_IMAGE_ROUTE = "/family-images/files/";

function imageExtension(file: File) {
  const extensionByMimeType: Record<string, string> = {
    "image/avif": "avif",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };

  return extensionByMimeType[file.type] ?? "img";
}

export async function uploadFamilyImage(file: File) {
  const fileName = `${crypto.randomUUID()}.${imageExtension(file)}`;
  const uploaded = await api.upload<{ path: string }>(
    `${FAMILY_IMAGE_ROUTE}${fileName}`,
    file,
  );
  return uploaded.path;
}

export function deleteFamilyImage(imagePath: string) {
  const fileName = imagePath.slice(imagePath.lastIndexOf("/") + 1);
  return api.deleteFile(`${FAMILY_IMAGE_ROUTE}${encodeURIComponent(fileName)}`);
}

export function updateFamily({
  id,
  input,
}: {
  id: string;
  input: UpdateFamilyInput;
}) {
  return api.put<FamilyRecord>(`/families/${id}`, input);
}

export function deleteFamily(id: string) {
  return api.delete<FamilyRecord>(`/families/${id}`);
}

export function bulkDeleteFamilies(ids: string[]) {
  return api.post<FamilyRecord[]>("/families/bulk-delete", { ids });
}

export function deactivateFamily({ id, reason }: FamilyStatusInput) {
  return api.post<FamilyRecord>(`/families/${id}/deactivate`, { reason });
}

export function reactivateFamily({ id, reason }: FamilyStatusInput) {
  return api.post<FamilyRecord>(`/families/${id}/reactivate`, { reason });
}
