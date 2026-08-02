import { expect, test, type Page } from "@playwright/test";
import { createHmac } from "node:crypto";
import { pool } from "@kafil/server/database";

import { phase6BrowserPassword, phase6BrowserUsers } from "../../scripts/phase6-e2e-fixtures";

const baseUrl = process.env.KAFIL_E2E_BASE_URL ?? "http://127.0.0.1:3210";
const otpEmail = "plan-otp-browser@example.test";
const otpPassword = "PlanBrowserPass1!";
const otpCode = "482731";

function json(route: Parameters<Parameters<Page["route"]>[1]>[0], value: unknown) {
  return route.fulfill({ contentType: "application/json", body: JSON.stringify(value) });
}

async function useRole(page: Page, role: keyof typeof phase6BrowserUsers) {
  await page.context().addCookies([{ name: "kafil-ui-language", value: "en", url: baseUrl }]);
  await page.goto("/login");
  await page.getByLabel("Email or phone").fill(phase6BrowserUsers[role]);
  await page.getByPlaceholder("Enter your password").fill(phase6BrowserPassword);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL(/\/dashboard$/);
  await page.waitForLoadState("networkidle");
}

async function expectNoHorizontalOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }))).toEqual(await page.evaluate(() => ({
    documentWidth: document.documentElement.clientWidth,
    viewportWidth: window.innerWidth,
  })));
}

test.describe.serial("root PLAN acceptance", () => {
  test.afterAll(async () => {
    const user = await pool.query<{ id: string }>(
      "SELECT id FROM users WHERE lower(email) = lower($1)",
      [otpEmail],
    );
    const userId = user.rows[0]?.id;
    if (userId) {
      await pool.query("DELETE FROM sponsor_email_otp_challenges WHERE user_id = $1", [userId]);
      await pool.query("DELETE FROM credential_setup_sessions WHERE user_id = $1", [userId]);
      await pool.query("DELETE FROM tokens WHERE user_id = $1", [userId]);
      await pool.query("DELETE FROM sponsor_profiles WHERE user_id = $1", [userId]);
      await pool.query("DELETE FROM users WHERE id = $1", [userId]);
    }
    await pool.end();
  });

  test("family contribution history is canonical, private, read-only, mobile, and RTL", async ({ page }) => {
    await page.route("**/api/contributions**", (route) => json(route, [{
      id: "contribution-family-1",
      amountMinor: 125_000,
      currency: "MAD",
      externalReference: "SAFE-REF-2026",
      status: "validated",
      submittedAt: "2026-07-01T10:00:00.000Z",
      paidAt: "2026-07-01T10:00:00.000Z",
      expiresAt: null,
      expiredAt: null,
      validatedAt: "2026-07-02T10:00:00.000Z",
      rejectedAt: null,
      createdAt: "2026-07-01T10:00:00.000Z",
    }]));
    await useRole(page, "family");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/contribution");
    await expect(page.getByRole("heading", { name: "Contribution history" })).toBeVisible();
    await expect(page.getByText("SAFE-REF-2026").first()).toBeVisible();
    await expect(page.getByText("Private Sponsor Name")).toHaveCount(0);
    await expect(page.getByText("Bank transfer")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "View" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Record contribution" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Validate and credit" })).toHaveCount(0);
    await expectNoHorizontalOverflow(page);

    await page.context().addCookies([{ name: "kafil-ui-language", value: "ar", url: baseUrl }]);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByText("SAFE-REF-2026").first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("family order cards stay compact and private at all requested widths", async ({ page }) => {
    await page.route("**/api/orders/me**", (route) => json(route, [{
      id: "order-family-1",
      orderNumber: "K-PLAN-001",
      status: "pending",
      totalMinor: 88_000,
      articleCount: 4,
      requestedTotalMinor: 88_000,
      actualTotalMinor: null,
      differenceMinor: null,
      merchantName: null,
      purchasedAt: null,
      receiptRecorded: false,
      deliveryStartedAt: null,
      deliveryAssigned: true,
      deliveryName: "Amina Delivery",
      deliveredAt: null,
      deliveryProofRecorded: false,
      assisted: false,
      currency: "MAD",
      createdAt: "2026-07-01T10:00:00.000Z",
      updatedAt: "2026-07-01T10:00:00.000Z",
      cancellationReason: null,
      guardianLegalNameSnapshot: "Private Guardian",
      deliveryPhoneSnapshot: "+212600000000",
      deliveryAddressSnapshot: "Private family address",
      familyImage: null,
      dominantCategoryName: "Food essentials",
      dominantCategoryImage: null,
    }]));
    await useRole(page, "family");

    for (const width of [375, 390, 430]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("/orders");
      await expect(page.getByText("K-PLAN-001").first()).toBeVisible();
      await expect(page.getByText("Amina Delivery").first()).toBeVisible();
      await expect(page.getByText("Private Guardian")).toHaveCount(0);
      await expect(page.getByText("+212600000000")).toHaveCount(0);
      await expect(page.getByText("Private family address")).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Track" }).first()).toBeVisible();
      await expect(page.getByRole("button", { name: "Cancel" }).first()).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }

    await page.context().addCookies([{ name: "kafil-ui-language", value: "ar", url: baseUrl }]);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByText("K-PLAN-001").first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("family 12-month chart fits 320 through 430 pixels without scrolling", async ({ page }) => {
    const months = Array.from({ length: 12 }, (_, index) => ({
      month: `2025-${String(index + 1).padStart(2, "0")}`,
      spentMinor: (index + 1) * 10_000,
    }));
    await page.route("**/api/dashboard/family", (route) => json(route, {
      displayName: "Plan family",
      counts: { children: 0, activeChildren: 0, openOrders: 1, deliveredOrders: 2 },
      budget: { availableMinor: 100_000, reservedMinor: 20_000, spentMinor: 300_000 },
      orderTrend: months,
      orderStatuses: [],
      recentOrders: [],
      recentSponsorContributions: [],
    }));
    await page.route("**/api/families/me", (route) => json(route, {
      id: "family-browser", userId: "phase6_browser_family", name: "Plan family",
      email: phase6BrowserUsers.family, image: null, status: "active",
      relationshipToChildren: null, guardianLegalName: "Plan guardian",
      exactAddress: "Plan address", phone: null,
    }));
    await page.route("**/api/children/me", (route) => json(route, []));
    await useRole(page, "family");

    for (const width of [320, 375, 390, 430]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/dashboard");
      const chart = page.getByRole("img", { name: "Order activity — last 12 months" });
      await expect(chart).toBeVisible();
      await expect(chart.locator(":scope > div")).toHaveCount(12);
      await expectNoHorizontalOverflow(page);
    }

    await page.context().addCookies([{ name: "kafil-ui-language", value: "ar", url: baseUrl }]);
    await page.setViewportSize({ width: 375, height: 900 });
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("img", { name: "نشاط الطلبات — آخر 12 شهرًا" }).locator(":scope > div")).toHaveCount(12);
    await expectNoHorizontalOverflow(page);
  });

  test("new pending sponsor completes the OTP activation login", async ({ page }) => {
    await page.goto("/register/sponsor");
    await page.getByLabel("Full name").fill("Plan OTP Sponsor");
    await page.getByLabel("Email address").fill(otpEmail);
    await page.getByPlaceholder("At least 8 characters").fill(otpPassword);
    await page.getByPlaceholder("Repeat your password").fill(otpPassword);
    await page.getByRole("button", { name: "Create account and send code" }).click();
    await expect(page.getByText("Check your email")).toBeVisible();
    await page.getByRole("link", { name: "Sign in to activate your account" }).click();
    await page.getByLabel("Email or phone").fill(otpEmail.toUpperCase());
    await page.getByPlaceholder("Enter your password").fill(otpPassword);
    await page.getByText("Remember me", { exact: true }).click();
    await page.getByRole("button", { name: "Log in" }).click();
    await page.waitForURL(/\/verify-email$/);
    await expect(page.getByText("Verify your email")).toBeVisible();

    const key = process.env.NAJM_ENCRYPTION_KEY;
    if (!key) throw new Error("NAJM_ENCRYPTION_KEY is required for OTP browser acceptance.");
    const codeHash = createHmac("sha256", Buffer.from(key, "hex")).update(otpCode).digest("hex");
    await pool.query(
      `UPDATE sponsor_email_otp_challenges c
       SET code_hash = $1, expires_at = now() + interval '10 minutes', attempts_remaining = 5
       FROM users u
       WHERE c.user_id = u.id AND lower(u.email) = lower($2)`,
      [codeHash, otpEmail],
    );

    await page.getByLabel("One-time code 1 of 6").fill(otpCode);
    await page.getByRole("button", { name: "Verify and continue" }).click();
    await page.waitForURL(/\/dashboard$/);
    const active = await pool.query<{ status: string; email_verified: boolean }>(
      "SELECT status, email_verified FROM users WHERE lower(email) = lower($1)",
      [otpEmail],
    );
    expect(active.rows).toEqual([{ status: "active", email_verified: true }]);
  });
});
