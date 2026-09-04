"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useEntityCommand } from "@/hooks/useEntityCommand";
import { useEntityQuery } from "@/hooks/useEntityQuery";
import { useCardViewport } from "najm-kit";
import { useTranslation } from "najm-i18n/react";
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

export function useAccessUsers(query: AccessUserListQuery, enabled = true) {
  return useEntityQuery({
    queryKey: adminAccessKeys.userList(query),
    queryFn: () => listAccessUsers(query),
    enabled,
  });
}

export function useResponsiveAccessUsers(query: AccessUserListQuery) {
  const cardViewport = useCardViewport();
  const page = useAccessUsers(query, !cardViewport);
  const filters = {
    role: query.role,
    search: query.search,
    status: query.status,
    verified: query.verified,
  };
  const incremental = useInfiniteQuery({
    enabled: cardViewport,
    queryKey: [...adminAccessKeys.users, "responsive", filters, query.limit],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => listAccessUsers({
      ...filters,
      limit: query.limit,
      offset: pageParam,
    }),
    getNextPageParam: (lastPage) => {
      const nextOffset = lastPage.offset + lastPage.items.length;
      return nextOffset < lastPage.total ? nextOffset : undefined;
    },
  });
  const rows = cardViewport
    ? (incremental.data?.pages.flatMap((entry) => entry.items) ?? [])
    : (page.data?.items ?? []);

  return {
    cardViewport,
    data: rows,
    error: cardViewport ? incremental.error : page.error,
    hasNextPage: cardViewport && Boolean(incremental.hasNextPage),
    isPending: cardViewport ? incremental.isPending : page.isPending,
    loadingMore: incremental.isFetchingNextPage,
    loadMoreError: incremental.isFetchNextPageError ? incremental.error : null,
    onLoadMore: () => incremental.fetchNextPage(),
    refetch: async () => {
      if (cardViewport) await incremental.refetch();
      else await page.refetch();
    },
    total: cardViewport
      ? (incremental.data?.pages[0]?.total ?? 0)
      : (page.data?.total ?? 0),
  };
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
  const { t } = useTranslation();
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
  const { t } = useTranslation();
  const invalidate = [adminAccessKeys.all];
  const createPermission = useEntityCommand({
    mutationFn: createAccessPermission,
    invalidate,
    successMessage: t("adminAccess.messages.permissionCreated"),
    errorMessage: t("adminAccess.messages.permissionCreateError"),
  });
  return { createPermission };
}
