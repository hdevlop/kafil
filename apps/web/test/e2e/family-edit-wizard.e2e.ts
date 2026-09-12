import {
  expect,
  request as playwrightRequest,
  test,
  type Page,
} from "@playwright/test";

import {
  phase6BrowserPassword,
  phase6BrowserUsers,
} from "../../scripts/phase6-e2e-fixtures";

const baseUrl = process.env.KAFIL_E2E_BASE_URL ?? "http://127.0.0.1:3210";

test.setTimeout(480_000);

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

function uniqueFamily() {
  const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 8);
  const phoneDigits = `${suffix.replace(/[^0-9]/g, "")}41592638`.slice(0, 8);
  const cinDigits = `${suffix.replace(/[^0-9]/g, "")}1234567`.slice(0, 7);
  return {
    suffix,
    name: `Wizard Family ${suffix}`,
    email: `family-edit-${suffix}@example.test`,
    phone: `+2126${phoneDigits}`,
    cin: `WZ${cinDigits}`,
    initialAddress: "12 Edit Wizard Street, Casablanca",
    updatedAddress: `34 Wizard Ave ${suffix}, Casablanca`,
    updatedNotes: `Wizard notes ${suffix}`,
  };
}

async function login(page: Page, identifier: string, password: string) {
  const loginResponse = await page.request.post(`${baseUrl}/api/auth/login`, {
    data: { identifier, password },
  });
  if (!loginResponse.ok()) {
    throw new Error(`Browser login failed with ${loginResponse.status()}`);
  }
  await page.goto("/dashboard", { waitUntil: "commit" });
  await page.waitForURL(/\/dashboard$/, { timeout: 120000 });
  await page.waitForLoadState("domcontentloaded");
}

async function attachDiagnostics(page: Page) {
  const errors: string[] = [];
  const failed: string[] = [];
  const badResponses: Array<{ method: string; path: string; status: number }> = [];
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

async function createDisposableFamily(
  page: Page,
  family: ReturnType<typeof uniqueFamily>,
) {
  const response = await page.request.post(`${baseUrl}/api/families`, {
    data: {
      name: family.name,
      email: family.email,
      guardianCin: family.cin,
      guardianDateOfBirth: "1987-03-12",
      exactAddress: family.initialAddress,
      phone: family.phone,
      housingSituation: "rented",
      registrationDate: todayInput(),
      supportPriority: "normal",
      fundingTargetMinor: 640000,
      initialChildren: [],
      relationshipToChildren: "Mother",
      notes: "Initial notes",
    },
  });
  if (!response.ok()) {
    throw new Error(`Family setup failed with ${response.status()}`);
  }
  const body = (await response.json()) as
    | { data?: { id?: string }; id?: string };
  const id =
    typeof body === "object" && body !== null
      ? (body.data?.id ?? body.id ?? "")
      : "";
  if (!id) throw new Error("Family setup returned no id");
  return id;
}

async function deleteDisposableFamily(familyId: string) {
  const adminApi = await playwrightRequest.newContext({ baseURL: baseUrl });
  try {
    const loginResponse = await adminApi.post("/api/auth/login", {
      data: {
        identifier: phase6BrowserUsers.admin,
        password: phase6BrowserPassword,
      },
    });
    if (!loginResponse.ok()) {
      throw new Error(`Admin cleanup login failed with ${loginResponse.status()}`);
    }
    const loginBody = (await loginResponse.json()) as {
      data?: { accessToken?: string; access_token?: string };
      accessToken?: string;
      access_token?: string;
    };
    const accessToken =
      loginBody.accessToken ??
      loginBody.access_token ??
      loginBody.data?.accessToken ??
      loginBody.data?.access_token ??
      "";
    if (!accessToken) throw new Error("Admin cleanup login returned no token");
    const response = await adminApi.delete(`/api/families/${familyId}`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(response.ok()).toBe(true);
  } finally {
    await adminApi.dispose();
  }
}

async function visibleSearch(page: Page) {
  const candidates = page.getByPlaceholder(/Search|Rechercher|بحث|البحث/i);
  const count = await candidates.count();
  for (let index = 0; index < count; index += 1) {
    const candidate = candidates.nth(index);
    if (await candidate.isVisible()) return candidate;
  }
  throw new Error("Visible family search input not found");
}

async function filterToFamily(page: Page, familyName: string) {
  const search = await visibleSearch(page);
  const filtered = page.waitForResponse(
    (response) => {
      const url = new URL(response.url());
      return (
        url.pathname === "/api/families" &&
        (url.searchParams.get("search") ?? "").length > 0 &&
        response.ok()
      );
    },
    { timeout: 60000 },
  );
  await search.fill(familyName);
  await filtered;
}

function familyCard(page: Page, familyName: string) {
  return page
    .locator("div")
    .filter({ hasText: familyName })
    .filter({ has: page.getByRole("button", { name: /Row actions|إجراءات/ }) })
    .last();
}

async function openEditForFamily(page: Page, familyName: string) {
  await page.goto("/family", { waitUntil: "commit" });
  await expect(
    page.getByRole("heading", { name: "Families" }).first(),
  ).toBeVisible();
  await expect(
    page.getByText("Loading families...", { exact: true }),
  ).toBeHidden();
  await filterToFamily(page, familyName);
  const card = familyCard(page, familyName);
  await expect(card).toBeVisible();
  const actions = card.getByRole("button", { name: "Row actions" });
  await expect(actions).toHaveCount(1);
  await actions.click();
  await page.getByRole("menuitem", { name: /Edit|Modifier|تعديل/i }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  return dialog;
}

test("family edit wizard persists profile changes on desktop", async ({
  page,
  context,
}) => {
  const diagnostics = await attachDiagnostics(page);
  await context.addCookies([
    { name: "kafil-ui-language", value: "en", url: baseUrl },
  ]);
  await page.setViewportSize({ width: 1280, height: 800 });
  await login(page, phase6BrowserUsers.operator, phase6BrowserPassword);

  const family = uniqueFamily();
  const familyId = await createDisposableFamily(page, family);
  try {
    const dialog = await openEditForFamily(page, family.name);

    const viewport = page.viewportSize() ?? { width: 1280, height: 800 };
    const box = await dialog.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
    }
    const documentScrolls = await page.evaluate(
      () =>
        document.documentElement.scrollHeight >
        document.documentElement.clientHeight + 2,
    );
    expect(documentScrolls).toBe(false);

    await expect(dialog.locator("#step-guardian")).toBeVisible();
    await expect(page.getByLabel("Guardian name")).toBeVisible();
    await expect(page.getByLabel("Guardian CIN")).toBeVisible();
    await expect(page.getByLabel("Housing situation")).toHaveCount(0);
    await expect(page.getByLabel(/Max orders per month/)).toHaveCount(0);
    await expect(page.getByLabel(/Max budget per order/)).toHaveCount(0);
    await expect(page.getByLabel(/Monthly budget in MAD/)).toHaveCount(0);
    await expect(page.getByLabel("Child's legal name")).toHaveCount(0);

    const nextButton = dialog.getByRole("button", { name: "Next" });
    await expect(nextButton).toBeVisible();
    await page.getByLabel("Guardian name").fill("");
    await nextButton.focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByText("Enter the account holder's name"),
    ).toBeVisible();
    await expect(dialog.locator("#step-guardian")).toBeVisible();
    await expect(page.getByLabel("Guardian name")).toBeFocused();

    await page.getByLabel("Guardian name").fill(family.name);
    await expect(page.getByLabel("Guardian CIN")).toHaveValue(family.cin);
    await dialog.getByRole("button", { name: "Next" }).click();
    await expect(dialog.locator("#step-household")).toBeVisible();
    await expect(page.getByLabel("Guardian name")).toHaveCount(0);

    await dialog.getByRole("button", { name: "Previous" }).click();
    await expect(dialog.locator("#step-guardian")).toBeVisible();
    await expect(page.getByLabel("Guardian name")).toHaveValue(family.name);
    await expect(page.getByLabel("Guardian CIN")).toHaveValue(family.cin);

    await dialog.getByRole("button", { name: "Next" }).click();
    await expect(dialog.locator("#step-household")).toBeVisible();

    await expect(page.getByLabel(/Max orders per month/)).toHaveCount(0);
    await expect(page.getByLabel(/Max budget per order/)).toHaveCount(0);
    await expect(page.getByLabel(/Monthly budget in MAD/)).toHaveCount(0);
    await expect(page.getByLabel("Household exact address")).toBeVisible();
    await expect(page.getByLabel("Delivery latitude")).toBeVisible();
    await expect(page.getByLabel("Delivery longitude")).toBeVisible();

    const stepViewport = dialog.locator("#step-household");
    const overflow = await stepViewport.evaluate((element) => ({
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
    }));
    expect(overflow.scrollHeight).toBeGreaterThan(overflow.clientHeight);

    await stepViewport.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await expect(page.getByLabel("Internal family notes")).toBeVisible();
    await expect(page.getByLabel("Household exact address")).toBeVisible();
    await expect(page.getByLabel("Delivery latitude")).toBeVisible();
    await expect(page.getByLabel("Delivery longitude")).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: "Save family profile" }),
    ).toBeVisible();

    await page.getByLabel("Internal family notes").fill(family.updatedNotes);
    await page.getByLabel("Household exact address").fill(family.updatedAddress);
    await page.getByLabel("Delivery latitude").fill("33.5731");
    await page.getByLabel("Delivery longitude").fill("-7.5898");

    let putCount = 0;
    page.on("request", (request) => {
      if (
        request.method() === "PUT" &&
        new URL(request.url()).pathname === `/api/families/${familyId}`
      ) {
        putCount += 1;
      }
    });
    const putResponse = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === `/api/families/${familyId}` &&
        response.request().method() === "PUT" &&
        response.ok(),
    );
    const saveButton = dialog.getByRole("button", {
      name: "Save family profile",
    });
    await saveButton.focus();
    await saveButton.click();
    await page.keyboard.press("Enter");
    await putResponse;
    await page.waitForTimeout(1000);
    expect(putCount).toBe(1);
    await expect(dialog).toBeHidden({ timeout: 30000 });

    const detailResponse = await page.request.get(
      `${baseUrl}/api/families/${familyId}`,
    );
    expect(detailResponse.ok()).toBe(true);
    const detailBody = (await detailResponse.json()) as
      | { data?: Record<string, unknown>; [key: string]: unknown };
    const detail =
      typeof detailBody === "object" && detailBody !== null && "data" in detailBody
        ? (detailBody.data as Record<string, unknown>)
        : (detailBody as Record<string, unknown>);
    expect(detail["exactAddress"]).toBe(family.updatedAddress);
    expect(detail["notes"]).toBe(family.updatedNotes);
    expect(detail["deliveryLatitude"]).toBe(33.5731);
    expect(detail["deliveryLongitude"]).toBe(-7.5898);

    await page.getByRole("button", { name: "Create family" }).first().click();
    const createDialog = page.getByRole("dialog", {
      name: "Create family account",
    });
    await expect(createDialog).toBeVisible();
    await expect(createDialog.getByLabel(/Max orders per month/)).toBeVisible();
    await expect(createDialog.getByLabel(/Max budget per order/)).toHaveCount(0);
    await expect(createDialog.getByLabel(/Monthly budget in MAD/)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(createDialog).toBeHidden();

    diagnostics.assertClean();
  } finally {
    await deleteDisposableFamily(familyId);
  }
});

test("family edit wizard stays usable in Arabic RTL on mobile", async ({
  page,
  context,
}) => {
  const diagnostics = await attachDiagnostics(page);
  await context.addCookies([
    { name: "kafil-ui-language", value: "ar", url: baseUrl },
  ]);
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, phase6BrowserUsers.operator, phase6BrowserPassword);

  const family = uniqueFamily();
  const familyId = await createDisposableFamily(page, family);
  try {
    await page.goto("/family", { waitUntil: "commit" });
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(
      page.getByText(/Loading families|جارٍ تحميل الأسر/),
    ).toBeHidden();
    await filterToFamily(page, family.name);
    const card = familyCard(page, family.name);
    await expect(card).toBeVisible();
    const mobileActions = card.getByRole("button", { name: /Row actions|إجراءات/ });
    await expect(mobileActions).toHaveCount(1);
    await mobileActions.click();
    await page.getByRole("menuitem", { name: /تعديل|Edit/ }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    const viewport = page.viewportSize() ?? { width: 390, height: 844 };
    const box = await dialog.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.x).toBeGreaterThanOrEqual(-1);
      expect(box.y).toBeGreaterThanOrEqual(-1);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 2);
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 2);
    }

    const nextButton = dialog.getByRole("button", { name: /التالي/ });
    await expect(nextButton).toBeVisible();
    await nextButton.focus();
    await expect(nextButton).toBeFocused();
    await page.keyboard.press("Enter");
    const householdStep = dialog.locator("#step-household");
    await expect(householdStep).toBeVisible();

    const overflow = await householdStep.evaluate((element) => ({
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
    }));
    expect(overflow.scrollHeight).toBeGreaterThanOrEqual(overflow.clientHeight);
    await householdStep.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    const footerSave = dialog.getByRole("button", { name: /حفظ|Save/ });
    await expect(footerSave.first()).toBeVisible();

    const previousButton = dialog.getByRole("button", { name: /السابق/ });
    await previousButton.focus();
    await expect(previousButton).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(dialog.locator("#step-guardian")).toBeVisible();

    await page.keyboard.press("Escape");
    diagnostics.assertClean();
  } finally {
    await deleteDisposableFamily(familyId);
  }
});
