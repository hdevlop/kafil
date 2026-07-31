import type {
  AccessPermissionView,
  AccessReasonCommand,
  AccessRole,
  AccessUserDetail,
  AccessUserListQuery,
  AccessUserPage,
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

export function createAccessPermission(input: CreateAccessPermissionInput) {
  return api.post<AccessPermissionView>("/admin/access/permissions", input);
}
