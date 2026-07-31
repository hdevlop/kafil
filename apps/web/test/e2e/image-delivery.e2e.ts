import { expect, test, type Page, type Response } from "@playwright/test";

type Role = "family" | "operator" | "sponsor";

const users: Record<Role, string> = {
  family: "phase6-browser-family@example.test",
  operator: "phase6-browser-operator@example.test",
  sponsor: "phase6-browser-sponsor@example.test",
};
const password = "Phase6BrowserPass1!";

async function useRole(page: Page, role: Role) {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("Email or phone").fill(users[role]);
  await page.getByPlaceholder("Enter your password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL(new RegExp(`/${role}$`));
  await page.waitForLoadState("networkidle");
}

function isManagedImage(response: Response) {
  return /\/api\/(?:category|product|family|child|sponsor|operator)-images\/files\/serve\//.test(
    response.url(),
  );
}

test("protected images are bounded, cached, lazy, and role-isolated", async ({ page }) => {
  const responses: Response[] = [];
  page.on("response", (response) => {
    if (isManagedImage(response)) responses.push(response);
  });

  await useRole(page, "operator");
  await page.locator('a[href="/categories"]:visible').click();
  await page.waitForURL(/\/categories$/);
  await page.waitForLoadState("networkidle");

  const categoryResponses = responses.filter((response) =>
    response.url().includes("/api/category-images/files/serve/"),
  );
  expect(categoryResponses.length).toBeGreaterThan(0);
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

  const protectedPath = new URL(categoryResponses[0]!.url()).pathname;
  await useRole(page, "sponsor");
  const token = await page.evaluate(async () => {
    const response = await fetch("/api/auth/refresh", { method: "POST" });
    const payload = (await response.json()) as { data: { accessToken: string } };
    return payload.data.accessToken;
  });
  const forbidden = await page.request.get(protectedPath, {
    headers: { authorization: `Bearer ${token}` },
  });
  expect([401, 403]).toContain(forbidden.status());
});

test("public auth branding uses responsive Next image URLs", async ({ page }) => {
  const optimizedResponses: Response[] = [];
  page.on("response", (response) => {
    if (response.url().includes("/_next/image?")) optimizedResponses.push(response);
  });
  await page.goto("/login");
  await page.waitForLoadState("networkidle");

  expect(optimizedResponses.length).toBeGreaterThan(0);
  let total = 0;
  for (const response of optimizedResponses) {
    expect(response.status()).toBe(200);
    total += (await response.body()).byteLength;
  }
  expect(total).toBeLessThanOrEqual(500_000);
  await expect(page.locator('img[srcset*="/_next/image"]')).not.toHaveCount(0);
});
