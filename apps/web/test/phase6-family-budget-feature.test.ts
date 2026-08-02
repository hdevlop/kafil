import { describe, expect, test } from "bun:test";

import { familyBudgetKeys } from "../src/features/Budgets/hooks/familyBudgetKeys";

describe("family budget engine presentation boundary", () => {
  test("keeps the family budget summary available to order workflows", () => {
    expect(familyBudgetKeys.summary).toEqual([
      "family-budget",
      "detail",
      "summary",
    ]);
  });

  test("does not expose a standalone family budget page", async () => {
    expect(
      await Bun.file(
        new URL(
          "../src/app/(dashboard)/family/budget/page.tsx",
          import.meta.url,
        ),
      ).exists(),
    ).toBe(false);
  });
});
