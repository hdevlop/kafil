import { describe, expect, test } from "bun:test";

import { familyBudgetKeys } from "../src/features/FamilyBudget/hooks/familyBudgetKeys";

describe("Phase 6E family budget query contracts", () => {
  test("keeps the family budget summary separate from its immutable ledger", () => {
    expect(familyBudgetKeys.summary).toEqual([
      "family-budget",
      "detail",
      "summary",
    ]);
    expect(familyBudgetKeys.ledger({ limit: 25, offset: 50 })).toEqual([
      "family-budget-ledger",
      "list",
      { limit: 25, offset: 50 },
    ]);
  });

  test("uses pagination-only ledger keys without client-controlled balance fields", () => {
    expect(familyBudgetKeys.ledger({ limit: 10, offset: 0 })).toEqual([
      "family-budget-ledger",
      "list",
      { limit: 10, offset: 0 },
    ]);
  });
});
