import { describe, expect, test } from "bun:test";

import {
  familyFirstPasswordSchema,
  loginSchema,
  sponsorRegistrationSchema,
} from "../src/features/Auth/config/authSchemas";
import { getPostLoginRoute } from "../src/features/Auth/lib/getPostLoginRoute";
import { getRoleHome } from "../src/lib/roleRoutes";
import { getSafeRedirectPath } from "../src/lib/safeRedirect";

describe("Phase 6A role routing", () => {
  test.each([
    ["admin", "/operator"],
    ["operator", "/operator"],
    ["family", "/family"],
    ["sponsor", "/sponsor"],
    [null, "/forbidden"],
    ["unknown", "/forbidden"],
  ])("maps %p to %s", (role, expected) => {
    expect(getRoleHome(role)).toBe(expected);
  });
});

describe("Phase 6A safe redirects", () => {
  test("keeps an internal application route", () => {
    expect(getSafeRedirectPath("/family/orders?status=pending")).toBe(
      "/family/orders?status=pending",
    );
  });

  test.each([
    "https://attacker.example",
    "//attacker.example",
    "/api/auth/session",
    "/login?from=/operator",
    "/_next/static/app.js",
    "/assets/logo.svg",
  ])("rejects unsafe redirect %s", (path) => {
    expect(getSafeRedirectPath(path)).toBe("/dashboard");
  });
});

describe("Phase 6A authentication schemas", () => {
  test("accepts a valid login payload", () => {
    expect(
      loginSchema.safeParse({
        identifier: "sponsor@example.com",
        password: "Password1",
      }).success,
    ).toBe(true);
    expect(
      loginSchema.safeParse({
        identifier: "+212612345678",
        password: "Password1",
      }).success,
    ).toBe(true);
  });

  test("requires the Najm password contract and matching confirmation", () => {
    expect(
      sponsorRegistrationSchema.safeParse({
        name: "Kafil Sponsor",
        email: "sponsor@example.com",
        password: "weak",
        confirmPassword: "different",
      }).success,
    ).toBe(false);

    expect(
      sponsorRegistrationSchema.safeParse({
        name: "Kafil Sponsor",
        email: "sponsor@example.com",
        password: "StrongPass1",
        confirmPassword: "StrongPass1",
      }).success,
    ).toBe(true);
  });

  test("accepts a simple lowercase family password with matching confirmation", () => {
    expect(
      familyFirstPasswordSchema.safeParse({
        currentPassword: "Amrani1987",
        newPassword: "fatima2026",
        confirmPassword: "fatima2026",
      }).success,
    ).toBe(true);
    expect(
      familyFirstPasswordSchema.safeParse({
        currentPassword: "Amrani1987",
        newPassword: "Fatima2026",
        confirmPassword: "Fatima2026",
      }).success,
    ).toBe(false);
  });

  test("routes a required family password change before the dashboard", () => {
    expect(getPostLoginRoute(true, "/family/orders")).toBe(
      "/change-password",
    );
    expect(getPostLoginRoute(false, "/family/orders")).toBe(
      "/family/orders",
    );
  });
});
