import { describe, expect, it } from "bun:test";

import {
  assertDemoAccessEnvironment,
  isDemoAccessAccount,
  validateDemoAccessPassword,
} from "../src/demo-access";

describe("demo account access", () => {
  it("refuses production but permits an unset or development environment", () => {
    expect(() => assertDemoAccessEnvironment({})).not.toThrow();
    expect(() =>
      assertDemoAccessEnvironment({ NODE_ENV: "development" }),
    ).not.toThrow();
    expect(() =>
      assertDemoAccessEnvironment({ NODE_ENV: "production" }),
    ).toThrow("disabled in production");
  });

  it("allows only linked demo sponsors and delivery staff", () => {
    expect(
      isDemoAccessAccount({
        email: "sponsor.001@demo.kafil.test",
        role: "sponsor",
        sponsorProfileId: "sponsor-profile",
        staffProfileId: null,
      }),
    ).toBe(true);
    expect(
      isDemoAccessAccount({
        email: "delivery.001@demo.kafil.test",
        role: "delivery",
        sponsorProfileId: null,
        staffProfileId: "staff-profile",
      }),
    ).toBe(true);
    for (const account of [
      {
        email: "admin@demo.kafil.test",
        role: "admin",
        sponsorProfileId: null,
        staffProfileId: null,
      },
      {
        email: "sponsor@example.test",
        role: "sponsor",
        sponsorProfileId: "sponsor-profile",
        staffProfileId: null,
      },
      {
        email: "delivery.001@demo.kafil.test",
        role: "delivery",
        sponsorProfileId: null,
        staffProfileId: null,
      },
    ]) {
      expect(isDemoAccessAccount(account)).toBe(false);
    }
  });

  it("validates a strong matching password without exposing it in arguments", () => {
    expect(validateDemoAccessPassword("DemoAccess1", "DemoAccess1")).toBe(
      "DemoAccess1",
    );
    expect(() => validateDemoAccessPassword("short", "short")).toThrow(
      "at least 8",
    );
    expect(() => validateDemoAccessPassword("DemoAccess1", "DemoAccess2")).toThrow(
      "match exactly",
    );
  });
});
