import type { OffsetPagination } from "@/lib/pagination";
import { api } from "@/services/http";
import type {
  CreateFamilyInput,
  CreatedFamilyRecord,
  FamilyRecord,
  FamilyStatusInput,
  UpdateFamilyInput,
} from "@/features/Families/types";

export function listFamilies(pagination: OffsetPagination) {
  return api.get<FamilyRecord[]>("/families", {
    query: { limit: pagination.limit, offset: pagination.offset },
  });
}

export function getFamily(id: string) {
  return api.get<FamilyRecord>(`/families/${id}`);
}

export function createFamily(input: CreateFamilyInput) {
  return api.post<CreatedFamilyRecord>("/families", input);
}

const FAMILY_IMAGE_ROUTE = "/family-images/files/";

function imageExtension(file: File) {
  const extensionByMimeType: Record<string, string> = {
    "image/avif": "avif",
    "image/gif": "gif",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };

  return extensionByMimeType[file.type] ?? "img";
}

export async function uploadFamilyImage(file: File) {
  const fileName = `${crypto.randomUUID()}.${imageExtension(file)}`;
  await api.upload(`${FAMILY_IMAGE_ROUTE}${fileName}`, file);
  return `/api${FAMILY_IMAGE_ROUTE}serve/${fileName}`;
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

export function deactivateFamily({ id, reason }: FamilyStatusInput) {
  return api.post<FamilyRecord>(`/families/${id}/deactivate`, { reason });
}

export function reactivateFamily({ id, reason }: FamilyStatusInput) {
  return api.post<FamilyRecord>(`/families/${id}/reactivate`, { reason });
}
