import { expect, test, type Locator, type Page } from "@playwright/test";

type ProductRole = "family" | "operator" | "sponsor";

const browserUsers: Record<ProductRole, string> = {
  family: "phase6-browser-family@example.test",
  operator: "phase6-browser-operator@example.test",
  sponsor: "phase6-browser-sponsor@example.test",
};
const browserPassword = "Phase6BrowserPass1!";

test.setTimeout(240_000);

async function useRole(page: Page, role: ProductRole, language = "en") {
  await page.context().addCookies([
    { name: "kafil-ui-language", value: language, url: process.env.KAFIL_E2E_BASE_URL ?? "http://127.0.0.1:3210" },
  ]);
  const loginResponse = await page.request.post("/api/auth/login", {
    data: {
      identifier: browserUsers[role],
      password: browserPassword,
    },
  });
  expect(loginResponse.ok()).toBe(true);
  await page.goto("/dashboard", { waitUntil: "commit" });
  await page.waitForURL(/\/dashboard$/);
  await page.waitForLoadState("domcontentloaded");
}

function householdPhone(dialog: Locator) {
  return dialog.getByLabel("Household phone", { exact: true });
}

// The phone input renders the dial code as a prefix and reparses on every
// keystroke, so type the local part instead of filling the whole number.
async function fillHouseholdPhone(page: Page, dialog: Locator, local: string) {
  const input = householdPhone(dialog);
  await input.click();
  await input.press("End");
  await page.keyboard.type(local);
}

async function expectHouseholdPhone(dialog: Locator, e164: string) {
  await expect
    .poll(async () =>
      (await householdPhone(dialog).inputValue()).replace(/[\s().-]+/g, ""),
    )
    .toBe(e164);
}


// The relationship dropdown is a Najm SelectInput: the visible box is inert and
// the real control is an overlaid combobox named by its placeholder, with the
// options portalled to the page rather than into the dialog.
function relationshipTrigger(dialog: Locator) {
  return dialog.getByRole("combobox", {
    name: "Select a relationship",
    exact: true,
  });
}

async function openRelationship(page: Page, dialog: Locator) {
  await relationshipTrigger(dialog).click();
  const listbox = page.getByRole("listbox");
  await expect(listbox).toBeVisible();
  return listbox;
}

async function expectRelationshipChecked(
  page: Page,
  dialog: Locator,
  label: string,
) {
  const listbox = await openRelationship(page, dialog);
  await expect(
    listbox.getByRole("option", { name: label, exact: true }),
  ).toHaveAttribute("data-state", "checked");
  await page.keyboard.press("Escape");
  await expect(listbox).toHaveCount(0);
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

  await page.goto("/family");
  await expect(
    page.getByRole("heading", { name: "Families" }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Create family" }).first().click();

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
  await fillHouseholdPhone(page, dialog, "600000099");
  await pickDateField(page);

  await dialog.getByRole("button", { name: "Next" }).first().click();

  await expect(dialog.locator("#step-household")).toBeVisible();
  await expect(page.getByLabel("Guardian name")).toHaveCount(0);

  await dialog.getByRole("button", { name: "Previous" }).click();

  await expect(dialog.locator("#step-guardian")).toBeVisible();
  await expect(page.getByLabel("Guardian name")).toHaveValue("Mohammed El Amrani");
  await expect(page.getByLabel("Guardian CIN")).toHaveValue("AB123456");
  await expect(page.getByLabel("Email")).toHaveValue("Mohammed@example.test");
  await expectHouseholdPhone(dialog, "+212600000099");
});

test("family-create wizard shows paired rows on desktop and collapses to one column on mobile", async ({
  page,
}) => {
  await useRole(page, "operator");

  const dialog = await openCreateFamilyWizard(page);

  await page.getByLabel("Guardian name").fill("Mohammed El Amrani");
  await page.getByLabel("Guardian CIN").fill("AB123456");
  await page.getByLabel("Email").fill("Mohammed@example.test");
  await fillHouseholdPhone(page, dialog, "600000099");
  await pickDateField(page);

  await dialog.getByRole("button", { name: "Next" }).first().click();
  await expect(dialog.locator("#step-household")).toBeVisible();

  await page.setViewportSize({ width: 1280, height: 900 });
  const householdStep = dialog.locator("#step-household");
  await expect(householdStep.getByLabel(/Housing situation/)).toBeVisible();
  await expect(householdStep.getByLabel(/registration date/i)).toBeVisible();
  await expect(householdStep.getByLabel(/Activation target/)).toBeVisible();
  await expect(householdStep.getByLabel(/Max orders per month/)).toBeVisible();
  await expect(householdStep.getByLabel(/exact address/i)).toBeVisible();
  const householdFields = householdStep
    .locator('div[class~="md:grid-cols-2"]')
    .first()
    .locator(":scope > *");
  const registrationTrigger = dialog
    .locator("#step-household")
    .getByText(/[A-Z][a-z]+ \d{1,2}(?:st|nd|rd|th), \d{4}/, {
      exact: true,
    });
  await registrationTrigger.waitFor();
  const [housingRow, registrationRow] = await householdFields.evaluateAll(
    (elements) =>
      elements.slice(0, 2).map((element) => {
        const rect = element.getBoundingClientRect();
        return { x: rect.x, y: rect.y };
      }),
  );
  expect(Math.abs(housingRow.y - registrationRow.y)).toBeLessThan(20);
  expect(registrationRow.x).toBeGreaterThan(housingRow.x);

  await page.setViewportSize({ width: 375, height: 812 });
  const [housingMobile, registrationMobile] = await householdFields.evaluateAll(
    (elements) =>
      elements.slice(0, 2).map((element) => {
        const rect = element.getBoundingClientRect();
        return { x: rect.x, y: rect.y };
      }),
  );
  expect(registrationMobile.y).toBeGreaterThan(housingMobile.y);
  await expect(dialog.locator("#step-household")).toBeVisible();
});

test("family-create wizard offers localized relationships, preserves the choice, and clears it", async ({
  page,
}) => {
  await useRole(page, "operator");

  const dialog = await openCreateFamilyWizard(page);

  // The label names the field; the combobox carries the placeholder as its
  // accessible name, so assert both rather than trusting one to imply the other.
  await expect(dialog.getByText("Relationship", { exact: true })).toBeVisible();
  await expect(relationshipTrigger(dialog)).toBeVisible();

  const listbox = await openRelationship(page, dialog);
  for (const label of [
    "Not provided",
    "Mother",
    "Father",
    "Grandmother",
    "Grandfather",
    "Aunt",
    "Uncle",
    "Sibling",
    "Legal guardian",
    "Other",
  ]) {
    await expect(
      listbox.getByRole("option", { name: label, exact: true }),
    ).toBeVisible();
  }
  await expect(listbox.getByRole("option")).toHaveCount(10);

  await listbox.getByRole("option", { name: "Mother", exact: true }).click();
  await expect(listbox).toHaveCount(0);

  // The choice must survive leaving and re-entering the step, like every other
  // guardian field the wizard already preserves.
  await page.getByLabel("Guardian name").fill("Mohammed El Amrani");
  await page.getByLabel("Guardian CIN").fill("AB123456");
  await page.getByLabel("Email").fill("Mohammed@example.test");
  await fillHouseholdPhone(page, dialog, "600000099");
  await pickDateField(page);

  await dialog.getByRole("button", { name: "Next" }).first().click();
  await expect(dialog.locator("#step-household")).toBeVisible();
  await dialog.getByRole("button", { name: "Previous" }).click();
  await expect(dialog.locator("#step-guardian")).toBeVisible();

  await expectRelationshipChecked(page, dialog, "Mother");

  // Clearing is its own choice: `Other` is a relationship, not an absence.
  const reopened = await openRelationship(page, dialog);
  await reopened
    .getByRole("option", { name: "Not provided", exact: true })
    .click();
  await expect(reopened).toHaveCount(0);
  await expectRelationshipChecked(page, dialog, "Not provided");
});
