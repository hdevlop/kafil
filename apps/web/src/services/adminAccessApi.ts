import type {
  AccessPermissionView,
  AccessReasonCommand,
  AccessRole,
  AccessUserDetail,
  AccessUserListQuery,
  AccessUserPage,
  CreateAccessOperatorInput,
  CreateAccessPermissionInput,
} from "@/features/AdminAccess/types";
import { api } from "@/services/http";

export function listAccessUsers(query: AccessUserListQuery) {
  return api.get<AccessUserPage>("/admin/access/users", {
    query: { ...query },
  });
}

export function getAccessUser(userId: string) {
  return api.get<AccessUserDetail>(`/admin/access/users/${userId}`);
}

export function deactivateAccessUser({
  userId,
  reason,
}: AccessReasonCommand) {
  return api.post<AccessUserDetail>(
    `/admin/access/users/${userId}/deactivate`,
    { reason },
  );
}

export function reactivateAccessUser({
  userId,
  reason,
}: AccessReasonCommand) {
  return api.post<AccessUserDetail>(
    `/admin/access/users/${userId}/reactivate`,
    { reason },
  );
}

export function revokeAccessUserSessions(userId: string) {
  return api.post<{ revoked: true; userId: string }>(
    `/admin/access/users/${userId}/revoke-sessions`,
  );
}

export function listAccessRoles() {
  return api.get<AccessRole[]>("/admin/access/roles");
}

export function listAccessPermissions() {
  return api.get<AccessPermissionView[]>("/admin/access/permissions");
}

const OPERATOR_IMAGE_ROUTE = "/operator-images/files/";

function operatorImageExtension(file: File) {
  const extensionByMimeType: Record<string, string> = {
    "image/avif": "avif",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };

  return extensionByMimeType[file.type] ?? "img";
}

export async function uploadOperatorImage(file: File) {
  const fileName = `${crypto.randomUUID()}.${operatorImageExtension(file)}`;
  const uploaded = await api.upload<{ path: string }>(
    `${OPERATOR_IMAGE_ROUTE}${fileName}`,
    file,
  );
  return uploaded.path;
}

export function deleteOperatorImage(imagePath: string) {
  const fileName = imagePath.slice(imagePath.lastIndexOf("/") + 1);
  return api.deleteFile(`${OPERATOR_IMAGE_ROUTE}${encodeURIComponent(fileName)}`);
}

export function createAccessOperator(input: CreateAccessOperatorInput) {
  return api.post<{ userId: string }>("/operators", input);
}

export function createAccessPermission(input: CreateAccessPermissionInput) {
  return api.post<AccessPermissionView>("/admin/access/permissions", input);
}
