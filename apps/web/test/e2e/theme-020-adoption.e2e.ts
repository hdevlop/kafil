// ============================================================================
// najm-theme 0.2.0 + NCredentialsCard — Kafil browser acceptance
// ============================================================================
//
// Runs against a *production* Kafil server the operator already started, so the
// bundle under test is the one `bun run build` produced.
//
//   KAFIL_E2E_MANAGED_SERVER=1 KAFIL_E2E_BASE_URL=http://127.0.0.1:3000 \
//     bunx playwright test test/e2e/theme-020-adoption.e2e.ts
//
// It needs, in the database the server is pointed at:
//   * an administrator whose credentials are in KAFIL_ADMIN_EMAIL and
//     KAFIL_ADMIN_PASSWORD (never a literal in this file), and
//   * three internal operator staff profiles with no linked user account, named
//     `Acceptance Handover EN`, `… FAIL`, and `… AR`.
//
// The staff profiles are consumed by the run: provisioning access is one-way,
// so they are reseeded before each invocation. Nothing here is skipped when a
// prerequisite is missing — a missing administrator is a failed acceptance run,
// not a passing one, because "no admin in this database" and "the dashboard is
// broken" must never produce the same green result.
//
// ---------------------------------------------------------------------------
// Why the authenticated block shares one page
// ---------------------------------------------------------------------------
// Kafil marks `refreshToken` and `najm.session` `Secure`, and Chrome refuses a
// `Secure` cookie from any origin it does not consider cryptographically
// secure — which includes `http://127.0.0.1` and an `https://` origin with an
// untrusted local certificate. On a local acceptance origin the browser
// therefore keeps only `kafil.remember`, and a full load of a protected route
// lands on `/login`. That is a property of the test origin, not of the product:
// against a deployment with a trusted certificate the session survives.
//
// So the authenticated tests sign in once, share the page, and navigate through
// the application rather than through the address bar. Persistence is proven
// where it is strongest anyway — a *fresh anonymous context* loading `/login`,
// which is server-rendered from the stored snapshot and needs no session at all.
// ============================================================================

import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type Locator,
  type Page,
} from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

// Playwright transpiles these specs to CommonJS, so `import.meta.url` is not
// available. The runner's cwd is `apps/web`, which the config already relies on.
const EVIDENCE = resolve(process.cwd(), "../../docs/evidence/najm-theme-0.2");

const BASE_URL = process.env.KAFIL_E2E_BASE_URL ?? "http://127.0.0.1:3000";
const ADMIN_EMAIL = process.env.KAFIL_ADMIN_EMAIL ?? "";
const ADMIN_PASSWORD = process.env.KAFIL_ADMIN_PASSWORD ?? "";

const FACTORY_ROUTE = "/api/branding/factory/";
const MANAGED_ROUTE = "/api/branding/assets/";

/** A 1×1 PNG. The bytes are irrelevant; the route it is served from is not. */
const UPLOAD_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

/**
 * The only console noise this suite tolerates, and only for an anonymous
 * visitor on the sign-in page.
 *
 * Both are the app asking "is anyone signed in?" and being told no. They
 * predate this migration and have nothing to do with theming — but the
 * exemption is by *endpoint*, so a 401 from anywhere else still fails, and a
 * third endpoint appearing here would fail too.
 *
 * 429 is exempted on the same two endpoints for the same reason: Kafil rate
 * limits auth by identity, and a suite that signs in repeatedly trips it. That
 * is the harness making noise about itself, not the product failing.
 */
const ANONYMOUS_401_ENDPOINTS = ["/api/auth/refresh", "/api/settings/form-fill"];

type Watched = {
  errors: string[];
  consoleAll: string[];
  pageErrors: string[];
  failed: string[];
  unexpected4xx: string[];
  requestUrls: string[];
  allowAnonymous401: boolean;
  reset: () => void;
};

function watch(page: Page, { allowAnonymous401 = false } = {}): Watched {
  const w: Watched = {
    errors: [],
    consoleAll: [],
    pageErrors: [],
    failed: [],
    unexpected4xx: [],
    requestUrls: [],
    allowAnonymous401,
    reset() {
      w.errors.length = 0;
      w.consoleAll.length = 0;
      w.pageErrors.length = 0;
      w.failed.length = 0;
      w.unexpected4xx.length = 0;
      w.requestUrls.length = 0;
    },
  };

  page.on("request", (r) => w.requestUrls.push(r.url()));

  page.on("response", (r) => {
    if (r.status() < 400) return;
    const exempt =
      w.allowAnonymous401 &&
      (r.status() === 401 || r.status() === 429) &&
      ANONYMOUS_401_ENDPOINTS.some((endpoint) => r.url().includes(endpoint));
    if (!exempt) w.unexpected4xx.push(`${r.status()} ${r.url()}`);
  });

  page.on("console", (m) => {
    w.consoleAll.push(m.text());
    if (m.type() === "error") w.errors.push(m.text());
  });
  page.on("pageerror", (e) => {
    w.pageErrors.push(String(e));
    w.consoleAll.push(String(e));
  });
  page.on("requestfailed", (r) => {
    // Navigation aborts are not failures worth gating on.
    const err = r.failure()?.errorText ?? "";
    if (!/ERR_ABORTED/.test(err)) w.failed.push(`${r.url()} — ${err}`);
  });
  return w;
}

/**
 * A console message for a failed fetch carries a status but no URL, so it
 * cannot be attributed on its own. These are dropped only when *every* 4xx the
 * page produced was on an exempt endpoint — if anything unexpected failed,
 * `unexpected4xx` is non-empty, nothing is dropped, and both assertions fire.
 */
const STATUS_ONLY =
  /^Failed to load resource: the server responded with a status of (401|429)\b/;

function expectClean(w: Watched, note: string) {
  expect(w.pageErrors, `${note}: uncaught page errors`).toEqual([]);
  expect(w.unexpected4xx, `${note}: unexpected failed responses`).toEqual([]);

  const errors =
    w.allowAnonymous401 && w.unexpected4xx.length === 0
      ? w.errors.filter((text) => !STATUS_ONLY.test(text))
      : w.errors;

  expect(errors, `${note}: console errors`).toEqual([]);
  expect(w.failed, `${note}: failed requests`).toEqual([]);
}

async function shot(page: Page, name: string) {
  mkdirSync(EVIDENCE, { recursive: true });
  await page.screenshot({ path: resolve(EVIDENCE, `kafil-${name}.png`) });
}

async function shotOf(target: Locator, name: string) {
  mkdirSync(EVIDENCE, { recursive: true });
  await target.screenshot({ path: resolve(EVIDENCE, `kafil-${name}.png`) });
}

/** Horizontal overflow in CSS pixels. One pixel of rounding is not a defect. */
async function overflowOf(page: Page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

/** Every `<img>` that finished loading with no intrinsic width. */
async function brokenImages(page: Page) {
  return page.evaluate(
    () => document.images.length &&
      Array.from(document.images).filter((i) => i.complete && i.naturalWidth === 0).length,
  );
}

async function signIn(page: Page) {
  expect(ADMIN_EMAIL, "KAFIL_ADMIN_EMAIL must be set").not.toBe("");
  expect(ADMIN_PASSWORD, "KAFIL_ADMIN_PASSWORD must be set").not.toBe("");

  await page.goto("/login");
  await page.getByLabel("Email or phone").fill(ADMIN_EMAIL);
  await page.getByPlaceholder("Enter your password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30_000 });
  await page.waitForLoadState("domcontentloaded");
  await expect(page.locator("aside img").first()).toBeVisible();
}

/**
 * A throwaway anonymous visitor.
 *
 * Used to read what the *server* stored, rather than what the administrator's
 * own client is holding in memory. A save that only updated a React cache
 * cannot pass a check made here.
 */
async function withAnonymousPage<T>(
  browser: Browser,
  body: (page: Page, w: Watched) => Promise<T>,
): Promise<T> {
  const context = await browser.newContext();
  const page = await context.newPage();
  const w = watch(page, { allowAnonymous401: true });
  try {
    return await body(page, w);
  } finally {
    await context.close();
  }
}

/** The `src` of every sidebar mark, reduced to its file name. */
async function sidebarMarks(page: Page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll("aside img")).map(
      (i) => (i as HTMLImageElement).src,
    ),
  );
}

async function authLogoSrc(page: Page) {
  return page.getByAltText("Kafil platform", { exact: true }).getAttribute("src");
}

// ============================================================================
// Anonymous
// ============================================================================

test.describe("najm-theme 0.2.0 factory convention", () => {
  test("the sign-in page renders both marks from the definition's own route", async ({
    page,
  }) => {
    const w = watch(page, { allowAnonymous401: true });
    const branding: { url: string; type: string | null; cache: string | null }[] = [];
    page.on("response", (r) => {
      if (r.url().includes(FACTORY_ROUTE)) {
        branding.push({
          url: r.url(),
          type: r.headers()["content-type"] ?? null,
          cache: r.headers()["cache-control"] ?? null,
        });
      }
    });

    await page.goto("/login");
    await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();

    // The logo is an <img> whose src is the factory route — no /logoExpanded.webp
    // anywhere, which is the whole point of the cutover.
    const logo = page.getByAltText("Kafil platform", { exact: true });
    await expect(logo).toBeVisible();
    const src = await logo.getAttribute("src");
    expect(src, "auth logo must come from the factory route").toContain(FACTORY_ROUTE);

    // It must actually decode, not merely have a src.
    const ok = await logo.evaluate(
      (el) => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0,
    );
    expect(ok, "auth logo must decode").toBe(true);

    expect(branding.length, "at least one factory asset served").toBeGreaterThan(0);
    for (const r of branding) {
      expect(r.type, `${r.url} content-type`).toBe("image/webp");
      expect(r.cache ?? "", `${r.url} cache-control`).toContain("immutable");
    }

    await shot(page, "auth-desktop");
    expectClean(w, "sign-in page");
  });

  test("the sign-in page holds up on mobile and in Arabic RTL", async ({ page }) => {
    const w = watch(page, { allowAnonymous401: true });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/login");
    await expect(page.getByAltText("Kafil platform", { exact: true })).toBeVisible();

    expect(await overflowOf(page), "no horizontal scroll at 390px").toBeLessThanOrEqual(1);
    await shot(page, "auth-mobile");

    // Arabic is the RTL locale the product ships.
    await page.context().addCookies([
      { name: "kafil-ui-language", value: "ar", url: BASE_URL },
    ]);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.reload();

    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByAltText("Kafil platform", { exact: true })).toBeVisible();
    expect(await overflowOf(page), "no horizontal scroll under RTL").toBeLessThanOrEqual(1);
    await shot(page, "auth-rtl");

    expectClean(w, "sign-in mobile/RTL");
  });
});

// ============================================================================
// Authenticated — one sign-in, one page, navigated through the application
// ============================================================================

test.describe("najm-theme 0.2.0 administration", () => {
  test.describe.configure({ mode: "serial" });

  let context: BrowserContext;
  let page: Page;
  let w: Watched;
  /** The design the application ships with, read before anything changes it. */
  let factoryPrimary: string;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.grantPermissions(["clipboard-read", "clipboard-write"], {
      origin: BASE_URL,
    });
    page = await context.newPage();
    w = watch(page);
    await signIn(page);
    factoryPrimary = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--primary").trim(),
    );
    expect(factoryPrimary, "the factory design must define --primary").not.toBe("");
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test.beforeEach(() => w.reset());

  // --------------------------------------------------------------------------

  test("the dashboard shows a different mark in each sidebar state", async () => {
    const expanded = await sidebarMarks(page);
    expect(expanded.length, "the sidebar must render a mark").toBeGreaterThan(0);
    expect(
      expanded.some((src) => src.includes(`${FACTORY_ROUTE}sidebarLogoExpanded.`)),
      "the expanded sidebar must serve the expanded slot from the factory route",
    ).toBe(true);
    await shot(page, "sidebar-expanded");

    // Unconditional. A trigger that is absent is a regression in the shell, and
    // a `if (await trigger.count())` around this would report that as success.
    const collapse = page.getByRole("button", { name: "Collapse" });
    await expect(collapse, "the sidebar must offer a collapse control").toHaveCount(1);
    await collapse.click();

    // The two slots must resolve to *different* files. Kafil ships byte-identical
    // images for them, so this passes on the slot name in the content-addressed
    // file — which is exactly the thing that would break if the collapsed slot
    // silently fell back to the expanded one.
    await expect
      .poll(
        async () =>
          (await sidebarMarks(page)).some((src) =>
            src.includes(`${FACTORY_ROUTE}sidebarLogoCollapsed.`),
          ),
        { message: "the collapsed sidebar must serve the collapsed slot", timeout: 5_000 },
      )
      .toBe(true);

    const collapsed = await sidebarMarks(page);
    expect(collapsed, "collapsing must change what is painted").not.toEqual(expanded);
    expect(await brokenImages(page), "no broken sidebar mark").toBe(0);
    await shot(page, "sidebar-collapsed");

    await page.getByRole("button", { name: "Expand" }).click();
    await expect
      .poll(async () => (await sidebarMarks(page)).join(" "), { timeout: 5_000 })
      .toContain("sidebarLogoExpanded.");

    expectClean(w, "dashboard sidebar");
  });

  test("the settings sheet opens from the keyboard and renders every package section", async () => {
    // Opened with the keyboard rather than a click: this is the only route an
    // administrator who does not use a mouse has to the theme surface.
    const trigger = page.getByRole("button", { name: "Settings" }).first();
    await trigger.focus();
    await expect(trigger).toBeFocused();
    await page.keyboard.press("Enter");

    const sheet = page.getByRole("dialog").filter({ hasText: "Global settings" });
    await expect(sheet).toBeVisible();

    // The three sections come from the package, not from Kafil.
    for (const section of ["presets", "appearance", "branding"]) {
      await expect(
        page.locator(`[data-najm-theme-section="${section}"]`),
        `the ${section} section must render`,
      ).toHaveCount(1);
    }

    // Every registered slot, by the accessible name the package gives its group.
    for (const label of ["Sidebar logo", "Sidebar icon", "Sign-in logo", "Sign-in image"]) {
      await expect(
        page.getByRole("group", { name: label }),
        `the ${label} slot must render`,
      ).toHaveCount(1);
    }

    // The action bar, including both separately-named reset controls.
    await expect(page.getByRole("button", { name: "Save changes" })).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Reset appearance to factory" })).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Reset branding to factory" })).toHaveCount(1);

    await shot(page, "theme-settings-sheet");

    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
    expectClean(w, "theme settings sheet");
  });

  test("an uploaded mark replaces the factory one, falls back when it 404s, and is undone by Reset", async ({
    browser,
  }) => {
    await page.getByRole("button", { name: "Settings" }).first().click();
    const sheet = page.getByRole("dialog").filter({ hasText: "Global settings" });
    await expect(sheet).toBeVisible();

    await test.step("upload a candidate and save it", async () => {
      await page
        .locator('[data-najm-theme-section="branding"] [data-slot="authLogo"] input[type=file]')
        .setInputFiles({ name: "acceptance-logo.png", mimeType: "image/png", buffer: UPLOAD_PNG });

      // The package uploads on pick and says so before anything is committed.
      await expect(
        page.getByRole("group", { name: "Sign-in logo" }).getByText("Image ready — save to apply it"),
      ).toBeVisible({ timeout: 20_000 });
      await shot(page, "branding-uploaded");

      const save = page.getByRole("button", { name: "Save changes" });
      await expect(save).toBeEnabled();
      await save.click();
      await expect(page.getByText("Branding saved")).toBeVisible({ timeout: 20_000 });
    });

    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();

    await test.step("a fresh anonymous visitor is served the managed asset", async () => {
      await withAnonymousPage(browser, async (anon, anonWatch) => {
        await anon.goto("/login");
        const src = await authLogoSrc(anon);
        expect(src, "the sign-in logo must now come from the managed route").toContain(
          MANAGED_ROUTE,
        );
        expect(src, "and no longer from the factory route").not.toContain(FACTORY_ROUTE);
        expect(await brokenImages(anon), "the managed mark must decode").toBe(0);
        await shot(anon, "auth-managed-logo");
        expectClean(anonWatch, "anonymous sign-in with a managed mark");
      });
    });

    await test.step("a managed asset that 404s falls back to the factory mark", async () => {
      await withAnonymousPage(browser, async (anon) => {
        // Break the *managed* asset — the one the slot now resolves to — and
        // nothing else. This is the fallback `NThemeImage` documents: resolved
        // path, then factory file, then nothing.
        await anon.route(`**${MANAGED_ROUTE}**`, (route) => route.fulfill({ status: 404 }));

        await anon.goto("/login");
        await expect(anon.getByRole("button", { name: "Log in" })).toBeVisible();

        // Polled, not sampled once: the fallback is a React state change after
        // the image's error event, so an immediate read catches the failed <img>
        // still in the tree and calls a working fallback a broken one.
        await expect
          .poll(async () => await authLogoSrc(anon), {
            message: "the slot must fall through to the factory file",
            timeout: 10_000,
          })
          .toContain(FACTORY_ROUTE);

        await expect
          .poll(async () => await brokenImages(anon), {
            message: "no broken image element may remain",
            timeout: 10_000,
          })
          .toBe(0);

        await shot(anon, "auth-asset-404-fallback");
      });
    });

    await test.step("Reset branding restores the factory mark", async () => {
      await page.getByRole("button", { name: "Settings" }).first().click();
      await expect(sheet).toBeVisible();

      await page.getByRole("button", { name: "Reset branding to factory" }).click();
      const confirm = page.getByRole("alertdialog").filter({ hasText: "Reset branding?" });
      await expect(confirm).toBeVisible();
      await confirm.getByRole("button", { name: "Reset to factory" }).click();

      await expect(page.getByText("Reset")).toBeVisible({ timeout: 20_000 });
      await page.keyboard.press("Escape");
      await expect(sheet).toBeHidden();

      await withAnonymousPage(browser, async (anon, anonWatch) => {
        await anon.goto("/login");
        const src = await authLogoSrc(anon);
        expect(src, "the reset must put the factory mark back").toContain(FACTORY_ROUTE);
        expect(src, "and drop the managed one").not.toContain(MANAGED_ROUTE);
        expect(await brokenImages(anon), "the restored mark must decode").toBe(0);
        expectClean(anonWatch, "anonymous sign-in after a branding reset");
      });
    });

    expectClean(w, "branding upload, fallback, and reset");
  });

  test("applying a saved theme persists the design, and Reset restores the factory one", async ({
    browser,
  }) => {
    await page.getByRole("button", { name: "Settings" }).first().click();
    const sheet = page.getByRole("dialog").filter({ hasText: "Global settings" });
    await expect(sheet).toBeVisible();

    const presets = page.locator('[data-najm-theme-section="presets"]');
    await expect(presets).toBeVisible();

    await presets.getByRole("combobox").first().click();
    // Any built-in other than the current one; `Sable` is seeded by `seed:themes`.
    await page.getByRole("option", { name: "Sable" }).click();

    // Selecting previews in memory. The page must already look different —
    // that is the contract the package documents for a preview.
    await expect
      .poll(
        async () =>
          page.evaluate(() =>
            getComputedStyle(document.documentElement).getPropertyValue("--primary").trim(),
          ),
        { message: "selecting a preset must restyle the page", timeout: 10_000 },
      )
      .not.toBe(factoryPrimary);

    const previewed = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--primary").trim(),
    );

    await page.getByRole("button", { name: "Apply this theme" }).click();
    await expect(page.getByText("Appearance saved")).toBeVisible({ timeout: 20_000 });
    await shot(page, "appearance-preset-applied");

    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();

    await test.step("a fresh anonymous visitor is served the applied design", async () => {
      await withAnonymousPage(browser, async (anon, anonWatch) => {
        await anon.goto("/login");
        await expect(anon.getByRole("button", { name: "Log in" })).toBeVisible();
        const served = await anon.evaluate(() =>
          getComputedStyle(document.documentElement).getPropertyValue("--primary").trim(),
        );
        expect(served, "the applied design must survive without a session").toBe(previewed);
        expectClean(anonWatch, "anonymous sign-in with an applied design");
      });
    });

    await test.step("Reset appearance restores the factory design", async () => {
      await page.getByRole("button", { name: "Settings" }).first().click();
      await expect(sheet).toBeVisible();

      const reset = page.getByRole("button", { name: "Reset appearance to factory" });
      await expect(reset, "a stored design makes the reset available").toBeEnabled();
      await reset.click();
      const confirm = page.getByRole("alertdialog").filter({ hasText: "Reset appearance?" });
      await expect(confirm).toBeVisible();
      await confirm.getByRole("button", { name: "Reset to factory" }).click();

      await expect
        .poll(
          async () =>
            page.evaluate(() =>
              getComputedStyle(document.documentElement).getPropertyValue("--primary").trim(),
            ),
          { message: "the reset must restore the factory design", timeout: 20_000 },
        )
        .toBe(factoryPrimary);

      await page.keyboard.press("Escape");
      await expect(sheet).toBeHidden();

      await withAnonymousPage(browser, async (anon) => {
        await anon.goto("/login");
        await expect(anon.getByRole("button", { name: "Log in" })).toBeVisible();
        const served = await anon.evaluate(() =>
          getComputedStyle(document.documentElement).getPropertyValue("--primary").trim(),
        );
        expect(served, "and the reset must be what an anonymous visitor gets").toBe(
          factoryPrimary,
        );
      });
    });

    expectClean(w, "appearance preset and reset");
  });
});

// ============================================================================
// NCredentialsCard — the staff handover
// ============================================================================

/** Opens the provision-access dialog for one fixture row and returns its trigger. */
async function openHandover(page: Page, staffName: string): Promise<Locator> {
  await page.locator('a[href="/staff"]:visible').first().click();
  await expect(page.getByRole("heading", { name: "Staff" })).toBeVisible({ timeout: 20_000 });

  const row = page.locator('[data-row="true"]').filter({ hasText: staffName });
  await expect(row, `the ${staffName} fixture must exist`).toHaveCount(1);

  const trigger = row.getByRole("button", { name: "Row actions" });
  await trigger.click();
  const provision = page.getByRole("menuitem", { name: "Provision operator access" });
  await expect(
    provision,
    `${staffName} must still be un-provisioned — reseed the fixtures`,
  ).toBeVisible();
  await provision.click();

  await expect(page.getByRole("button", { name: "Provision operator access" })).toBeVisible();
  await page.getByRole("button", { name: "Provision operator access" }).click();

  await expect(page.getByTestId("credentials-card")).toBeVisible({ timeout: 20_000 });
  return trigger;
}

/** The label/value pairs the card is actually painting. */
async function cardFields(page: Page) {
  return page.getByTestId("credentials-card").evaluate((card) =>
    Array.from(card.querySelectorAll("[data-testid='credentials-card-field']")).map((f) => ({
      label: f.querySelector("dt")?.textContent ?? "",
      value: f.querySelector("dd")?.textContent ?? "",
      dir: f.querySelector("dd")?.getAttribute("dir") ?? null,
    })),
  );
}

test.describe("NCredentialsCard handover", () => {
  test.describe.configure({ mode: "serial" });

  let context: BrowserContext;
  let page: Page;
  let w: Watched;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.grantPermissions(["clipboard-read", "clipboard-write"], {
      origin: BASE_URL,
    });
    page = await context.newPage();
    w = watch(page);
    await signIn(page);
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test.beforeEach(() => w.reset());

  test("the handover renders, copies, keeps Copy before Done, and never leaks the secret", async () => {
    const trigger = await openHandover(page, "Acceptance Handover EN");
    const card = page.getByTestId("credentials-card");

    const fields = await cardFields(page);
    expect(fields.map((f) => f.label)).toEqual(["Phone", "Initial password"]);
    expect(fields[0].value).toBe("+212600112233");
    const password = fields[1].value;
    expect(password.length, "a real initial password must be shown").toBeGreaterThan(7);
    // Every value isolates its own direction — the fix that stops a phone number
    // painting backwards under an inherited RTL.
    for (const field of fields) expect(field.dir).toBe("auto");

    await expect(card.getByText("Account created")).toBeVisible();
    await shotOf(card, "credentials-en");

    await test.step("Copy writes exactly the two labelled values", async () => {
      const copy = page.getByTestId("credentials-card-copy");
      await expect(copy).toHaveText("Copy details");
      await copy.click();
      await expect(copy).toHaveText("Copied", { timeout: 10_000 });
      // The status region is what a screen reader hears, and it is not the
      // button — a visual-only change would leave it silent.
      await expect(page.getByTestId("credentials-card-status")).toHaveText("Copied");
      await shotOf(card, "credentials-copied");

      const written = await page.evaluate(() => navigator.clipboard.readText());
      // Windows normalises \n to \r\n on a clipboard round trip.
      expect(written.replace(/\r\n/g, "\n")).toBe(
        `Phone: +212600112233\nInitial password: ${password}`,
      );
    });

    await test.step("Tab moves from Copy to Done, and Shift+Tab back", async () => {
      const copy = page.getByTestId("credentials-card-copy");
      await copy.focus();
      await expect(copy).toBeFocused();

      await page.keyboard.press("Tab");
      await expect(
        page.getByRole("button", { name: "Done" }),
        "Copy must come before the consumer's own action",
      ).toBeFocused();

      await page.keyboard.press("Shift+Tab");
      await expect(copy, "and the order must hold in reverse").toBeFocused();
    });

    await test.step("Done closes the dialog and returns focus to its trigger", async () => {
      await page.getByRole("button", { name: "Done" }).click();
      await expect(card).toBeHidden({ timeout: 10_000 });
      await expect(
        trigger,
        "focus must come back to the control that opened the dialog",
      ).toBeFocused();
    });

    await test.step("the password is never logged, stored, or put in a URL", async () => {
      expect(
        w.consoleAll.filter((line) => line.includes(password)),
        "the password must not reach the console",
      ).toEqual([]);
      expect(
        w.requestUrls.filter((url) => url.includes(encodeURIComponent(password)) || url.includes(password)),
        "the password must not reach a request URL",
      ).toEqual([]);

      const stored = await page.evaluate(() => {
        const dump = (s: Storage) =>
          Object.keys(s)
            .map((k) => `${k}=${s.getItem(k) ?? ""}`)
            .join("\n");
        return `${dump(localStorage)}\n${dump(sessionStorage)}`;
      });
      expect(stored.includes(password), "the password must not be persisted").toBe(false);
    });

    expectClean(w, "credential handover");
  });

  test("a clipboard that refuses shows Copy failed and never claims success", async () => {
    // Replaces the API the component resolves at click time, so the rejection is
    // the browser's answer rather than a stubbed component.
    await page.evaluate(() => {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: () => Promise.reject(new DOMException("Denied", "NotAllowedError")),
        },
      });
    });

    try {
      await openHandover(page, "Acceptance Handover FAIL");
      const card = page.getByTestId("credentials-card");
      const copy = page.getByTestId("credentials-card-copy");

      await copy.click();
      await expect(copy).toHaveText("Copy failed", { timeout: 10_000 });
      await expect(page.getByTestId("credentials-card-status")).toHaveText("Copy failed");
      // The one thing that must never happen: reporting a copy that did not.
      await expect(copy).not.toHaveText("Copied");
      await shotOf(card, "credentials-copy-failed");

      // The credentials are still on screen, which is the point of failing
      // visibly rather than silently.
      const fields = await cardFields(page);
      expect(fields).toHaveLength(2);

      await page.getByRole("button", { name: "Done" }).click();
      await expect(card).toBeHidden({ timeout: 10_000 });
    } finally {
      await page.evaluate(() => {
        // @ts-expect-error — restoring the real accessor.
        delete navigator.clipboard;
      });
    }

    // A rejected clipboard write is handled, not thrown: nothing may reach the
    // console, and no request may have failed.
    expectClean(w, "clipboard failure");
  });

  test("the handover holds up in Arabic RTL and at 390px", async () => {
    await page.getByRole("button", { name: "Language" }).click();
    await page.getByRole("menuitem", { name: "Arabic" }).click();
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl", { timeout: 20_000 });

    try {
      await page.setViewportSize({ width: 390, height: 844 });

      // The sidebar collapses to a drawer at this width; the staff link lives
      // behind it.
      const openSidebar = page.getByRole("button", { name: /Open sidebar|فتح/ });
      if (await openSidebar.count()) await openSidebar.first().click();

      await page.locator('a[href="/staff"]:visible').first().click();
      const row = page.locator('[data-row="true"]').filter({ hasText: "Acceptance Handover AR" });
      await expect(row).toHaveCount(1, { timeout: 20_000 });
      await row.getByRole("button", { name: /Row actions|إجراءات/ }).click();
      await page.getByRole("menuitem", { name: "إنشاء وصول المشغل" }).click();
      await page.getByRole("button", { name: "إنشاء وصول المشغل" }).click();

      const card = page.getByTestId("credentials-card");
      await expect(card).toBeVisible({ timeout: 20_000 });

      const fields = await cardFields(page);
      expect(fields.map((f) => f.label), "the labels must be the Arabic ones").toEqual([
        "الهاتف",
        "كلمة المرور الأولية",
      ]);
      await expect(page.getByTestId("credentials-card-copy")).toHaveText("نسخ التفاصيل");
      await expect(page.getByRole("button", { name: "تم" })).toBeVisible();

      // The defect this exists for. Under an inherited `rtl` a weak-direction
      // phone number paints as `212600112255+` unless the value isolates its own
      // direction — the DOM is identical either way, so only the painted order
      // can tell the difference.
      const painted = await card.evaluate((el) => {
        const dd = el.querySelectorAll("dd")[0] as HTMLElement;
        const text = dd.textContent ?? "";
        const node = dd.firstChild;
        if (!node) return "";
        const at: Array<[string, number]> = [];
        for (let i = 0; i < text.length; i += 1) {
          const range = document.createRange();
          range.setStart(node, i);
          range.setEnd(node, i + 1);
          at.push([text[i], range.getBoundingClientRect().left]);
        }
        return at.sort((a, b) => a[1] - b[1]).map(([c]) => c).join("");
      });
      expect(painted, "the phone number must paint left-to-right under RTL").toBe(
        "+212600112255",
      );

      expect(await overflowOf(page), "no horizontal scroll at 390px").toBeLessThanOrEqual(1);
      const dialogOverflow = await page
        .locator('[data-slot="dialog-content"]')
        .first()
        .evaluate((el) => el.scrollWidth - el.clientWidth);
      expect(dialogOverflow, "the dialog itself must not scroll sideways").toBeLessThanOrEqual(1);

      await shotOf(card, "credentials-ar-mobile");
      await shot(page, "credentials-ar-mobile-page");

      await page.getByRole("button", { name: "تم" }).click();
      await expect(card).toBeHidden({ timeout: 10_000 });
    } finally {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.getByRole("button", { name: /Language|اللغة/ }).click();
      await page.getByRole("menuitem", { name: "الإنجليزية" }).click();
      await expect(page.locator("html")).toHaveAttribute("dir", "ltr", { timeout: 20_000 });
    }

    expectClean(w, "Arabic RTL handover");
  });
});
