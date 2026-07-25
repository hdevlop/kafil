import { expect, test } from "@playwright/test";

test("F8 fills the active form when the runtime setting is enabled", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.route("**/api/settings/form-fill", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        data: { enabled: true },
        status: "success",
      }),
    });
  });
  await page.addInitScript(() => {
    window.addEventListener("keydown", (event) => {
      document.documentElement.dataset.lastKey = event.key;
    });
  });
  const runtimeSettingLoaded = page.waitForResponse(
    "**/api/settings/form-fill",
  );
  await page.goto("/register/sponsor");
  await runtimeSettingLoaded;

  const name = page.getByPlaceholder("Enter your full name");
  const email = page.getByPlaceholder("Enter your email address");
  const password = page.getByPlaceholder("At least 8 characters");
  const confirmPassword = page.getByPlaceholder("Repeat your password");

  await expect(name).toHaveValue("");
  await page.keyboard.press("F8");
  await page.waitForTimeout(100);

  expect(pageErrors).toEqual([]);
  await expect(page.locator("html")).toHaveAttribute("data-last-key", "F8");
  await expect(name).not.toHaveValue("");
  await expect(email).toHaveValue(/@/);
  await expect(password).toHaveValue("KafilDev123");
  await expect(confirmPassword).toHaveValue("KafilDev123");
});

test("F8 leaves the form unchanged when the runtime setting is disabled", async ({
  page,
}) => {
  await page.route("**/api/settings/form-fill", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        data: { enabled: false },
        status: "success",
      }),
    });
  });
  const runtimeSettingLoaded = page.waitForResponse(
    "**/api/settings/form-fill",
  );

  await page.goto("/register/sponsor");
  await runtimeSettingLoaded;
  const name = page.getByPlaceholder("Enter your full name");
  await page.keyboard.press("F8");

  await expect(name).toHaveValue("");
});
