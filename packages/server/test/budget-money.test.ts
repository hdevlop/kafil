import { describe, expect, it } from "bun:test";

import {
  applyBudgetBalanceDelta,
  budgetBalanceDto,
  currencyDto,
  MAX_MINOR_UNITS,
  positiveMinorAmountDto,
  signedMinorAmountDto,
} from "../src/modules/budgets";

describe("Phase 3 money foundation", () => {
  it("accepts only integer MAD minor-unit amounts", () => {
    expect(currencyDto.parse("MAD")).toBe("MAD");
    expect(positiveMinorAmountDto.parse("1250")).toBe(1250);
    expect(positiveMinorAmountDto.safeParse(0).success).toBe(false);
    expect(positiveMinorAmountDto.safeParse(12.5).success).toBe(false);
    expect(
      positiveMinorAmountDto.safeParse(MAX_MINOR_UNITS + 1).success,
    ).toBe(false);
    expect(currencyDto.safeParse("USD").success).toBe(false);
  });

  it("allows non-zero signed ledger amounts only", () => {
    expect(signedMinorAmountDto.parse(-500)).toBe(-500);
    expect(signedMinorAmountDto.parse(500)).toBe(500);
    expect(signedMinorAmountDto.safeParse(0).success).toBe(false);
  });

  it("prevents negative or unsafe persisted account balances", () => {
    const balance = budgetBalanceDto.parse({
      availableMinor: 1_000,
      reservedMinor: 250,
      spentMinor: 100,
    });

    expect(
      applyBudgetBalanceDelta(balance, {
        availableMinor: -250,
        reservedMinor: 250,
      }),
    ).toEqual({
      availableMinor: 750,
      reservedMinor: 500,
      spentMinor: 100,
    });
    expect(() =>
      applyBudgetBalanceDelta(balance, { availableMinor: -1_001 }),
    ).toThrow();
    expect(() =>
      applyBudgetBalanceDelta(
        { availableMinor: MAX_MINOR_UNITS, reservedMinor: 0, spentMinor: 0 },
        { availableMinor: 1 },
      ),
    ).toThrow();
  });
});
