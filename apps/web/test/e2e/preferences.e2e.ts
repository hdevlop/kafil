import { expect, test, type Locator, type Page } from "@playwright/test";

import {
  phase6BrowserPassword,
  phase6BrowserUsers,
} from "../../scripts/phase6-e2e-fixtures";

const baseUrl = process.env.KAFIL_E2E_BASE_URL ?? "http://127.0.0.1:3210";
test.setTimeout(180_000);

type ExpectedResponse = {
  count: number;
  consumed: number;
  key: string;
};

type ExpectedConsoleError = {
  consumed: number;
  path: string;
  status: number;
};

function watch(page: Page) {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];
  const failedResponses: string[] = [];
  const expectedResponses: ExpectedResponse[] = [];
  const expectedConsoleErrors: ExpectedConsoleError[] = [];

  const allow = (status: number, method: string, path: string, count = 1) => {
    expectedResponses.push({
      count,
      consumed: 0,
      key: `${status} ${method} ${path}`,
    });
    expectedConsoleErrors.push({ consumed: 0, path, status });
  };

  page.on("pageerror", (error) => pageErrors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const statusMatch = message.text().match(
      /^Failed to load resource: the server responded with a status of (\d+)\b/,
    );
    const locationUrl = message.location().url;
    const path = locationUrl ? new URL(locationUrl).pathname : "";
    const allowance = statusMatch
      ? expectedConsoleErrors.find(
        (entry) =>
          entry.consumed === 0
          && entry.status === Number(statusMatch[1])
          && entry.path === path,
      )
      : undefined;
    if (allowance) {
      allowance.consumed += 1;
      return;
    }
    consoleErrors.push(message.text());
  });
  page.on("requestfailed", (request) => {
    const reason = request.failure()?.errorText ?? "unknown failure";
    if (!reason.includes("ERR_ABORTED")) {
      failedRequests.push(`${request.method()} ${new URL(request.url()).pathname}: ${reason}`);
    }
  });
  page.on("response", (response) => {
    if (response.status() < 400) return;
    const key = `${response.status()} ${response.request().method()} ${new URL(response.url()).pathname}`;
    const allowance = expectedResponses.find(
      (entry) => entry.key === key && entry.consumed < entry.count,
    );
    if (allowance) {
      allowance.consumed += 1;
      return;
    }
    failedResponses.push(key);
  });

  return {
    allow,
    expectClean(note: string) {
      expect(pageErrors, `${note}: uncaught page errors`).toEqual([]);
      expect(failedRequests, `${note}: failed requests`).toEqual([]);
      expect(failedResponses, `${note}: unexpected failed responses`).toEqual([]);
      expect(consoleErrors, `${note}: console errors`).toEqual([]);
      expect(
        expectedResponses.map(({ consumed, count, key }) => ({ consumed, count, key })),
        `${note}: expected failed responses`,
      ).toEqual(
        expectedResponses.map(({ count, key }) => ({ consumed: count, count, key })),
      );
    },
  };
}

async function loginAsOperator(page: Page) {
  await page.context().addCookies([
    { name: "kafil-ui-language", value: "en", url: baseUrl },
  ]);
  await page.goto("/login");
  const identifier = page.getByLabel("Email or phone");
  await identifier.fill(phase6BrowserUsers.operator);
  await page.getByPlaceholder("Enter your password").fill(phase6BrowserPassword);
  await waitForReactHandler(page.getByRole("button", { name: "Log in" }));

  const loginResponse = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/auth/login" &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Log in" }).click();
  expect((await loginResponse).status(), "operator login must succeed").toBe(200);
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function waitForReactHandler(target: Locator) {
  await expect
    .poll(
      () =>
        target.evaluate((element) => {
          const propsKey = Object.keys(element).find((key) => key.startsWith("__reactProps$"));
          if (!propsKey) return false;
          const props = (element as unknown as Record<string, { onClick?: unknown }>)[propsKey];
          return typeof props?.onClick === "function";
        }),
      { timeout: 120_000 },
    )
    .toBe(true);
}

async function selectTimeZone(page: Page, zone: string) {
  const sheet = page.getByRole("dialog").filter({ hasText: "App settings" });
  const combobox = sheet.getByRole("combobox");

  await combobox.focus();
  await expect(combobox).toBeFocused();
  await page.keyboard.press("Enter");

  const search = page.getByPlaceholder("Search time zones...");
  await expect(search).toBeFocused();
  await page.keyboard.type(zone);
  const option = page.getByRole("option", { name: new RegExp(`^${zone} \\(`) });
  await expect(option).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(combobox).toContainText(zone);

  const settingResponse = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/settings" &&
      response.request().method() === "PUT",
  );
  const preferenceResponse = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/ui-timezone" &&
      response.request().method() === "POST",
  );
  await sheet.getByRole("button", { name: "Save settings" }).click();

  expect((await settingResponse).status(), "platform settings save must succeed").toBe(200);
  const response = await preferenceResponse;
  expect(response.status(), "time-zone preference save must succeed").toBe(200);
  expect(await response.json()).toEqual({ timeZone: zone });
  await expect(page.locator("html")).toHaveAttribute("data-time-zone", zone);
  await expect(combobox).toContainText(new RegExp(`${zone} \\(GMT[+-]`));
}

test("the language control persists Arabic and gives portaled controls RTL direction", async ({ page }) => {
  const diagnostics = watch(page);
  await loginAsOperator(page);

  const language = page.getByRole("button", { name: "Language" });
  await waitForReactHandler(language);
  await language.focus();
  await expect(language).toBeFocused();
  await page.keyboard.press("Enter");

  const arabic = page.getByRole("menuitem", { name: /Arabic/ });
  await expect(arabic).toBeVisible();
  const preferenceResponse = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/ui-language" &&
      response.request().method() === "POST",
  );
  await arabic.focus();
  await page.keyboard.press("Enter");

  const response = await preferenceResponse;
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ language: "ar" });
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { name: "لوحة تحكم المشغّل" })).toBeVisible();

  const arabicLanguage = page.getByRole("button", { name: "اللغة" });
  await arabicLanguage.focus();
  await page.keyboard.press("Enter");
  const menu = page.getByRole("menu");
  await expect(menu).toBeVisible();
  expect(await menu.evaluate((element) => getComputedStyle(element).direction)).toBe("rtl");
  await page.keyboard.press("Escape");

  await page.goto("/apply");
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  diagnostics.expectClean("language persistence and RTL");
});

test("theme and canonical time zones persist through the real controls and server layout", async ({
  page,
}) => {
  const diagnostics = watch(page);
  await loginAsOperator(page);

  const settings = page.getByRole("button", { name: "Settings" }).first();
  await waitForReactHandler(settings);
  await settings.click();
  const sheet = page.getByRole("dialog").filter({ hasText: "App settings" });
  await expect(sheet).toBeVisible();

  // Both were offered by TimeZoneInput but rejected by Kafil's deleted local
  // allow-list. Selecting and saving through the keyboard proves the UI and
  // server now consume the same published list.
  await selectTimeZone(page, "Africa/Nairobi");
  await selectTimeZone(page, "Asia/Dubai");

  const cookieBeforeRejection = (await page.context().cookies()).find(
    (cookie) => cookie.name === "kafil-ui-timezone",
  );
  expect(cookieBeforeRejection?.value).toBe("Asia/Dubai");

  diagnostics.allow(400, "POST", "/api/ui-timezone");
  const rejected = await page.evaluate(async () => {
    const response = await fetch("/api/ui-timezone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timeZone: "Mars/Olympus" }),
    });
    return { status: response.status, body: await response.json() };
  });
  expect(rejected.status).toBe(400);
  expect(rejected.body).toEqual({ message: "Unsupported time zone." });
  expect(
    (await page.context().cookies()).find((cookie) => cookie.name === "kafil-ui-timezone")
      ?.value,
  ).toBe("Asia/Dubai");
  await expect(page.locator("html")).toHaveAttribute("data-time-zone", "Asia/Dubai");

  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();

  const themeResponse = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/ui-theme" &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Toggle color theme" }).click();
  expect((await themeResponse).status()).toBe(200);
  await expect(page.locator("html")).toHaveClass(/\bdark\b/);

  // Read a fresh server response before reloading. The class and time-zone
  // attribute must already be in the root HTML, which rules out a client-only
  // flash correction after hydration.
  const serverResponse = await page.context().request.get(new URL("/apply", baseUrl).toString());
  expect(serverResponse.status()).toBe(200);
  const serverHtml = await serverResponse.text();
  expect(serverHtml).toMatch(/<html[^>]*data-time-zone="Asia\/Dubai"[^>]*class="[^"]*\bdark\b/);

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-time-zone", "Asia/Dubai");
  await expect(page.locator("html")).toHaveClass(/\bdark\b/);
  diagnostics.expectClean("theme and time-zone persistence");
});
