import { entityKeys } from "@/hooks/queryKeys";

import type { FamilyBudgetLedgerQuery } from "../types";

export const familyBudgetKeys = {
  all: entityKeys.all("family-budget"),
  summary: entityKeys.detail("family-budget", "summary"),
  ledger(query: FamilyBudgetLedgerQuery) {
    return entityKeys.list("family-budget-ledger", {
      limit: query.limit,
      offset: query.offset,
    });
  },
};
