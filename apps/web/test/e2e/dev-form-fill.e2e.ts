import { expect, test } from "@playwright/test";

test("F8 fills the active development form", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.addInitScript(() => {
    window.addEventListener("keydown", (event) => {
      document.documentElement.dataset.lastKey = event.key;
    });
  });
  await page.goto("/register/sponsor");

  const name = page.getByPlaceholder("Enter your full name");
  const email = page.getByPlaceholder("Enter your email address");
  const password = page.getByPlaceholder("At least 8 characters");
  const confirmPassword = page.getByPlaceholder("Repeat your password");

  await expect(name).toHaveValue("");
  await page.waitForTimeout(500);
  await page.keyboard.press("F8");
  await page.waitForTimeout(100);

  expect(pageErrors).toEqual([]);
  await expect(page.locator("html")).toHaveAttribute("data-last-key", "F8");
  await expect(name).not.toHaveValue("");
  await expect(email).toHaveValue(/@/);
  await expect(password).toHaveValue("KafilDev123");
  await expect(confirmPassword).toHaveValue("KafilDev123");
});
