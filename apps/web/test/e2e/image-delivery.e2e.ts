import { expect, test, type Page, type Response as PlaywrightResponse } from "@playwright/test";

type Role = "family" | "operator";

const users: Record<Role, string> = {
  family: "phase6-browser-family@example.test",
  operator: "phase6-browser-operator@example.test",
};
const password = "Phase6BrowserPass1!";

async function useRole(page: Page, role: Role) {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("Email or phone").fill(users[role]);
  await page.getByPlaceholder("Enter your password").fill(password);
  const refresh = page.waitForResponse(
    (response) => response.url().endsWith("/api/auth/refresh") && response.ok(),
  );
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL(/\/dashboard$/);
  await refresh;
  await page.waitForLoadState("domcontentloaded");
}

test("protected images are bounded, cached, lazy, and authentication-protected", async ({
  page,
}) => {
  await useRole(page, "operator");
  await page.locator('a[href="/categories"]:visible').click();
  await page.waitForURL(/\/categories$/);
  await page.waitForLoadState("domcontentloaded");

  await expect(
    page.locator('img[src*="/api/category-images/files/serve/"]').first(),
  ).toBeVisible();

  const categorySources = await page
    .locator('img[src*="/api/category-images/files/serve/"]')
    .evaluateAll((images) => [
      ...new Set(images.map((image) => (image as HTMLImageElement).src)),
    ]);
  expect(categorySources.length).toBeGreaterThan(0);

  const categoryResponses = await Promise.all(
    categorySources.map((source) => page.request.get(source)),
  );
  let categoryBytes = 0;
  for (const response of categoryResponses) {
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("image/webp");
    expect(response.headers()["cache-control"]).toContain("immutable");
    const bytes = (await response.body()).byteLength;
    expect(bytes).toBeLessThanOrEqual(200_000);
    categoryBytes += bytes;
  }
  expect(categoryBytes).toBeLessThanOrEqual(3_500_000);
  await expect(
    page.locator('img[src*="/api/category-images/files/serve/"]:not([loading="lazy"])'),
  ).toHaveCount(0);

  const protectedPath = new URL(categorySources[0]!).pathname;
  await page.context().clearCookies();
  const forbidden = await page.request.get(protectedPath);
  expect([401, 403]).toContain(forbidden.status());
});

test("public auth branding uses responsive Next image URLs", async ({ page }) => {
  const optimizedResponses: PlaywrightResponse[] = [];
  page.on("response", (response) => {
    if (response.url().includes("/_next/image?")) optimizedResponses.push(response);
  });
  await page.goto("/login");
  await page.waitForLoadState("domcontentloaded");

  expect(optimizedResponses.length).toBeGreaterThan(0);
  let total = 0;
  for (const response of optimizedResponses) {
    expect(response.status()).toBe(200);
    total += (await response.body()).byteLength;
  }
  expect(total).toBeLessThanOrEqual(500_000);
  await expect(page.locator('img[srcset*="/_next/image"]')).not.toHaveCount(0);
});
