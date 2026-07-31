"use client";

import { useEntityCommand } from "@/hooks/useEntityCommand";
import { useEntityQuery } from "@/hooks/useEntityQuery";
import { useKafilLanguage } from "@/i18n/KafilLanguageProvider";
import {
  deactivateAccessUser,
  createAccessPermission,
  getAccessUser,
  listAccessPermissions,
  listAccessRoles,
  listAccessUsers,
  reactivateAccessUser,
  revokeAccessUserSessions,
} from "@/services/adminAccessApi";

import type { AccessUserListQuery } from "../types";

export const adminAccessKeys = {
  all: ["admin-access"] as const,
  users: ["admin-access", "users"] as const,
  user(userId: string) {
    return ["admin-access", "users", userId] as const;
  },
  userList(query: AccessUserListQuery) {
    return ["admin-access", "users", "list", query] as const;
  },
  roles: ["admin-access", "roles"] as const,
  permissions: ["admin-access", "permissions"] as const,
};

export function useAccessUsers(query: AccessUserListQuery) {
  return useEntityQuery({
    queryKey: adminAccessKeys.userList(query),
    queryFn: () => listAccessUsers(query),
  });
}

export function useAccessUser(userId: string) {
  return useEntityQuery({
    queryKey: adminAccessKeys.user(userId),
    queryFn: () => getAccessUser(userId),
    enabled: Boolean(userId),
  });
}

export function useAccessRoles() {
  return useEntityQuery({
    queryKey: adminAccessKeys.roles,
    queryFn: listAccessRoles,
  });
}

export function useAccessPermissions() {
  return useEntityQuery({
    queryKey: adminAccessKeys.permissions,
    queryFn: listAccessPermissions,
  });
}

export function useAccessUserCommands() {
  const { t } = useKafilLanguage();
  const invalidate = [adminAccessKeys.all];
  const deactivate = useEntityCommand({
    mutationFn: deactivateAccessUser,
    invalidate,
    successMessage: t("adminAccess.messages.deactivated"),
    errorMessage: t("adminAccess.messages.deactivateError"),
  });
  const reactivate = useEntityCommand({
    mutationFn: reactivateAccessUser,
    invalidate,
    successMessage: t("adminAccess.messages.reactivated"),
    errorMessage: t("adminAccess.messages.reactivateError"),
  });
  const revokeSessions = useEntityCommand({
    mutationFn: revokeAccessUserSessions,
    invalidate,
    successMessage: t("adminAccess.messages.sessionsRevoked"),
    errorMessage: t("adminAccess.messages.sessionsError"),
  });
  return { deactivate, reactivate, revokeSessions };
}

export function useAdminAccessCreateCommands() {
  const { t } = useKafilLanguage();
  const invalidate = [adminAccessKeys.all];
  const createPermission = useEntityCommand({
    mutationFn: createAccessPermission,
    invalidate,
    successMessage: t("adminAccess.messages.permissionCreated"),
    errorMessage: t("adminAccess.messages.permissionCreateError"),
  });
  return { createPermission };
}
