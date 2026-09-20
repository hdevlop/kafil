import type {
  AccessPermissionView,
  AccessReasonCommand,
  AccessResetCommand,
  AccessResetResult,
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

/**
 * One request for all three recovery workflows. The server reads the account
 * and picks the mode; `expectedMode` is only what the dialog explained, sent so
 * the server can refuse a confirmation that no longer describes the account.
 * The response names which workflow ran and whether mail actually left.
 */
export function resetAccessUser({
  userId,
  reason,
  expectedMode,
}: AccessResetCommand) {
  return api.post<AccessResetResult>(
    `/admin/access/users/${userId}/reset-access`,
    { reason, expectedMode },
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
