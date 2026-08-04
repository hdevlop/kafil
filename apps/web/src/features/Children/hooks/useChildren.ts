"use client";

import { useUser } from "najm-auth/client/react";

import { useEntityCommand } from "@/hooks/useEntityCommand";
import { useEntityQuery } from "@/hooks/useEntityQuery";
import { useResponsiveOffsetList } from "@/hooks/useResponsiveOffsetList";
import type { OffsetPagination } from "@/lib/pagination";
import {
  bulkDeleteChildren,
  createChild,
  deactivateChild,
  deleteChild,
  listChildren,
  listChildFamilies,
  reactivateChild,
  updateChild,
} from "@/services/childApi";

import { childKeys } from "./childKeys";

export function useChildren(pagination: OffsetPagination) {
  const user = useUser();
  return useEntityQuery({
    queryKey: childKeys.list({
      ...pagination,
      role: user?.role,
      userId: user?.id,
    }),
    queryFn: () => listChildren(pagination),
    enabled: Boolean(user),
  });
}

export function useResponsiveChildren() {
  const user = useUser();
  return useResponsiveOffsetList({
    enabled: Boolean(user),
    queryKey: [...childKeys.all, "responsive", user?.role, user?.id],
    fetchPage: listChildren,
  });
}

export function useChildFamilies(enabled = true) {
  return useEntityQuery({
    queryKey: childKeys.families,
    queryFn: listChildFamilies,
    enabled,
  });
}

export function useChildCommands() {
  const invalidate = [childKeys.all];

  const create = useEntityCommand({
    mutationFn: createChild,
    invalidate,
    successMessage: "Child record created.",
    errorMessage: "Could not create the child record.",
  });

  const update = useEntityCommand({
    mutationFn: updateChild,
    invalidate,
    successMessage: "Child record updated.",
    errorMessage: "Could not update the child record.",
  });

  const remove = useEntityCommand({
    mutationFn: deleteChild,
    invalidate,
    successMessage: "Child record permanently deleted.",
    errorMessage: "Could not permanently delete the child record.",
  });

  const bulkRemove = useEntityCommand({
    mutationFn: bulkDeleteChildren,
    invalidate,
    successMessage: "Selected child records permanently deleted.",
    errorMessage: "Could not permanently delete the selected child records.",
  });

  const deactivate = useEntityCommand({
    mutationFn: deactivateChild,
    invalidate,
    successMessage: "Child record deactivated.",
    errorMessage: "Could not deactivate the child record.",
  });

  const reactivate = useEntityCommand({
    mutationFn: reactivateChild,
    invalidate,
    successMessage: "Child record reactivated.",
    errorMessage: "Could not reactivate the child record.",
  });

  return { create, update, remove, bulkRemove, deactivate, reactivate };
}
