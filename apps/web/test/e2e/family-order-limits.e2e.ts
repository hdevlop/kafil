import { expect, test, type Locator, type Page } from "@playwright/test";

import {
  phase6BrowserPassword,
  phase6BrowserUsers,
} from "../../scripts/phase6-e2e-fixtures";

const _evidenceDirectory = "../../docs/evidence/family-order-limits";

test.setTimeout(300_000);

async function waitForReactHandler(
  target: Locator,
  eventName: "onClick" | "onSubmit",
) {
  await expect
    .poll(
      () =>
        target.evaluate((element, handlerName) => {
          const propsKey = Object.keys(element).find((key) =>
            key.startsWith("__reactProps$"),
          );
          if (!propsKey) return false;
          const props = (
            element as unknown as Record<string, Record<string, unknown>>
          )[propsKey];
          return typeof props?.[handlerName] === "function";
        }, eventName),
      { timeout: 120_000 },
    )
    .toBe(true);
}

async function login(page: Page, email: string, password: string) {
  await page.goto("/login", { waitUntil: "commit" });
  await waitForReactHandler(page.locator("form#login-form"), "onSubmit");
  await page.getByLabel("Email or phone").fill(email);
  await page.getByPlaceholder("Enter your password").fill(password);
  const loginResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/auth/login") &&
      response.request().method() === "POST",
  );
  const loginButton = page.getByRole("button", { name: "Log in" });
  await loginButton.click();
  const response = await loginResponse;
  if (!response.ok()) {
    throw new Error(
      `Browser login failed with ${response.status()}: ${await response.text()}`,
    );
  }
  await page.waitForURL(/\/dashboard$/);
  await page.waitForLoadState("domcontentloaded");
}

async function attachDiagnostics(page: Page) {
  const errors: string[] = [];
  const failed: string[] = [];
  const badResponses: Array<{ method: string; path: string; status: number }> =
    [];
  const allowedNegative = new Map<string, number>();
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("requestfailed", (request) =>
    failed.push(`${request.method()} ${new URL(request.url()).pathname}`),
  );
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (!url.pathname.startsWith("/api/")) return;
    if (response.status() < 400) return;
    const key = `${response.request().method()} ${url.pathname} ${response.status()}`;
    const remaining = allowedNegative.get(key) ?? 0;
    if (remaining > 0) {
      allowedNegative.set(key, remaining - 1);
      return;
    }
    badResponses.push({
      method: response.request().method(),
      path: url.pathname,
      status: response.status(),
    });
  });
  return {
    allowOnce(method: string, path: string, status: number) {
      const key = `${method} ${path} ${status}`;
      allowedNegative.set(key, (allowedNegative.get(key) ?? 0) + 1);
    },
    assertClean() {
      expect(
        badResponses,
        `unexpected HTTP errors: ${JSON.stringify(badResponses)}`,
      ).toEqual([]);
      expect(failed, `failed requests: ${failed.join(", ")}`).toEqual([]);
      const realErrors = errors.filter(
        (message) => !message.includes("ERR_ABORTED"),
      );
      expect(realErrors, `console/page errors: ${realErrors.join(" | ")}`).toEqual(
        [],
      );
    },
  };
}

test("work unit 1: admin saves global order defaults and reload persists", async ({
  page,
}) => {
  const diagnostics = await attachDiagnostics(page);
  await login(page, phase6BrowserUsers.admin, phase6BrowserPassword);

  await page.goto("/settings", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByText("Family order limits").first(),
  ).toBeVisible({ timeout: 20_000 });

  const maxOrders = page.getByLabel("Default max orders per month");
  await expect(maxOrders).toBeVisible();
  const maxPerOrder = page.getByLabel("Default max budget per order (MAD)");
  const monthly = page.getByLabel("Default monthly budget (MAD)");
  const original = {
    maxOrders: await maxOrders.inputValue(),
    maxPerOrder: await maxPerOrder.inputValue(),
    monthly: await monthly.inputValue(),
  };
  try {
    await maxOrders.fill("4");
    await maxPerOrder.fill("3000.00");
    await monthly.fill("6000.00");

    const saveResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/settings") &&
        response.request().method() === "PUT" &&
        response.ok(),
    );
    await page.getByRole("button", { name: "Save settings" }).click();
    await saveResponse;

    await page.reload({ waitUntil: "commit" });
    await expect(
      page.getByText("Family order limits").first(),
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.getByLabel("Default max orders per month")).toHaveValue(
      "4",
    );
  } finally {
    await page.getByLabel("Default max orders per month").fill(original.maxOrders);
    await page
      .getByLabel("Default max budget per order (MAD)")
      .fill(original.maxPerOrder);
    await page
      .getByLabel("Default monthly budget (MAD)")
      .fill(original.monthly);
    const restoreResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/settings") &&
        response.request().method() === "PUT" &&
        response.ok(),
    );
    await page.getByRole("button", { name: "Save settings" }).click();
    await restoreResponse;
  }
  diagnostics.assertClean();
});

test("work unit 2: operator creates a family with empty limits inheriting globals", async ({
  page,
}) => {
  const diagnostics = await attachDiagnostics(page);
  await login(page, phase6BrowserUsers.operator, phase6BrowserPassword);

  await page.goto("/operator/families", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("button", { name: "Create family" }).first(),
  ).toBeVisible({ timeout: 20_000 });

  diagnostics.assertClean();
});

test("work unit 7: settings and quota surfaces stay keyboard-reachable in RTL", async ({
  page,
}) => {
  const diagnostics = await attachDiagnostics(page);
  await page.context().addCookies([
    {
      name: "kafil-ui-language",
      value: "ar",
      url: process.env.KAFIL_E2E_BASE_URL ?? "http://127.0.0.1:3210",
    },
  ]);
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, phase6BrowserUsers.admin, phase6BrowserPassword);
  await page.goto("/settings", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  const heading = page.getByText("حدود طلبات الأسر").first();
  await expect(heading).toBeVisible({ timeout: 20_000 });
  const countInput = page.getByLabel("الحد الأقصى الافتراضي للطلبات شهريا");
  await countInput.focus();
  await expect(countInput).toBeFocused();
  diagnostics.assertClean();
});
