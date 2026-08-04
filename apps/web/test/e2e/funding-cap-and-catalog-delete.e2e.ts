import { expect, test, type Page } from "@playwright/test";

import {
  phase6BrowserPassword,
  phase6BrowserUsers,
} from "../../scripts/phase6-e2e-fixtures";

const evidenceDirectory = "../../docs/evidence/funding-cap-and-catalog-delete";

function json(
  route: Parameters<Parameters<Page["route"]>[1]>[0],
  value: unknown,
) {
  return route.fulfill({
    contentType: "application/json",
    body: JSON.stringify(value),
  });
}

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email or phone").fill(email);
  await page.getByPlaceholder("Enter your password").fill(password);
  const loginResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/auth/login") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Log in" }).click();
  const response = await loginResponse;
  if (!response.ok()) {
    throw new Error(
      `Browser login failed with ${response.status()}: ${await response.text()}`,
    );
  }
  await page.waitForURL(/\/dashboard$/);
  await page.waitForLoadState("networkidle");
}

async function screenshot(page: Page, name: string) {
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    )
    .toBe(true);
  await page.screenshot({
    animations: "disabled",
    fullPage: true,
    path: `${evidenceDirectory}/${name}`,
  });
}

const openFunding = {
  activatedAt: null,
  availableToContributeMinor: 5_000,
  capacityStatus: "open",
  fundedMinor: 10_000,
  nextPendingExpiryAt: "2026-07-26T12:00:00.000Z",
  pendingMinor: 5_000,
  remainingMinor: 10_000,
  status: "pending_funding",
  targetMinor: 20_000,
};

test("operator settings renders the global pending expiry rule", async ({
  page,
}) => {
  await login(
    page,
    phase6BrowserUsers.operator,
    phase6BrowserPassword,
  );
  await page.route("**/api/settings", (route) =>
    json(route, {
      familyFundingTargetMinor: 720_000,
      formFillEnabled: false,
      id: "platform",
      pendingContributionExpiryHours: 72,
    }),
  );

  await page.goto("/operator/settings");
  await expect(
    page.getByText("Pending payment expiry (hours)").first(),
  ).toBeVisible();
  await expect(
    page.getByRole("spinbutton").first(),
  ).toHaveValue("72");
  await screenshot(page, "operator-expiry-setting.png");
});

test("sponsor funding controls disable closed and excessive actions", async ({
  page,
}) => {
  await login(page, phase6BrowserUsers.sponsor, phase6BrowserPassword);
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const { pathname } = new URL(request.url());
    if (
      pathname === "/api/auth/refresh" ||
      pathname === "/api/ui-language"
    ) {
      return route.continue();
    }
    if (pathname === "/api/support-assignments/catalog") {
      return json(route, [
        {
          activeChildCount: 2,
          funding: {
            ...openFunding,
            availableToContributeMinor: 0,
            capacityStatus: "reserved",
            pendingMinor: 10_000,
          },
          id: "family-reserved",
          image: "/api/family-images/files/serve/family-reserved.webp",
          name: "Reserved Family",
          supportPriority: "normal",
          activeSponsorCount: 2,
          reference: "FAM-RESERVED",
        },
        {
          activeChildCount: 1,
          funding: {
            ...openFunding,
            availableToContributeMinor: 0,
            capacityStatus: "funded",
            fundedMinor: 20_000,
            pendingMinor: 0,
            remainingMinor: 0,
            status: "active",
          },
          id: "family-funded",
          image: "/api/family-images/files/serve/family-funded.webp",
          name: "Funded Family",
          supportPriority: "high",
          activeSponsorCount: 1,
          reference: "FAM-FUNDED",
        },
        {
          activeChildCount: 3,
          funding: openFunding,
          id: "family-open",
          image: "/api/family-images/files/serve/family-open.webp",
          name: "Open Family",
          supportPriority: "urgent",
          activeSponsorCount: 4,
          reference: "FAM-OPEN",
        },
      ]);
    }
    if (pathname === "/api/support-assignments/me") {
      return json(route, [
        {
          childId: null,
          endedAt: null,
          familyProfileId: "family-reserved",
          id: "assignment-reserved",
          startedAt: "2026-07-01T00:00:00.000Z",
          status: "active",
        },
        {
          childId: null,
          endedAt: null,
          familyProfileId: "family-open",
          id: "assignment-open",
          startedAt: "2026-07-01T00:00:00.000Z",
          status: "active",
        },
      ]);
    }
    if (pathname.includes("/assignment-reserved/family")) {
      return json(route, {
        family: { activeChildCount: 2, reference: "FAM-RESERVED" },
      });
    }
    if (pathname.includes("/assignment-open/family")) {
      return json(route, {
        family: { activeChildCount: 3, reference: "FAM-OPEN" },
      });
    }
    if (pathname === "/api/contributions/me/plans") return json(route, []);
    if (pathname === "/api/contributions/me") {
      return json(route, [
        {
          amountMinor: 2_500,
          currency: "MAD",
          expiredAt: null,
          expiresAt: "2026-07-26T12:00:00.000Z",
          externalReference: null,
          id: "pending-browser",
          paidAt: null,
          paymentMethod: "manual",
          status: "pending",
          submittedAt: "2026-07-25T12:00:00.000Z",
          supportAssignmentId: "assignment-open",
        },
        {
          amountMinor: 1_500,
          currency: "MAD",
          expiredAt: "2026-07-24T12:00:00.000Z",
          expiresAt: "2026-07-24T12:00:00.000Z",
          externalReference: null,
          id: "expired-browser",
          paidAt: null,
          paymentMethod: "manual",
          status: "expired",
          submittedAt: "2026-07-23T12:00:00.000Z",
          supportAssignmentId: "assignment-open",
        },
      ]);
    }
    return json(route, []);
  });

  await page.goto("/sponsor/support");
  await expect(page).toHaveURL(/\/family$/);
  await expect(page.getByRole("heading", { name: "Families" })).toBeVisible();
  await expect(page.getByText("All families")).toBeVisible();
  await expect(page.getByText("Open Family")).toBeVisible();
  await expect(
    page.locator('[data-slot="card"]').filter({ hasText: "Open Family" }).locator("img"),
  ).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Covered by pending payments" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Target reached" }),
  ).toBeDisabled();
  await screenshot(page, "sponsor-closed-family-actions.png");

  await page.goto("/sponsor/contributions?assignment=assignment-open");
  await page.getByLabel("Amount in MAD").first().fill("60");
  await expect(page.getByText("Enter no more than MAD 50.00.")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Create plan" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Submit contribution" }),
  ).toBeDisabled();
  await expect(page.getByText(/^Pending until /)).toBeVisible();
  await expect(page.getByText(/^Expired on /)).toBeVisible();
  await screenshot(page, "sponsor-cap-and-expiry-history.png");
});

test("bootstrap admin sees catalog permanent-delete confirmations", async ({
  page,
}) => {
  const adminEmail = process.env.KAFIL_ADMIN_EMAIL;
  const adminPassword = process.env.KAFIL_ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) {
    throw new Error("KAFIL_ADMIN_EMAIL and KAFIL_ADMIN_PASSWORD are required.");
  }
  await login(page, adminEmail, adminPassword);
  const category = {
    createdAt: "2026-07-25T12:00:00.000Z",
    description: "Pristine category",
    id: "category-browser",
    image: null,
    name: "Browser category",
    slug: "browser-category",
    sortOrder: 1,
    status: "active",
    updatedAt: "2026-07-25T12:00:00.000Z",
  };
  const product = {
    categoryId: category.id,
    categoryName: category.name,
    categorySlug: category.slug,
    createdAt: "2026-07-25T12:00:00.000Z",
    currency: "MAD",
    description: "Pristine product",
    id: "product-browser",
    imageUrl: null,
    name: "Browser product",
    priceMinor: 2_500,
    sku: "BROWSER-1",
    status: "active",
    updatedAt: "2026-07-25T12:00:00.000Z",
  };
  await page.route("**/api/catalog/**", async (route) => {
    const { pathname } = new URL(route.request().url());
    if (pathname === "/api/catalog/categories") return json(route, [category]);
    if (pathname === "/api/catalog/products") return json(route, [product]);
    return json(route, []);
  });

  await page.goto("/operator/categories");
  await page.getByRole("button", { name: "Row actions" }).first().click();
  await page.getByRole("menuitem", { name: "Delete permanently" }).click();
  await expect(
    page.getByText(/Permanently deletes this category, any products still under it/),
  ).toBeVisible();
  await screenshot(page, "admin-category-delete-confirmation.png");
  await page.getByRole("button", { name: "Close" }).click();

  await page.goto("/operator/products");
  await page.getByRole("button", { name: "Row actions" }).first().click();
  await page.getByRole("menuitem", { name: "Delete permanently" }).click();
  await expect(
    page.getByText(/Permanently deletes this product, its cart entries/),
  ).toBeVisible();
  await screenshot(page, "admin-product-delete-confirmation.png");
});
