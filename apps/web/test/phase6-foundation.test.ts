import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import {
  familyFirstPasswordSchema,
  loginSchema,
} from "../src/features/Auth/config/authSchemas";
import { getPostLoginRoute } from "../src/features/Auth/lib/getPostLoginRoute";
import { resolveDashboard } from "../src/features/Dashboard/resolveDashboard";
import { getSafeRedirectPath } from "najm-auth/client/server";

describe("Phase 6A dashboard selection", () => {
  test.each([
    ["admin", "admin"],
    ["operator", "admin"],
    ["family", "family"],
    ["sponsor", "sponsor"],
    [null, null],
    ["unknown", null],
  ] as const)("selects %p as %s", (role, expected) => {
    expect(resolveDashboard(role)).toBe(expected);
  });
});

describe("Phase 6A safe redirects", () => {
  test("keeps an internal application route", () => {
    expect(getSafeRedirectPath("/orders?status=pending")).toBe(
      "/orders?status=pending",
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
      loginSchema.parse({
        identifier: "sponsor@example.com",
        password: "Password1",
      }),
    ).toEqual({
      identifier: "sponsor@example.com",
      password: "Password1",
      rememberMe: false,
    });
    expect(
      loginSchema.safeParse({
        identifier: "+212612345678",
        password: "Password1",
        rememberMe: true,
      }).success,
    ).toBe(true);
  });

  test("accepts a simple lowercase family password with matching confirmation", () => {
    expect(
      familyFirstPasswordSchema.safeParse({
        newPassword: "fatima2026",
        confirmPassword: "fatima2026",
      }).success,
    ).toBe(true);
    expect(
      familyFirstPasswordSchema.safeParse({
        newPassword: "Fatima2026",
        confirmPassword: "Fatima2026",
      }).success,
    ).toBe(false);
  });

  test("does not allow a CIN-shaped permanent family password", () => {
    expect(
      familyFirstPasswordSchema.safeParse({
        newPassword: "ab123456",
        confirmPassword: "ab123456",
      }).success,
    ).toBe(false);
  });

  test("routes a setup-only login before the dashboard", () => {
    expect(getPostLoginRoute("credential_setup", "/orders")).toBe(
      "/change-password",
    );
    expect(getPostLoginRoute("authenticated", "/orders")).toBe(
      "/orders",
    );
  });

  test("lets a family revoke the setup session and return to sign in", () => {
    const source = readFileSync(
      new URL(
        "../src/features/Auth/components/FamilyFirstPasswordForm.tsx",
        import.meta.url,
      ),
      "utf8",
    );

    expect(source).toContain("async function handleSignOut()");
    expect(source).toContain("await cancelCredentialSetup()");
    expect(source).toContain('window.location.replace("/login")');
    expect(source).not.toContain("auth.client.logout()");
    expect(source).toContain('t("action.signOut")');
  });

  test("keeps setup-only sessions outside the dashboard auth boundary", () => {
    const authSource = readFileSync(
      new URL("../src/lib/auth.ts", import.meta.url),
      "utf8",
    );
    const dashboardLayoutSource = readFileSync(
      new URL("../src/app/(dashboard)/layout.tsx", import.meta.url),
      "utf8",
    );
    const changePasswordPageSource = readFileSync(
      new URL(
        "../src/app/(first-login)/change-password/page.tsx",
        import.meta.url,
      ),
      "utf8",
    );

    expect(authSource).toMatch(/publicRoutes:[\s\S]*"\/change-password"/);
    expect(authSource).toContain('"/auth/oauth/callback"');
    expect(dashboardLayoutSource).not.toContain(
      "FamilyPasswordRequirementGuard",
    );
    expect(changePasswordPageSource).toContain("<FamilyFirstPasswordForm />");
    expect(changePasswordPageSource).not.toContain("next/headers");
    expect(changePasswordPageSource).not.toContain("next/navigation");
    expect(changePasswordPageSource).not.toContain(
      '"kafil.family-setup"',
    );
  });

  test("wires Google OAuth through Najm without bypassing sponsor onboarding", () => {
    const loginSource = readFileSync(
      new URL(
        "../src/features/Auth/components/LoginForm.tsx",
        import.meta.url,
      ),
      "utf8",
    );
    const callbackSource = readFileSync(
      new URL("../src/app/auth/oauth/callback/page.tsx", import.meta.url),
      "utf8",
    );

    expect(loginSource).toContain("GoogleLoginButton");
    expect(loginSource).toContain("<GoogleMark />");
    expect(loginSource).toContain("returnTo={redirectTo}");
    expect(callbackSource).toContain("OAuthCallback");
    expect(callbackSource).toContain('defaultRedirect="/dashboard"');
  });

  test("uses a document navigation after login changes auth cookies", () => {
    const loginSource = readFileSync(
      new URL(
        "../src/features/Auth/components/LoginForm.tsx",
        import.meta.url,
      ),
      "utf8",
    );
    const dashboardShellSource = readFileSync(
      new URL("../src/shared/DashboardShell/index.tsx", import.meta.url),
      "utf8",
    );

    expect(loginSource).toContain("window.location.replace(");
    expect(loginSource).not.toContain("router.refresh()");
    expect(dashboardShellSource).toContain(
      'window.location.replace("/login")',
    );
  });

  test("uses the themed Najm select for the auth language menu", () => {
    const source = readFileSync(
      new URL("../src/app/(auth)/AuthLanguageSelector.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain("<SelectTrigger");
    expect(source).toContain("<SelectContent");
    expect(source).toContain("<SelectItem");
    expect(source).not.toContain("<select");
    expect(source).not.toContain("<option");
  });
});
