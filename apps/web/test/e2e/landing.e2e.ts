import { resolve } from "node:path";

import { expect, test, type Locator, type Page } from "@playwright/test";

const baseUrl = process.env.KAFIL_E2E_BASE_URL ?? "http://127.0.0.1:3210";
const evidenceDirectory = resolve(
  process.cwd(),
  "../../docs/evidence/landing-page/2026-09-08",
);
test.setTimeout(180_000);

type ExpectedResponse = { count: number; consumed: number; key: string };
type ExpectedConsoleError = { consumed: number; path: string; status: number };

function watch(page: Page) {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];
  const failedResponses: string[] = [];
  const expectedResponses: ExpectedResponse[] = [];
  const expectedConsoleErrors: ExpectedConsoleError[] = [];

  // Exact negative-path allowances only. Unknown anonymous endpoints must
  // fail the run rather than hide behind a broad filter.
  const allow = (status: number, method: string, path: string, count = 1) => {
    expectedResponses.push({ count, consumed: 0, key: `${status} ${method} ${path}` });
    expectedConsoleErrors.push({ consumed: 0, path, status });
  };

  page.on("pageerror", (error) => pageErrors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    // Next.js development-only noise: the dev HotReload overlay injects a
    // nonce-bearing script whose server-rendered nonce ("") mismatches the
    // client nonce, producing a React hydration warning on cold dev
    // navigations. It names HotReload explicitly, touches no landing markup,
    // and cannot occur in production builds (no dev overlay). Any other
    // hydration warning still fails the run.
    if (
      text.includes("A tree hydrated but some attributes") &&
      text.includes("HotReload") &&
      text.includes('nonce=""')
    ) {
      return;
    }
    const statusMatch = text.match(
      /^Failed to load resource: the server responded with a status of (\d+)\b/,
    );
    const locationUrl = message.location().url;
    const path = locationUrl ? new URL(locationUrl).pathname : "";
    const allowance = statusMatch
      ? expectedConsoleErrors.find(
          (entry) =>
            entry.consumed === 0 &&
            entry.status === Number(statusMatch[1]) &&
            entry.path === path,
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
      ).toEqual(expectedResponses.map(({ count, key }) => ({ consumed: count, count, key })));
    },
  };
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

async function overflowOf(page: Page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

// The carousel's accessible name is localized, so scope by the
// locale-independent roledescription token instead of the English label.
async function heroImageSources(page: Page): Promise<string[]> {
  return page
    .locator('[aria-roledescription="carousel"]')
    .locator("img")
    .evaluateAll((images) => images.map((image) => (image as HTMLImageElement).currentSrc));
}

async function heroPosition(page: Page): Promise<string> {
  return (await page.locator("#landing-hero-position").textContent())?.trim() ?? "";
}

async function scrollIntoViewAndExpectDecoded(target: Locator, note: string) {
  await target.scrollIntoViewIfNeeded();
  await expect
    .poll(
      () =>
        target.evaluate(
          (element) =>
            (element as HTMLImageElement).complete && (element as HTMLImageElement).naturalWidth > 0,
        ),
      { message: `${note} must decode`, timeout: 15_000 },
    )
    .toBe(true);
}

async function prepareLandingScreenshot(page: Page) {
  const images = page.locator("main img");
  for (let position = 0; position < (await images.count()); position += 1) {
    const image = images.nth(position);
    if (await image.isVisible()) {
      await scrollIntoViewAndExpectDecoded(image, `screenshot image ${position}`);
    }
  }
  await page.evaluate(() => window.scrollTo(0, 0));
}

test.describe("landing static content", () => {
  test("signed-out landing renders one H1 and all major sections", async ({ page }) => {
    const diagnostics = watch(page);
    await page.goto("/", { waitUntil: "commit" });

    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(
      page.getByRole("heading", { name: "Transparent giving. Real goods. Real impact." }),
    ).toBeVisible();
    // The reference layout keeps the proof-strip title visually hidden; its
    // accessible heading and the real how-it-works anchor remain in the DOM.
    await expect(page.getByRole("heading", { name: "Why sponsors trust Kafil" })).toBeAttached();
    await expect(page.locator("#how-it-works")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Family examples" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Be the reason a family smiles." })).toBeVisible();

    // Illustrative disclosure is visible; fictional cards carry Example badges.
    await expect(page.getByText("Illustrative examples").first()).toBeVisible();
    expect(await page.getByText("Example", { exact: true }).count()).toBeGreaterThanOrEqual(8);

    // No fabricated claims, Verified badges, newsletter, or dead links.
    await expect(page.getByText("Verified", { exact: true })).toHaveCount(0);
    await expect(page.getByText(/newsletter/i)).toHaveCount(0);
    await expect(page.getByRole("button", { name: /subscribe/i })).toHaveCount(0);
    await expect(page.locator('main a[href="#"]')).toHaveCount(0);

    diagnostics.expectClean("static landing content");
  });

  test("landing images decode after scrolled into view", async ({ page }) => {
    const diagnostics = watch(page);
    await page.goto("/", { waitUntil: "commit" });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const heroImages = page.getByRole("region", { name: "Family support highlights" }).locator("img");
    expect(await heroImages.count()).toBeGreaterThanOrEqual(1);
    for (let position = 0; position < (await heroImages.count()); position += 1) {
      await scrollIntoViewAndExpectDecoded(heroImages.nth(position), `hero image ${position}`);
    }

    const familyImages = page.getByRole("img", { name: /fictional family example/ });
    expect(await familyImages.count()).toBe(8);
    for (let position = 0; position < 8; position += 1) {
      await scrollIntoViewAndExpectDecoded(familyImages.nth(position), `family example ${position}`);
    }

    const mascot = page.locator('img[src*="mascot-heart-gift"]');
    await expect(mascot).toHaveCount(1);
    await scrollIntoViewAndExpectDecoded(mascot, "CTA mascot");
    // The decorative mascot exposes no duplicate accessible name.
    await expect(page.getByRole("img", { name: /mascot|gift/i })).toHaveCount(0);

    diagnostics.expectClean("landing image decoding");
  });
});

test.describe("landing navigation", () => {
  test("sponsor and sign-in actions reach real routes", async ({ page }) => {
    const diagnostics = watch(page);
    await page.goto("/", { waitUntil: "commit" });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const applyResponse = page.waitForResponse(
      (response) => new URL(response.url()).pathname === "/apply" && response.request().method() === "GET",
    );
    await page.getByRole("link", { name: "Sponsor a family" }).first().click();
    expect((await applyResponse).status(), "apply navigation must succeed").toBeLessThan(400);
    await expect(page).toHaveURL(/\/apply$/);

    await page.goto("/", { waitUntil: "commit" });
    const loginResponse = page.waitForResponse(
      (response) => new URL(response.url()).pathname === "/login" && response.request().method() === "GET",
    );
    await page.getByRole("link", { name: "Sign in" }).first().click();
    expect((await loginResponse).status(), "login navigation must succeed").toBeLessThan(400);
    await expect(page).toHaveURL(/\/login$/);

    diagnostics.expectClean("landing route navigation");
  });

  test("header and footer in-page links reach their sections", async ({ page }) => {
    const diagnostics = watch(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "commit" });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const header = page.getByRole("navigation", { name: "Landing" }).first();
    await header.getByRole("link", { name: "Family examples" }).click();
    await expect(page).toHaveURL(/#families$/);
    await expect(page.locator("#families")).toBeVisible();

    await header.getByRole("link", { name: "How it works" }).click();
    await expect(page).toHaveURL(/#how-it-works$/);
    await expect(page.locator("#how-it-works")).toBeVisible();

    await header.getByRole("link", { name: "Contact" }).click();
    await expect(page).toHaveURL(/#contact$/);
    await expect(page.locator("#contact")).toBeVisible();

    diagnostics.expectClean("landing in-page navigation");
  });

  test("keyboard traversal uses the skip link and preserves focus", async ({ page }) => {
    const diagnostics = watch(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "commit" });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toBeFocused();
    await skip.press("Enter");
    await expect(page).toHaveURL(/#landing-main$/);
    await expect(page.locator("#landing-main")).toBeVisible();
    // The main landmark is programmatically focusable (tabIndex -1), so
    // keyboard focus — not just the URL hash — reaches the main content.
    await expect(page.locator("#landing-main"), "skip link must move focus to main").toBeFocused();

    const familiesLink = page
      .getByRole("navigation", { name: "Landing" })
      .first()
      .getByRole("link", { name: "Family examples" });
    await waitForReactHandler(familiesLink);
    await familiesLink.focus();
    await expect(familiesLink).toBeFocused();
    await familiesLink.press("Enter");
    await expect(page).toHaveURL(/#families$/);
    await expect(familiesLink, "focus must survive in-page navigation").toBeFocused();

    diagnostics.expectClean("landing keyboard traversal");
  });
});

test.describe("landing responsive layout", () => {
  for (const viewport of [
    { width: 375, height: 812 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
  ]) {
    test(`no overflow or CTA overlap at ${viewport.width}px`, async ({ page }) => {
      const diagnostics = watch(page);
      await page.setViewportSize(viewport);
      await page.goto("/", { waitUntil: "commit" });
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

      expect(await overflowOf(page), `horizontal overflow at ${viewport.width}px`).toBeLessThanOrEqual(1);

      const mascot = page.locator('img[src*="mascot-heart-gift"]');
      await mascot.scrollIntoViewIfNeeded();
      const boxes = await page.evaluate(() => {
        const rect = (selector: string) => {
          const element = document.querySelector(selector);
          if (!element) return null;
          const box = element.getBoundingClientRect();
          return { x: box.x, y: box.y, width: box.width, height: box.height };
        };
        return {
          mascot: rect('img[src*="mascot-heart-gift"]'),
          title: rect("#landing-cta-title"),
          actions: rect("#landing-cta-title ~ div, section[aria-labelledby='landing-cta-title'] a"),
        };
      });
      expect(boxes.mascot, "CTA mascot must render").toBeTruthy();
      expect(boxes.title, "CTA title must render").toBeTruthy();
      const overlaps = (a: { x: number; y: number; width: number; height: number }, b: typeof a) =>
        a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
      if (boxes.mascot && boxes.title && boxes.actions) {
        expect(overlaps(boxes.mascot, boxes.title), "mascot must not overlap the CTA title").toBe(false);
        expect(overlaps(boxes.mascot, boxes.actions), "mascot must not overlap CTA actions").toBe(false);
      }

      if (viewport.width === 375 || viewport.width === 1440) {
        await prepareLandingScreenshot(page);
        await page.screenshot({
          animations: "disabled",
          fullPage: true,
          path: resolve(evidenceDirectory, `landing-en-${viewport.width}px.png`),
        });
      }

      diagnostics.expectClean(`responsive landing at ${viewport.width}px`);
    });
  }
});

test.describe("landing preferences", () => {
  test("the language control switches to Arabic RTL with the Arabic hero manifest", async ({
    page,
  }) => {
    const diagnostics = watch(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "commit" });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await heroPosition(page)).toBe("Slide 1 of 2");
    // Wait for the optimized hero image to resolve: on a cold dev server the
    // first `/_next/image` optimization can lag behind the heading, leaving
    // `currentSrc` empty at first paint.
    await expect
      .poll(
        async () => (await heroImageSources(page)).some((src) => src.includes("hero-family_en")),
        { message: "the English hero image must resolve", timeout: 30_000 },
      )
      .toBe(true);

    const language = page.getByRole("button", { name: "Language" });
    await waitForReactHandler(language);
    await language.click();
    const arabic = page.getByRole("menuitem", { name: /Arabic/ });
    await expect(arabic).toBeVisible();
    const preferenceResponse = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/api/ui-language" &&
        response.request().method() === "POST",
    );
    await arabic.click();

    // `changeLanguage` remounts the hero synchronously before the persistence
    // POST resolves, so assert the reset immediately: waiting for the POST
    // (which compiles `/api/ui-language` on a cold dev server) would let the
    // five-second rotation advance past slide 1 first.
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("heading", { name: "عطاء شفاف. سلع حقيقية. أثر حقيقي." })).toBeVisible();
    expect(await heroPosition(page)).toBe("الشريحة 1 من 2");

    const response = await preferenceResponse;
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ language: "ar" });

    // The hero uses the Arabic manifest and never shows English or French
    // embedded-text artwork while Arabic is active. The position may have
    // advanced past slide 1 during the slow persistence round-trip, so the
    // manifest assertion below checks artwork ownership, not the counter.
    await expect
      .poll(
        async () => (await heroImageSources(page)).some((src) => src.includes("hero-family_ar")),
        { message: "the Arabic hero image must resolve", timeout: 30_000 },
      )
      .toBe(true);
    const sources = await heroImageSources(page);
    expect(sources.some((src) => src.includes("hero-family_ar"))).toBe(true);
    expect(sources.some((src) => src.includes("hero-family_en"))).toBe(false);
    expect(sources.some((src) => src.includes("hero-family_fr"))).toBe(false);

    diagnostics.expectClean("landing Arabic RTL");
  });

  test("Arabic RTL mirrors the CTA while DOM and keyboard order stay put", async ({ page }) => {
    const diagnostics = watch(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "commit" });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const placement = () =>
      page.evaluate(() => {
        const mascot = document.querySelector('img[src*="mascot-heart-gift"]');
        const title = document.querySelector("#landing-cta-title");
        if (!mascot || !title) return null;
        return {
          mascotX: mascot.getBoundingClientRect().x,
          titleX: title.getBoundingClientRect().x,
          mascotTransform: getComputedStyle(mascot).transform,
        };
      });
    await page.locator('img[src*="mascot-heart-gift"]').scrollIntoViewIfNeeded();
    const ltr = await placement();
    expect(ltr, "CTA placement must be measurable").toBeTruthy();
    expect(ltr!.mascotX).toBeLessThan(ltr!.titleX);
    // The mascot itself is never horizontally flipped; layout mirrors instead.
    expect(ltr!.mascotTransform).not.toContain("matrix(-1");

    await page.context().addCookies([{ name: "kafil-ui-language", value: "ar", url: baseUrl }]);
    await page.goto("/", { waitUntil: "commit" });
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await page.locator('img[src*="mascot-heart-gift"]').scrollIntoViewIfNeeded();
    const rtl = await placement();
    expect(rtl, "RTL CTA placement must be measurable").toBeTruthy();
    expect(rtl!.mascotX).toBeGreaterThan(rtl!.titleX);

    const domOrder = await page.evaluate(() => {
      const title = document.querySelector("#landing-cta-title");
      const firstAction = document.querySelector("section[aria-labelledby='landing-cta-title'] a");
      if (!title || !firstAction) return null;
      return title.compareDocumentPosition(firstAction);
    });
    // Heading precedes actions in DOM order under both directions.
    // DOCUMENT_POSITION_FOLLOWING is 4; Node is unavailable in the Node.js
    // test context, so the constant is inlined.
    expect(domOrder! & 4).toBeTruthy();

    await prepareLandingScreenshot(page);
    await page.screenshot({
      animations: "disabled",
      fullPage: true,
      path: resolve(evidenceDirectory, "landing-ar-rtl-1440px.png"),
    });

    diagnostics.expectClean("landing CTA RTL mirror");
  });

  test("the theme control persists across reload", async ({ page }) => {
    const diagnostics = watch(page);
    await page.goto("/", { waitUntil: "commit" });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const themeControl = page.getByRole("button", { name: "Toggle color theme" });
    await waitForReactHandler(themeControl);
    const themeResponse = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/api/ui-theme" && response.request().method() === "POST",
    );
    await themeControl.click();
    expect((await themeResponse).status()).toBe(200);
    await expect(page.locator("html")).toHaveClass(/\bdark\b/);

    await page.reload({ waitUntil: "commit" });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("html")).toHaveClass(/\bdark\b/);

    diagnostics.expectClean("landing theme persistence");
  });
});

test.describe("landing hero carousel", () => {
  test("the hero advances once within the rotation window and Pause holds it", async ({
    page,
  }) => {
    const diagnostics = watch(page);
    await page.goto("/", { waitUntil: "commit" });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const pauseControl = page.getByRole("button", { name: "Pause rotation" });
    await waitForReactHandler(pauseControl);
    expect(await heroPosition(page)).toBe("Slide 1 of 2");
    await expect
      .poll(() => heroPosition(page), {
        message: "the hero must advance to slide 2 within the rotation window",
        timeout: 15_000,
      })
      .toBe("Slide 2 of 2");

    await pauseControl.click();
    await expect(page.getByRole("button", { name: "Resume rotation" })).toBeVisible();
    await page.waitForTimeout(6000);
    expect(await heroPosition(page)).toBe("Slide 2 of 2");

    await page.getByRole("button", { name: "Next slide" }).click();
    expect(await heroPosition(page)).toBe("Slide 1 of 2");
    await page.getByRole("button", { name: "Previous slide" }).click();
    expect(await heroPosition(page)).toBe("Slide 2 of 2");

    diagnostics.expectClean("landing carousel rotation and pause");
  });
});

test.describe("landing hero carousel under reduced motion", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } });

  test("the hero stays on slide 1 while manual navigation still works", async ({ page }) => {
    const diagnostics = watch(page);
    await page.goto("/", { waitUntil: "commit" });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const nextControl = page.getByRole("button", { name: "Next slide" });
    await waitForReactHandler(nextControl);
    expect(await heroPosition(page)).toBe("Slide 1 of 2");
    await page.waitForTimeout(6500);
    expect(await heroPosition(page)).toBe("Slide 1 of 2");

    await nextControl.click();
    expect(await heroPosition(page)).toBe("Slide 2 of 2");

    const transitionProperty = await page
      .getByRole("region", { name: "Family support highlights" })
      .locator("div.absolute.inset-0")
      .first()
      .evaluate((element) => getComputedStyle(element).transitionProperty);
    expect(transitionProperty).toBe("none");

    diagnostics.expectClean("landing reduced-motion carousel");
  });
});
