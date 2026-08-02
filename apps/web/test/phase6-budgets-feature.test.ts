import { describe, expect, test } from "bun:test";
import { QueryClient } from "@tanstack/react-query";

import {
  minorUnitsToMadInput,
  parseMadAmount,
} from "../src/features/Budgets/config/budgetSchemas";
import { budgetKeys } from "../src/features/Budgets/hooks/budgetKeys";

describe("Phase 6D budget helpers", () => {
  test("keeps shared MAD conversion for contribution and family forms", () => {
    expect(parseMadAmount("1500.50")).toBe(150_050);
    expect(minorUnitsToMadInput(150_050)).toBe("1500.50");
  });

  test("retains one budget-engine invalidation namespace", async () => {
    const queryClient = new QueryClient();
    const summaryKey = [...budgetKeys.all, "family-1"];

    queryClient.setQueryData(summaryKey, { availableMinor: 0 });

    await queryClient.invalidateQueries({ queryKey: budgetKeys.all });

    expect(queryClient.getQueryState(summaryKey)?.isInvalidated).toBe(true);
  });
});
