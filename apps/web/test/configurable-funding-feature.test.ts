import { describe, expect, test } from "bun:test";

import {
  fundingSettingFormSchema,
  fundingTargetDefaultValue,
  toFundingSettingInput,
} from "../src/features/Settings/config/settingSchemas";
import { fundingProgressPercent } from "../src/shared/FundingProgressCard";
import { getDashboardNavigation } from "../src/shared/DashboardShell";

describe("configurable family funding web contracts", () => {
  test("converts the operator-entered MAD target to minor units", () => {
    const values = fundingSettingFormSchema.parse({
      targetMad: "3500.50",
      reason: "Update the funding policy",
    });

    expect(toFundingSettingInput(values)).toEqual({
      familyFundingTargetMinor: 350050,
      reason: "Update the funding policy",
    });
    expect(fundingTargetDefaultValue(350050)).toBe("3500.50");
  });

  test("rejects empty, zero, negative, and unsafe targets", () => {
    for (const targetMad of ["", "0", "-10", "999999999999999999999"]) {
      expect(
        fundingSettingFormSchema.safeParse({
          targetMad,
          reason: "Invalid funding target",
        }).success,
      ).toBe(false);
    }
  });

  test("shows bounded progress from the configured target", () => {
    expect(
      fundingProgressPercent({
        status: "pending_funding",
        targetMinor: 300000,
        fundedMinor: 75000,
        remainingMinor: 225000,
        activatedAt: null,
      }),
    ).toBe(25);
    expect(
      fundingProgressPercent({
        status: "active",
        targetMinor: 300000,
        fundedMinor: 400000,
        remainingMinor: 0,
        activatedAt: "2026-07-18T00:00:00.000Z",
      }),
    ).toBe(100);
  });

  test("adds the operator settings route to navigation", () => {
    const t = ((key: string) => key) as Parameters<
      typeof getDashboardNavigation
    >[1];
    expect(
      getDashboardNavigation("operator", t).map((item) => item.href),
    ).toContain("/operator/settings");
  });
});
