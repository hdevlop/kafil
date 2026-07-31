import { api } from "@/services/http";

import type {
  CreateStaffInput,
  StaffCreateResult,
  StaffDeliveryOption,
  StaffListQuery,
  StaffPage,
  StaffProvisionAccessResult,
  StaffRecord,
  StaffStatusInput,
  UpdateStaffInput,
} from "@/features/Staff/types";

export const STAFF_IMAGE_ROUTE = "/staff-images/files/";
export const STAFF_IMAGE_SERVE_ROUTE = "/api/staff-images/files/serve/";

function imageExtension(file: File) {
  const extensionByMimeType: Record<string, string> = {
    "image/avif": "avif",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };

  return extensionByMimeType[file.type] ?? "img";
}

export function listStaff(query: StaffListQuery) {
  return api.get<StaffPage>("/staff", {
    query: { ...query },
  });
}

export function getStaff(id: string) {
  return api.get<StaffRecord>(`/staff/${id}`);
}

export function listStaffDeliveryOptions() {
  return api.get<StaffDeliveryOption[]>("/staff/options/delivery");
}

export async function uploadStaffImage(file: File) {
  const fileName = `${crypto.randomUUID()}.${imageExtension(file)}`;
  const uploaded = await api.upload<{ path: string }>(
    `${STAFF_IMAGE_ROUTE}${fileName}`,
    file,
  );
  return uploaded.path;
}

export function deleteStaffImage(imagePath: string) {
  const fileName = imagePath.slice(imagePath.lastIndexOf("/") + 1);
  return api.deleteFile(`${STAFF_IMAGE_ROUTE}${encodeURIComponent(fileName)}`);
}

export function createStaff(input: CreateStaffInput) {
  return api.post<StaffCreateResult>("/staff", input);
}

export function updateStaff({ id, input }: { id: string; input: UpdateStaffInput }) {
  return api.put<StaffRecord>(`/staff/${id}`, input);
}

export function deleteStaff(id: string) {
  return api.delete<StaffRecord>(`/staff/${id}`);
}

export function bulkDeleteStaff(ids: string[]) {
  return api.post<StaffRecord[]>("/staff/bulk-delete", { ids });
}

export function deactivateStaff({ id, reason }: StaffStatusInput) {
  return api.post<StaffRecord>(`/staff/${id}/deactivate`, { reason });
}

export function reactivateStaff({ id, reason }: StaffStatusInput) {
  return api.post<StaffRecord>(`/staff/${id}/reactivate`, { reason });
}

export function provisionStaffOperatorAccess({
  id,
  email,
}: {
  id: string;
  email: string;
}) {
  return api.post<StaffProvisionAccessResult>(
    `/staff/${id}/access/operator`,
    { email },
  );
}
