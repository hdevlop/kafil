import {
  expect,
  test,
  type Browser,
  type Locator,
  type Page,
} from "@playwright/test";

const baseUrl = process.env.KAFIL_E2E_BASE_URL ?? "http://127.0.0.1:3210";
const adminEmail = process.env.KAFIL_ADMIN_EMAIL ?? "";
const adminPassword = process.env.KAFIL_ADMIN_PASSWORD ?? "";

test.setTimeout(360_000);

function watch(page: Page) {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];
  const failedResponses: string[] = [];

  page.on("pageerror", (error) => pageErrors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("requestfailed", (request) => {
    const reason = request.failure()?.errorText ?? "unknown failure";
    if (!reason.includes("ERR_ABORTED")) {
      failedRequests.push(
        `${request.method()} ${new URL(request.url()).pathname}: ${reason}`,
      );
    }
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      failedResponses.push(
        `${response.status()} ${response.request().method()} ${new URL(response.url()).pathname}`,
      );
    }
  });

  return {
    expectClean(note: string) {
      expect(pageErrors, `${note}: uncaught page errors`).toEqual([]);
      expect(consoleErrors, `${note}: console errors`).toEqual([]);
      expect(failedRequests, `${note}: failed requests`).toEqual([]);
      expect(failedResponses, `${note}: failed responses`).toEqual([]);
    },
  };
}

async function afterTwoFrames(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
}

async function signIn(page: Page) {
  expect(adminEmail, "KAFIL_ADMIN_EMAIL must be set").not.toBe("");
  expect(adminPassword, "KAFIL_ADMIN_PASSWORD must be set").not.toBe("");

  await page.goto("/login", { waitUntil: "networkidle" });
  await page.getByLabel("Email or phone").fill(adminEmail);
  await page.getByPlaceholder("Enter your password").fill(adminPassword);

  const submit = page.getByRole("button", { name: "Log in" });
  const response = page.waitForResponse(
    (candidate) =>
      new URL(candidate.url()).pathname === "/api/auth/login" &&
      candidate.request().method() === "POST",
  );
  await submit.click();
  expect((await response).status(), "admin login must succeed").toBe(200);
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function openSettings(page: Page) {
  await page.goto("/settings", { waitUntil: "networkidle" });
  const dialog = page.getByRole("dialog").filter({ hasText: "App settings" });
  await expect(dialog).toBeVisible();

  // `najm-kit` 2.11.17 renders the SwitchInput label beside the Radix switch
  // without associating it as an accessible name, so the app-settings sheet's
  // single switch is the stable installed-contract locator here.
  const formFill = dialog.getByRole("switch");
  await expect(formFill).toBeVisible();
  return { dialog, formFill };
}

async function persistFormFill(
  page: Page,
  dialog: Locator,
  formFill: Locator,
  enabled: boolean,
) {
  if ((await formFill.isChecked()) === enabled) return;

  await formFill.click();
  await expect(formFill).toBeChecked({ checked: enabled });
  const response = page.waitForResponse(
    (candidate) =>
      new URL(candidate.url()).pathname === "/api/settings" &&
      candidate.request().method() === "PUT",
  );
  const save = dialog.getByRole("button", { name: "Save settings" });
  await expect(save).toBeEnabled();
  await save.click();
  expect((await response).status(), "platform settings save must succeed").toBe(
    200,
  );
  await expect(formFill).toBeChecked({ checked: enabled });
}

async function expectPublicFormFill(browser: Browser, enabled: boolean) {
  const context = await browser.newContext();
  await context.addCookies([
    { name: "kafil-ui-language", value: "en", url: baseUrl },
  ]);
  const page = await context.newPage();
  const diagnostics = watch(page);

  try {
    await page.addInitScript(() => {
      window.addEventListener("keydown", (event) => {
        document.documentElement.dataset.lastKey = event.key;
      });
    });
    await page.goto("/apply", { waitUntil: "networkidle" });

    const name = page.getByPlaceholder("Enter your full name");
    const email = page.getByPlaceholder("Enter your email address");
    const phone = page.getByPlaceholder(/For example: \+212/);
    const cin = page.getByPlaceholder("For example: AB123456");
    const password = page.getByPlaceholder("At least 8 characters");

    await expect(name).toHaveValue("");
    const initialValues = await Promise.all(
      [name, email, phone, cin, password].map((input) => input.inputValue()),
    );
    await afterTwoFrames(page);
    await page.keyboard.press("F8");
    await expect(page.locator("html")).toHaveAttribute("data-last-key", "F8");

    if (enabled) {
      await expect(name).not.toHaveValue("");
      await expect(email).toHaveValue(/@/);
      await expect(phone).not.toHaveValue("");
      await expect(cin).not.toHaveValue("");
      await expect(password).toHaveValue("KafilDev123");
    } else {
      await expect(name).toHaveValue(initialValues[0]);
      await expect(email).toHaveValue(initialValues[1]);
      await expect(phone).toHaveValue(initialValues[2]);
      await expect(cin).toHaveValue(initialValues[3]);
      await expect(password).toHaveValue(initialValues[4]);
    }

    diagnostics.expectClean(
      `public form with form-fill ${enabled ? "enabled" : "disabled"}`,
    );
  } finally {
    await context.close();
  }
}

test("the persisted setting controls F8 on a public form", async ({ browser }) => {
  const adminContext = await browser.newContext();
  await adminContext.addCookies([
    { name: "kafil-ui-language", value: "en", url: baseUrl },
  ]);
  const adminPage = await adminContext.newPage();
  const diagnostics = watch(adminPage);
  let original: boolean | undefined;

  try {
    await signIn(adminPage);
    let settings = await openSettings(adminPage);
    original = await settings.formFill.isChecked();

    await persistFormFill(adminPage, settings.dialog, settings.formFill, true);
    await expectPublicFormFill(browser, true);

    settings = await openSettings(adminPage);
    await persistFormFill(adminPage, settings.dialog, settings.formFill, false);
    await expectPublicFormFill(browser, false);

    diagnostics.expectClean("admin setting updates");
  } finally {
    if (original !== undefined) {
      const settings = await openSettings(adminPage);
      await persistFormFill(
        adminPage,
        settings.dialog,
        settings.formFill,
        original,
      );
    }
    await adminContext.close();
  }
});
