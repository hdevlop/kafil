import { describe, expect, test } from "bun:test";

import {
  MAX_PENDING_CONTRIBUTION_EXPIRY_HOURS,
  MIN_PENDING_CONTRIBUTION_EXPIRY_HOURS,
  settingsFormDefault,
  settingsFormSchema,
  toSettingsInput,
} from "../src/features/Settings/config/settingSchemas";
import { fundingProgressPercent } from "../src/shared/FundingProgressCard";
import { getDashboardNavigation } from "../src/shared/DashboardShell";

describe("configurable family funding web contracts", () => {
  test("converts the operator-entered MAD target, expiry hours, and form-fill flag to the API payload", () => {
    const values = settingsFormSchema.parse({
      targetMad: "3500.50",
      pendingContributionExpiryHours: "96",
      formFillEnabled: true,
      timeZone: "Africa/Casablanca",
    });

    expect(toSettingsInput(values)).toEqual({
      familyFundingTargetMinor: 350050,
      pendingContributionExpiryHours: 96,
      formFillEnabled: true,
    });
    const defaults = settingsFormDefault({
      familyFundingTargetMinor: 350050,
      pendingContributionExpiryHours: 72,
      formFillEnabled: false,
    });
    expect(defaults.targetMad).toBe("3500.50");
    expect(defaults.pendingContributionExpiryHours).toBe(72);
    expect(defaults.formFillEnabled).toBe(false);
  });

  test("rejects empty, zero, negative, and unsafe targets", () => {
    for (const targetMad of ["", "0", "-10", "999999999999999999999"]) {
      expect(
        settingsFormSchema.safeParse({
          targetMad,
          pendingContributionExpiryHours: 72,
          formFillEnabled: true,
          timeZone: "Africa/Casablanca",
        }).success,
      ).toBe(false);
    }
  });

  test("validates the pending contribution expiry hour window", () => {
    for (const hours of [
      MIN_PENDING_CONTRIBUTION_EXPIRY_HOURS,
      72,
      MAX_PENDING_CONTRIBUTION_EXPIRY_HOURS,
    ]) {
      expect(
        settingsFormSchema.safeParse({
          targetMad: "1500",
          pendingContributionExpiryHours: hours,
          formFillEnabled: false,
          timeZone: "Africa/Casablanca",
        }).success,
      ).toBe(true);
    }
    for (const hours of [
      MIN_PENDING_CONTRIBUTION_EXPIRY_HOURS - 1,
      MAX_PENDING_CONTRIBUTION_EXPIRY_HOURS + 1,
      1.5,
    ]) {
      expect(
        settingsFormSchema.safeParse({
          targetMad: "1500",
          pendingContributionExpiryHours: hours,
          formFillEnabled: false,
          timeZone: "Africa/Casablanca",
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
        pendingMinor: 0,
        remainingMinor: 225000,
        availableToContributeMinor: 225000,
        capacityStatus: "open",
        nextPendingExpiryAt: null,
        activatedAt: null,
      }),
    ).toBe(25);
    expect(
      fundingProgressPercent({
        status: "active",
        targetMinor: 300000,
        fundedMinor: 400000,
        pendingMinor: 0,
        remainingMinor: 0,
        availableToContributeMinor: 0,
        capacityStatus: "funded",
        nextPendingExpiryAt: null,
        activatedAt: "2026-07-18T00:00:00.000Z",
      }),
    ).toBe(100);
  });

  test("keeps settings out of operator page navigation", () => {
    expect(
      getDashboardNavigation("operator").map((item) => item.href),
    ).not.toContain("/settings");
  });

  test("requires an explicit form-fill flag", () => {
    expect(
      settingsFormSchema.safeParse({
        targetMad: "1000",
        pendingContributionExpiryHours: 72,
      }).success,
    ).toBe(false);
    expect(
      settingsFormSchema.safeParse({
        targetMad: "1000",
        pendingContributionExpiryHours: 72,
        formFillEnabled: "true",
      }).success,
    ).toBe(false);
  });
});
