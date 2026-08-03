import type { OffsetPagination } from "@/lib/pagination";
import { api } from "@/services/http";
import type {
  ChildRecord,
  ChildStatusInput,
  CreateChildInput,
  FamilyOption,
  UpdateChildInput,
} from "@/features/Children/types";

export function listChildren(pagination: OffsetPagination) {
  return api.get<ChildRecord[]>("/children", {
    query: { limit: pagination.limit, offset: pagination.offset },
  });
}

export function listOwnFamilyChildren() {
  return api.get<ChildRecord[]>("/children/me");
}

export function getChild(id: string) {
  return api.get<ChildRecord>(`/children/${id}`);
}

const CHILD_IMAGE_ROUTE = "/child-images/files/";

function imageExtension(file: File) {
  const extensionByMimeType: Record<string, string> = {
    "image/avif": "avif",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };

  return extensionByMimeType[file.type] ?? "img";
}

export async function uploadChildImage(file: File) {
  const fileName = `${crypto.randomUUID()}.${imageExtension(file)}`;
  const uploaded = await api.upload<{ path: string }>(
    `${CHILD_IMAGE_ROUTE}${fileName}`,
    file,
  );
  return uploaded.path;
}

export function deleteChildImage(imagePath: string) {
  const fileName = imagePath.slice(imagePath.lastIndexOf("/") + 1);
  return api.deleteFile(`${CHILD_IMAGE_ROUTE}${encodeURIComponent(fileName)}`);
}

export function createChild(input: CreateChildInput) {
  return api.post<ChildRecord>("/children", input);
}

export function updateChild({
  id,
  input,
}: {
  id: string;
  input: UpdateChildInput;
}) {
  return api.put<ChildRecord>(`/children/${id}`, input);
}

export function deleteChild(id: string) {
  return api.delete<ChildRecord>(`/children/${id}`);
}

export function bulkDeleteChildren(ids: string[]) {
  return api.post<ChildRecord[]>("/children/bulk-delete", { ids });
}

export function deactivateChild({ id, reason }: ChildStatusInput) {
  return api.post<ChildRecord>(`/children/${id}/deactivate`, { reason });
}

export function reactivateChild({ id, reason }: ChildStatusInput) {
  return api.post<ChildRecord>(`/children/${id}/reactivate`, { reason });
}

export function listChildFamilies() {
  return api.get<FamilyOption[]>("/families", {
    query: { limit: 100, offset: 0 },
  });
}
