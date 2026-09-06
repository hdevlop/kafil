import { describe, expect, it } from "bun:test";
import { getMcpTools } from "najm-mcp";
import { getValidationConfig } from "najm-validation";

import {
  BudgetController,
  resetMonthlyBudgetLimitDto,
  resolveOrderPolicy,
  setFamilyOrderPolicyDto,
} from "../src/modules/budgets";
import { createFamilyDto } from "../src/modules/families";
import {
  nullableMaxOrdersPerMonthDto,
  updateSettingsDto,
} from "../src/modules/settings/settingDto";

describe("family order limits DTO boundaries", () => {
  it("treats nullable and omitted global defaults as inheritance", () => {
    const base = {
      familyFundingTargetMinor: 1_000_000,
      pendingContributionExpiryHours: 72,
      formFillEnabled: false,
    };
    expect(updateSettingsDto.parse(base)).toEqual(base);
    expect(
      updateSettingsDto.parse({
        ...base,
        defaultMaxOrdersPerMonth: null,
        defaultMaxBudgetPerOrderMinor: null,
        defaultMonthlyBudgetMinor: null,
      }),
    ).toMatchObject({
      defaultMaxOrdersPerMonth: null,
      defaultMaxBudgetPerOrderMinor: null,
      defaultMonthlyBudgetMinor: null,
    });
    expect(
      updateSettingsDto.parse({
        ...base,
        defaultMaxOrdersPerMonth: 4,
        defaultMaxBudgetPerOrderMinor: 300_000,
        defaultMonthlyBudgetMinor: 600_000,
      }),
    ).toMatchObject({
      defaultMaxOrdersPerMonth: 4,
      defaultMaxBudgetPerOrderMinor: 300_000,
      defaultMonthlyBudgetMinor: 600_000,
    });
  });

  it("rejects invalid count and money boundaries", () => {
    expect(nullableMaxOrdersPerMonthDto.safeParse(0).success).toBe(false);
    expect(nullableMaxOrdersPerMonthDto.safeParse(-1).success).toBe(false);
    expect(nullableMaxOrdersPerMonthDto.safeParse(32).success).toBe(false);
    expect(nullableMaxOrdersPerMonthDto.safeParse(4).success).toBe(true);
    expect(
      updateSettingsDto.safeParse({
        familyFundingTargetMinor: 1_000_000,
        pendingContributionExpiryHours: 72,
        formFillEnabled: false,
        defaultMaxBudgetPerOrderMinor: 0,
      }).success,
    ).toBe(false);
    expect(
      updateSettingsDto.safeParse({
        familyFundingTargetMinor: 1_000_000,
        pendingContributionExpiryHours: 72,
        formFillEnabled: false,
        defaultMaxBudgetPerOrderMinor: -5,
      }).success,
    ).toBe(false);
    expect(
      updateSettingsDto.safeParse({
        familyFundingTargetMinor: 1_000_000,
        pendingContributionExpiryHours: 72,
        formFillEnabled: false,
        defaultMonthlyBudgetMinor: 1.5,
      }).success,
    ).toBe(false);
    expect(
      updateSettingsDto.safeParse({
        familyFundingTargetMinor: 1_000_000,
        pendingContributionExpiryHours: 72,
        formFillEnabled: false,
        defaultMonthlyBudgetMinor: Number.MAX_SAFE_INTEGER + 1,
      }).success,
    ).toBe(false);
  });

  it("requires a valid first-of-month date and reason for monthly reset", () => {
    expect(
      resetMonthlyBudgetLimitDto.safeParse({
        month: "2026-09-02",
        reason: "Back to global",
      }).success,
    ).toBe(false);
    expect(
      resetMonthlyBudgetLimitDto.safeParse({
        month: "2026-09-01",
        reason: "ok",
      }).success,
    ).toBe(false);
    expect(
      resetMonthlyBudgetLimitDto.parse({
        month: "2026-09-01",
        reason: "Back to global default",
      }),
    ).toEqual({ month: "2026-09-01", reason: "Back to global default" });
  });

  it("accepts null policy overrides to restore inheritance with a reason", () => {
    expect(
      setFamilyOrderPolicyDto.parse({
        maxOrdersPerMonth: null,
        maxBudgetPerOrderMinor: null,
        reason: "Restore global inheritance",
      }),
    ).toEqual({
      maxOrdersPerMonth: null,
      maxBudgetPerOrderMinor: null,
      reason: "Restore global inheritance",
    });
    expect(
      setFamilyOrderPolicyDto.safeParse({
        maxOrdersPerMonth: 0,
        reason: "Invalid count",
      }).success,
    ).toBe(false);
    expect(
      setFamilyOrderPolicyDto.safeParse({
        maxOrdersPerMonth: 32,
        reason: "Invalid count",
      }).success,
    ).toBe(false);
    expect(
      setFamilyOrderPolicyDto.safeParse({
        maxBudgetPerOrderMinor: 0,
        reason: "Invalid money",
      }).success,
    ).toBe(false);
  });

  it("extends family creation with the same nullish policy boundaries", () => {
    const base = {
      name: "Guardian Name",
      email: "family@example.test",
      guardianCin: "AB123456",
      guardianDateOfBirth: "1990-01-01",
      exactAddress: "123 Test Street, Casablanca",
      phone: "+212612345678",
      housingSituation: "owned",
      registrationDate: "2026-01-01",
      supportPriority: "normal",
    };
    const parsed = createFamilyDto.parse({
      ...base,
      maxOrdersPerMonth: 2,
      maxBudgetPerOrderMinor: 300_000,
      monthlyBudgetMinor: 600_000,
    });
    expect(parsed.maxOrdersPerMonth).toBe(2);
    expect(parsed.maxBudgetPerOrderMinor).toBe(300_000);
    expect(parsed.monthlyBudgetMinor).toBe(600_000);
    const omitted = createFamilyDto.parse(base);
    expect(omitted.maxOrdersPerMonth).toBeUndefined();
    expect(omitted.maxBudgetPerOrderMinor).toBeUndefined();
    expect(omitted.monthlyBudgetMinor).toBeUndefined();
    expect(
      createFamilyDto.safeParse({ ...base, maxOrdersPerMonth: 0 }).success,
    ).toBe(false);
  });
});

describe("family order policy resolution", () => {
  it("prefers explicit family overrides over globals", () => {
    const policy = resolveOrderPolicy(
      { id: "a", maxOrdersPerMonth: 3, maxBudgetPerOrderMinor: 1000 },
      { limitMinor: 5000 },
      {
        defaultMaxOrdersPerMonth: 4,
        defaultMaxBudgetPerOrderMinor: 3000,
        defaultMonthlyBudgetMinor: 6000,
      },
    );
    expect(policy.maxOrders).toBe(3);
    expect(policy.maxOrdersSource).toBe("family");
    expect(policy.maxPerOrderMinor).toBe(1000);
    expect(policy.maxPerOrderSource).toBe("family");
    expect(policy.monthlyLimitMinor).toBe(5000);
    expect(policy.monthlySource).toBe("family");
  });

  it("inherits globals when family values are absent", () => {
    const policy = resolveOrderPolicy(
      { id: "a", maxOrdersPerMonth: null, maxBudgetPerOrderMinor: null },
      null,
      {
        defaultMaxOrdersPerMonth: 4,
        defaultMaxBudgetPerOrderMinor: 3000,
        defaultMonthlyBudgetMinor: 6000,
      },
    );
    expect(policy.maxOrders).toBe(4);
    expect(policy.maxOrdersSource).toBe("global");
    expect(policy.maxPerOrderMinor).toBe(3000);
    expect(policy.monthlyLimitMinor).toBe(6000);
    expect(policy.monthlySource).toBe("global");
  });

  it("treats doubly-absent values as unlimited", () => {
    const policy = resolveOrderPolicy(
      { id: "a", maxOrdersPerMonth: null, maxBudgetPerOrderMinor: null },
      null,
      {
        defaultMaxOrdersPerMonth: null,
        defaultMaxBudgetPerOrderMinor: null,
        defaultMonthlyBudgetMinor: null,
      },
    );
    expect(policy.maxOrders).toBeNull();
    expect(policy.maxPerOrderMinor).toBeNull();
    expect(policy.monthlyLimitMinor).toBeNull();
    expect(policy.maxOrdersSource).toBe("unlimited");
  });
});

describe("family order limits MCP and validation", () => {
  it("exposes the new policy tools with confirmation metadata", () => {
    const tools = getMcpTools(BudgetController);
    const byKey = new Map(tools.map((tool) => [tool.methodKey, tool]));
    expect(byKey.has("setOrderPolicy")).toBe(true);
    expect(byKey.has("resetMonthlyLimit")).toBe(true);
    expect(
      getValidationConfig(BudgetController.prototype, "setOrderPolicy"),
    ).toMatchObject({
      body: setFamilyOrderPolicyDto,
    });
    expect(
      getValidationConfig(BudgetController.prototype, "resetMonthlyLimit"),
    ).toMatchObject({
      body: resetMonthlyBudgetLimitDto,
    });
  });
});
