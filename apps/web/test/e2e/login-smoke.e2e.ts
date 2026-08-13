import { expect, test, type Page } from "@playwright/test";

const BASE_URL =
  process.env.KAFIL_E2E_BASE_URL ?? "https://127.0.0.1:3210";

const ANONYMOUS_401_ENDPOINTS = [
  "/api/auth/refresh",
  "/api/settings/form-fill",
];

type FailedResponse = {
  method: string;
  status: number;
  path: string;
};

type Watched = {
  errors: string[];
  pageErrors: string[];
  failed: string[];
  responses: FailedResponse[];
  allowLogin401: boolean;
  reset: () => void;
};

function watch(page: Page, { allowLogin401 = false } = {}): Watched {
  const w: Watched = {
    errors: [],
    pageErrors: [],
    failed: [],
    responses: [],
    allowLogin401,
    reset() {
      w.errors.length = 0;
      w.pageErrors.length = 0;
      w.failed.length = 0;
      w.responses.length = 0;
    },
  };

  page.on("response", (r) => {
    if (r.status() < 400) return;
    let path = r.url();
    try {
      path = new URL(r.url()).pathname;
    } catch {
      // Fall back to the raw URL; path matching is still attempted against it.
    }
    w.responses.push({
      method: r.request().method(),
      status: r.status(),
      path,
    });
  });

  page.on("console", (m) => {
    if (m.type() === "error") w.errors.push(m.text());
  });

  page.on("pageerror", (e) => {
    w.pageErrors.push(String(e));
  });

  page.on("requestfailed", (r) => {
    const err = r.failure()?.errorText ?? "";
    if (!/ERR_ABORTED/.test(err)) w.failed.push(`${r.url()} — ${err}`);
  });

  return w;
}

const STATUS_ONLY =
  /^Failed to load resource: the server responded with a status of (401|429)\b/;

function isAnonymousAllowed(r: FailedResponse): boolean {
  return (
    (r.status === 401 || r.status === 429) &&
    ANONYMOUS_401_ENDPOINTS.some((endpoint) => r.path.includes(endpoint))
  );
}

function isLoginRejection(r: FailedResponse): boolean {
  return (
    r.method === "POST" &&
    r.status === 401 &&
    r.path === "/api/auth/login"
  );
}

function expectClean(w: Watched, note: string, allowLogin401: boolean) {
  const loginRejections = w.responses.filter(isLoginRejection);

  const unexpected = w.responses.filter((r) => {
    if (isAnonymousAllowed(r)) return false;
    if (allowLogin401 && isLoginRejection(r) && loginRejections.length === 1) {
      return false;
    }
    return true;
  });

  expect(w.pageErrors, `${note}: uncaught page errors`).toEqual([]);

  if (allowLogin401) {
    expect(
      loginRejections,
      `${note}: exactly one POST /api/auth/login must respond 401`,
    ).toHaveLength(1);
  } else {
    expect(
      loginRejections,
      `${note}: no POST /api/auth/login may have responded`,
    ).toEqual([]);
  }

  expect(
    unexpected.map((r) => `${r.status} ${r.method} ${r.path}`),
    `${note}: unexpected failed responses`,
  ).toEqual([]);

  const onlyAllowed =
    allowLogin401 && loginRejections.length === 1 && unexpected.length === 0;
  const errors = onlyAllowed
    ? w.errors.filter((text) => !STATUS_ONLY.test(text))
    : w.errors;
  expect(errors, `${note}: console errors`).toEqual([]);

  expect(w.failed, `${note}: failed requests`).toEqual([]);
}

async function overflowOf(page: Page) {
  return page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
}

async function logoDecoded(page: Page) {
  return page
    .getByAltText("Kafil platform", { exact: true })
    .evaluate(
      (el) =>
        (el as HTMLImageElement).complete &&
        (el as HTMLImageElement).naturalWidth > 0,
    );
}

test.describe("login smoke", () => {
  test("desktop login renders a decoded logo", async ({ page }) => {
    const w = watch(page);
    await page.goto("/login");
    await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();

    const logo = page.getByAltText("Kafil platform", { exact: true });
    await expect(logo).toBeVisible();

    await expect
      .poll(() => logoDecoded(page), {
        message: "the platform logo must decode",
        timeout: 10_000,
      })
      .toBe(true);

    expectClean(w, "desktop login", false);
  });

  test("mobile login has no horizontal overflow", async ({ page }) => {
    const w = watch(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/login");
    await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();

    expect(
      await overflowOf(page),
      "horizontal overflow at 390px must be at most one CSS pixel",
    ).toBeLessThanOrEqual(1);

    await expect
      .poll(() => logoDecoded(page), {
        message: "the platform logo must decode on mobile",
        timeout: 10_000,
      })
      .toBe(true);

    expectClean(w, "mobile login", false);
  });

  test("Arabic login is RTL and keeps the decoded logo", async ({ page }) => {
    const w = watch(page);
    await page.context().addCookies([
      { name: "kafil-ui-language", value: "ar", url: BASE_URL },
    ]);
    await page.goto("/login");

    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");

    const logo = page.getByAltText("Kafil platform", { exact: true });
    await expect(logo).toBeVisible();

    await expect
      .poll(() => logoDecoded(page), {
        message: "the platform logo must decode under RTL",
        timeout: 10_000,
      })
      .toBe(true);

    expectClean(w, "Arabic login", false);
  });

  test("invalid credentials show an error and stay on login", async ({ page }) => {
    const w = watch(page, { allowLogin401: true });

    await page.goto("/login");
    await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();

    await page
      .getByLabel("Email or phone")
      .fill("playwright-login-smoke@example.invalid");
    await page.getByPlaceholder("Enter your password").fill("not-a-real-password");

    const loginResponse = page.waitForResponse(
      (r) =>
        r.url().includes("/api/auth/login") && r.request().method() === "POST",
    );

    await page.getByRole("button", { name: "Log in" }).click();

    const response = await loginResponse;
    expect(response.status(), "login must be rejected with 401").toBe(401);

    await expect
      .poll(() => new URL(page.url()).pathname, { timeout: 10_000 })
      .toBe("/login");

    const toast = page.locator('[data-sonner-toast][data-type="error"]');
    await expect(toast).toBeVisible({ timeout: 10_000 });
    await expect(toast).not.toHaveText("");

    expectClean(w, "rejected login", true);
  });
});
