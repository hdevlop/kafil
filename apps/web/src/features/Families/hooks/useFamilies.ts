"use client";

import { useEntityCommand } from "@/hooks/useEntityCommand";
import { useEntityQuery } from "@/hooks/useEntityQuery";
import type { OffsetPagination } from "@/lib/pagination";
import {
  createFamily,
  deactivateFamily,
  deleteFamily,
  listFamilies,
  reactivateFamily,
  updateFamily,
} from "@/services/familyApi";

import { familyKeys } from "./familyKeys";

export function useFamilies(pagination: OffsetPagination) {
  return useEntityQuery({
    queryKey: familyKeys.list(pagination),
    queryFn: () => listFamilies(pagination),
  });
}

export function useFamilyCommands() {
  const invalidate = [familyKeys.all];

  const create = useEntityCommand({
    mutationFn: createFamily,
    invalidate,
    successMessage: "Family account created. Initial login is ready.",
    errorMessage: "Could not create the family account.",
  });

  const update = useEntityCommand({
    mutationFn: updateFamily,
    invalidate: [familyKeys.all],
    successMessage: "Family profile updated.",
    errorMessage: "Could not update the family profile.",
  });

  const remove = useEntityCommand({
    mutationFn: deleteFamily,
    invalidate,
    successMessage: "Empty family account permanently deleted.",
    errorMessage: "Could not permanently delete the family account.",
  });

  const deactivate = useEntityCommand({
    mutationFn: deactivateFamily,
    invalidate: [familyKeys.all],
    successMessage: "Family account deactivated.",
    errorMessage: "Could not deactivate the family account.",
  });

  const reactivate = useEntityCommand({
    mutationFn: reactivateFamily,
    invalidate: [familyKeys.all],
    successMessage: "Family account reactivated.",
    errorMessage: "Could not reactivate the family account.",
  });

  return { create, update, remove, deactivate, reactivate };
}
