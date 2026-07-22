import { describe, expect, test } from "bun:test";
import { QueryClient } from "@tanstack/react-query";

import {
  currentMonthFirstDay,
  manualBudgetAdjustmentFormSchema,
  minorUnitsToMadInput,
  monthlyBudgetLimitFormSchema,
  toManualBudgetAdjustmentInput,
  toMonthlyBudgetLimitInput,
} from "../src/features/Budgets/config/budgetSchemas";
import { budgetKeys } from "../src/features/Budgets/hooks/budgetKeys";

describe("Phase 6D budget form contracts", () => {
  test("converts a positive MAD monthly limit to integer minor units", () => {
    const values = monthlyBudgetLimitFormSchema.parse({
      month: "2026-08-01",
      limitMad: " 1500.50 ",
      reason: "August household allocation",
    });

    expect(toMonthlyBudgetLimitInput(values)).toEqual({
      month: "2026-08-01",
      limitMinor: 150_050,
      reason: "August household allocation",
    });
  });

  test("requires a first-of-month positive limit", () => {
    expect(
      monthlyBudgetLimitFormSchema.safeParse({
        month: "2026-08-02",
        limitMad: "0",
        reason: "No",
      }).success,
    ).toBe(false);
  });

  test("converts a signed manual adjustment and preserves its idempotency key", () => {
    const values = manualBudgetAdjustmentFormSchema.parse({
      amountMad: "-25.50",
      reason: "Duplicate credit correction",
    });

    expect(
      toManualBudgetAdjustmentInput(values, "adjustment-0001"),
    ).toEqual({
      amountMinor: -2_550,
      idempotencyKey: "adjustment-0001",
      reason: "Duplicate credit correction",
    });
  });

  test("rejects a zero or imprecise adjustment", () => {
    expect(
      manualBudgetAdjustmentFormSchema.safeParse({
        amountMad: "0",
        reason: "No operation",
      }).success,
    ).toBe(false);
    expect(
      manualBudgetAdjustmentFormSchema.safeParse({
        amountMad: "1.234",
        reason: "Invalid precision",
      }).success,
    ).toBe(false);
  });
});

describe("Phase 6D budget helpers", () => {
  test("uses UTC month boundaries and stable, scoped query keys", () => {
    expect(currentMonthFirstDay(new Date("2026-07-17T23:00:00.000Z"))).toBe(
      "2026-07-01",
    );
    expect(minorUnitsToMadInput(150_050)).toBe("1500.50");
    expect(budgetKeys.ledger("household-1", { limit: 25, offset: 50 })).toEqual([
      "budgets",
      "list",
      { familyProfileId: "household-1", limit: 25, offset: 50 },
    ]);
  });

  test("invalidates a selected family's summary and ledger together", async () => {
    const queryClient = new QueryClient();
    const pagination = { limit: 25, offset: 0 };
    const summaryKey = budgetKeys.summary("family-1");
    const ledgerKey = budgetKeys.ledger("family-1", pagination);

    queryClient.setQueryData(summaryKey, { availableMinor: 0 });
    queryClient.setQueryData(ledgerKey, []);

    await queryClient.invalidateQueries({ queryKey: budgetKeys.all });

    expect(queryClient.getQueryState(summaryKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(ledgerKey)?.isInvalidated).toBe(true);
  });
});
