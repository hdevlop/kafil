import { expect, test, type Page } from "@playwright/test";

type ProductRole = "family" | "operator" | "sponsor";

const browserUsers: Record<ProductRole, string> = {
  family: "phase6-browser-family@example.test",
  operator: "phase6-browser-operator@example.test",
  sponsor: "phase6-browser-sponsor@example.test",
};
const browserPassword = "Phase6BrowserPass1!";

async function useRole(page: Page, role: ProductRole, language = "en") {
  await page.context().addCookies([
    { name: "kafil-ui-language", value: language, url: "http://127.0.0.1:3210" },
  ]);
  await page.goto("/login");
  await page.getByLabel("Email or phone").fill(browserUsers[role]);
  await page.getByPlaceholder("Enter your password").fill(browserPassword);
  await page.getByRole("button", { name: "Log in" }).focus();
  await page.keyboard.press("Enter");
  await page.waitForURL(new RegExp(`/${role}$`));
}

function json(
  route: Parameters<Parameters<Page["route"]>[1]>[0],
  value: unknown,
) {
  return route.fulfill({
    contentType: "application/json",
    body: JSON.stringify(value),
  });
}

async function openCreateFamilyWizard(page: Page) {
  await page.route("**/api/families/**", async (route) => {
    const request = route.request();
    const { pathname } = new URL(request.url());
    const method = request.method();
    if (method === "GET" && pathname === "/api/families") {
      return json(route, { data: [], status: "success" });
    }
    if (method === "POST" && pathname === "/api/families") {
      return json(route, {
        data: {
          id: "family-wizard",
          initialPassword: "GeneratedPass1!",
          message: "Created",
        },
        status: "success",
      });
    }
    return json(route, { data: null, status: "success" });
  });

  await page.goto("/operator/families");
  await expect(
    page.getByRole("heading", { name: "Families" }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Create family" }).first().focus();
  await page.keyboard.press("Enter");

  const dialog = page.getByRole("dialog", { name: "Create family account" });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function pickDateField(page: Page, placeholder = "Pick a date") {
  await page.getByText(placeholder, { exact: true }).first().click();
  await page.waitForTimeout(200);
  await page
    .locator('button[class*="size-8"][class*="font-normal"]')
    .first()
    .click();
  await page.waitForTimeout(200);
}

test("family-create wizard renders three steps with active-step validation and value preservation", async ({
  page,
}) => {
  await useRole(page, "operator");

  const dialog = await openCreateFamilyWizard(page);

  await expect(dialog.getByText("Guardian", { exact: true }).first()).toBeVisible();
  await expect(dialog.locator("#step-guardian")).toBeVisible();
  await expect(page.getByLabel("Guardian name")).toBeVisible();
  await expect(page.getByLabel("Child's legal name")).toHaveCount(0);

  const nextButton = dialog.getByRole("button", { name: "Next" });
  await expect(nextButton).toBeVisible();

  await nextButton.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Enter the account holder's name")).toBeVisible();
  await expect(page.getByText("Enter the guardian's date of birth")).toBeVisible();
  await expect(page.getByText("Enter a valid email address")).toBeVisible();
  await expect(dialog.locator("#step-guardian")).toBeVisible();
  await expect(
    dialog.getByText("Registration date cannot be in the future"),
  ).toHaveCount(0);

  await page.getByLabel("Guardian name").fill("Mohammed El Amrani");
  await page.getByLabel("Guardian CIN").fill("AB123456");
  await page.getByLabel("Email").fill("Mohammed@example.test");
  await page.getByLabel("Household phone").fill("+212600000099");
  await pickDateField(page);

  await dialog.getByRole("button", { name: "Next" }).first().click();

  await expect(dialog.locator("#step-household")).toBeVisible();
  await expect(page.getByLabel("Guardian name")).toHaveCount(0);

  await dialog.getByRole("button", { name: "Previous" }).click();

  await expect(dialog.locator("#step-guardian")).toBeVisible();
  await expect(page.getByLabel("Guardian name")).toHaveValue("Mohammed El Amrani");
  await expect(page.getByLabel("Guardian CIN")).toHaveValue("AB123456");
  await expect(page.getByLabel("Email")).toHaveValue("Mohammed@example.test");
  await expect(page.getByLabel("Household phone")).toHaveValue("+212600000099");
});

test("family-create wizard shows paired rows on desktop and collapses to one column on mobile", async ({
  page,
}) => {
  await useRole(page, "operator");

  const dialog = await openCreateFamilyWizard(page);

  await page.getByLabel("Guardian name").fill("Mohammed El Amrani");
  await page.getByLabel("Guardian CIN").fill("AB123456");
  await page.getByLabel("Email").fill("Mohammed@example.test");
  await page.getByLabel("Household phone").fill("+212600000099");
  await pickDateField(page);

  await dialog.getByRole("button", { name: "Next" }).first().click();
  await expect(dialog.locator("#step-household")).toBeVisible();

  await page.setViewportSize({ width: 1280, height: 900 });
  const housingRow = await page.getByLabel("Housing situation").boundingBox();
  const registrationTrigger = dialog
    .locator("div.cursor-pointer")
    .filter({ hasText: "July 24th, 2026" })
    .first();
  await registrationTrigger.waitFor();
  const registrationRow = await registrationTrigger.boundingBox();
  expect(housingRow).not.toBeNull();
  expect(registrationRow).not.toBeNull();
  if (housingRow && registrationRow) {
    expect(Math.abs(housingRow.y - registrationRow.y)).toBeLessThan(20);
  }

  await page.setViewportSize({ width: 375, height: 812 });
  const housingMobile = await page.getByLabel("Housing situation").boundingBox();
  const registrationMobile = await dialog
    .locator("div.cursor-pointer")
    .filter({ hasText: "July 24th, 2026" })
    .first()
    .boundingBox();
  expect(housingMobile).not.toBeNull();
  expect(registrationMobile).not.toBeNull();
  if (housingMobile && registrationMobile) {
    expect(registrationMobile.y).toBeGreaterThan(housingMobile.y);
  }
  await expect(dialog.locator("#step-household")).toBeVisible();
});
