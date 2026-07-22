import { entityKeys } from "@/hooks/queryKeys";
import type { OffsetPagination } from "@/lib/pagination";

export const budgetKeys = {
  all: entityKeys.all("budgets"),
  families: ["budgets", "families"] as const,
  summary(familyProfileId: string) {
    return entityKeys.detail("budgets", familyProfileId);
  },
  ledger(familyProfileId: string, pagination: OffsetPagination) {
    return entityKeys.list("budgets", {
      familyProfileId,
      limit: pagination.limit,
      offset: pagination.offset,
    });
  },
};
