import { describe, expect, test } from "bun:test";
import { QueryClient } from "@tanstack/react-query";

import {
  clampNonNegative,
  hasAnyQuota,
  isUnlimitedQuota,
  resolveOrdersRemaining,
} from "../src/features/Budgets/lib/quota";
import { budgetKeys } from "../src/features/Budgets/hooks/budgetKeys";
import { familyBudgetKeys } from "../src/features/Budgets/hooks/familyBudgetKeys";
import { settingKeys } from "../src/features/Settings/hooks/useSettings";
import {
  evenSplitHint,
  parseOptionalCountInput,
  parseOptionalMadInput,
  settingsFormDefault,
  toSettingsInput,
} from "../src/features/Settings/config/settingSchemas";
import { toCreateFamilyInput } from "../src/features/Families/config/familySchemas";
import { orderCartInvalidationKeys } from "../src/features/OrderCart/hooks/useOrderCart";
import { getLocalizedOrderLimitError } from "../src/features/Budgets/lib/orderLimitErrors";
import { KafilApiError } from "../src/services/apiError";

describe("family order limits settings conversion", () => {
  test("empty means unlimited global default and never coerces to zero", () => {
    expect(parseOptionalMadInput("")).toBeNull();
    expect(parseOptionalMadInput("   ")).toBeNull();
    expect(parseOptionalCountInput("")).toBeNull();
    const input = toSettingsInput({
      targetMad: "10000.00",
      pendingContributionExpiryHours: 72,
      formFillEnabled: false,
      timeZone: "Africa/Casablanca",
      defaultMaxOrders: "",
      defaultMaxPerOrderMad: "",
      defaultMonthlyMad: "",
    });
    expect(input.defaultMaxOrdersPerMonth).toBeNull();
    expect(input.defaultMaxBudgetPerOrderMinor).toBeNull();
    expect(input.defaultMonthlyBudgetMinor).toBeNull();
  });

  test("parses explicit globals and round-trips through defaults", () => {
    const input = toSettingsInput({
      targetMad: "10000.00",
      pendingContributionExpiryHours: 72,
      formFillEnabled: true,
      timeZone: "Africa/Casablanca",
      defaultMaxOrders: "4",
      defaultMaxPerOrderMad: "3000.00",
      defaultMonthlyMad: "6000.00",
    });
    expect(input.defaultMaxOrdersPerMonth).toBe(4);
    expect(input.defaultMaxBudgetPerOrderMinor).toBe(300_000);
    expect(input.defaultMonthlyBudgetMinor).toBe(600_000);
    const defaults = settingsFormDefault(
      {
        familyFundingTargetMinor: 1_000_000,
        pendingContributionExpiryHours: 72,
        formFillEnabled: true,
        defaultMaxOrdersPerMonth: 4,
        defaultMaxBudgetPerOrderMinor: 300_000,
        defaultMonthlyBudgetMinor: 600_000,
      },
      "Africa/Casablanca",
    );
    expect(defaults.defaultMaxOrders).toBe("4");
    expect(defaults.defaultMaxPerOrderMad).toBe("3000.00");
    expect(defaults.defaultMonthlyMad).toBe("6000.00");
    const unlimited = settingsFormDefault({
      familyFundingTargetMinor: 1_000_000,
      formFillEnabled: false,
      defaultMaxOrdersPerMonth: null,
      defaultMaxBudgetPerOrderMinor: null,
      defaultMonthlyBudgetMinor: null,
    });
    expect(unlimited.defaultMaxOrders).toBe("");
  });

  test("computes integer-only even-split hint with remainder", () => {
    expect(evenSplitHint(600_000, 4)).toEqual({
      quotientMinor: 150_000,
      remainderMinor: 0,
    });
    expect(evenSplitHint(600_000, 7)).toEqual({
      quotientMinor: 85_714,
      remainderMinor: 2,
    });
    expect(evenSplitHint(null, 4)).toBeNull();
    expect(evenSplitHint(600_000, null)).toBeNull();
  });
});

describe("family order limits create conversion", () => {
  test("empty limit inputs stay omitted for server-side inheritance", () => {
    const input = toCreateFamilyInput({
      name: "Guardian",
      email: "guardian@example.test",
      guardianCin: "AB123456",
      guardianDateOfBirth: "1990-01-01",
      relationshipToChildren: "",
      phone: "+212600000000",
      housingSituation: "owned",
      registrationDate: "2026-01-01",
      supportPriority: "normal",
      activationTargetMad: "10000.00",
      maxOrdersPerMonthInput: "",
      monthlyBudgetMadInput: "",
      notes: "",
      deliveryLocation: { address: "123 Test Street", latitude: null, longitude: null },
      initialChildren: [],
    } as never);
    expect(input.maxOrdersPerMonth).toBeUndefined();
    expect(input.maxBudgetPerOrderMinor).toBeUndefined();
    expect(input.monthlyBudgetMinor).toBeUndefined();
  });
});

describe("family order limits quota math", () => {
  test("maps server limit conflicts to locale keys and hides unrelated errors", () => {
    const translate = (key: string) => `translated:${key}`;
    expect(
      getLocalizedOrderLimitError(
        new KafilApiError("Monthly order count limit reached"),
        translate,
        "fallback",
      ),
    ).toBe("translated:operator.budgets.denialCount");
    expect(
      getLocalizedOrderLimitError(
        new Error("sensitive internal detail"),
        translate,
        "fallback",
      ),
    ).toBe("fallback");
  });

  test("does not append a second currency label to formatted money", async () => {
    for (const locale of ["en", "fr", "ar", "es"]) {
      const source = await Bun.file(
        new URL(`../../../packages/server/src/locales/${locale}.json`, import.meta.url),
      ).text();
      const messages = JSON.parse(source);
      expect(messages.ui.operator.settings.evenSplitHint).not.toMatch(/MAD|درهم/);
      expect(messages.ui.operator.budgets.perOrderUpTo).not.toMatch(/MAD|درهم/);
      expect(messages.ui.family.orderCart.quotaRemaining).not.toMatch(/MAD|درهم/);
    }
  });

  test("clamps remaining at zero and handles unlimited combinations", () => {
    expect(resolveOrdersRemaining({ ordersLimit: 3, ordersUsed: 1 })).toBe(2);
    expect(resolveOrdersRemaining({ ordersLimit: 2, ordersUsed: 5 })).toBe(0);
    expect(
      resolveOrdersRemaining({ ordersLimit: null, ordersUsed: 5 }),
    ).toBeNull();
    expect(clampNonNegative(Number.NaN)).toBe(0);
    expect(hasAnyQuota({ ordersLimit: null, maxPerOrderMinor: null })).toBe(
      false,
    );
    expect(hasAnyQuota({ ordersLimit: 2, maxPerOrderMinor: null })).toBe(true);
    expect(
      isUnlimitedQuota({ ordersLimit: null, maxPerOrderMinor: null }),
    ).toBe(true);
  });

  test("invalidates every affected React Query family", async () => {
    const queryClient = new QueryClient();
    const operatorSummary = [...budgetKeys.all, "family-1"];
    const familySummary = [...familyBudgetKeys.summary];
    const settings = [...settingKeys.all];
    queryClient.setQueryData(operatorSummary, { availableMinor: 0 });
    queryClient.setQueryData(familySummary, { availableMinor: 0 });
    queryClient.setQueryData(settings, { familyFundingTargetMinor: 0 });

    await queryClient.invalidateQueries({ queryKey: budgetKeys.all });
    await queryClient.invalidateQueries({ queryKey: familyBudgetKeys.all });
    expect(queryClient.getQueryState(operatorSummary)?.isInvalidated).toBe(
      true,
    );
    expect(queryClient.getQueryState(familySummary)?.isInvalidated).toBe(true);

    expect(orderCartInvalidationKeys).toContain(budgetKeys.all);
    expect(orderCartInvalidationKeys).toContain(familyBudgetKeys.all);
  });
});
