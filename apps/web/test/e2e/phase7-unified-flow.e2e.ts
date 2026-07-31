import { expect, test, type Page } from "@playwright/test";

type ProductRole = "family" | "operator" | "admin";

const browserUsers: Record<ProductRole, string> = {
  family: "phase6-browser-family@example.test",
  operator: "phase6-browser-operator@example.test",
  admin: "phase6-browser-admin@example.test",
};
const browserPassword = "Phase6BrowserPass1!";

async function useRole(page: Page, role: ProductRole) {
  await page.context().addCookies([{
    name: "kafil-ui-language",
    value: "en",
    url: process.env.KAFIL_E2E_BASE_URL ?? "http://127.0.0.1:3210",
  }]);
  await page.goto("/login");
  await page.getByLabel("Email or phone").fill(browserUsers[role]);
  await page.getByPlaceholder("Enter your password").fill(browserPassword);
  await page.getByRole("button", { name: "Log in" }).focus();
  await page.keyboard.press("Enter");
  await page.waitForURL(new RegExp(role === "admin" ? "/operator$" : `/${role}$`));
  await page.waitForLoadState("networkidle");
}

function json(route: Parameters<Parameters<Page["route"]>[1]>[0], value: unknown) {
  return route.fulfill({ contentType: "application/json", body: JSON.stringify(value) });
}

test.describe("Phase 7 unified catalog and order flow", () => {
  test("operator changes the catalog category from the header sheet and the products query refilters", async ({ page }) => {
    await useRole(page, "operator");

    const allProducts = [
      {
        id: "product-food",
        categoryId: "category-food",
        categoryName: "Food essentials",
        categorySlug: "food-essentials",
        sku: "RICE-5KG",
        name: "Rice 5 kg",
        description: null,
        priceMinor: 4500,
        currency: "MAD",
        imageUrl: null,
        status: "active",
        createdAt: "2026-07-17T10:00:00.000Z",
        updatedAt: "2026-07-17T10:00:00.000Z",
      },
      {
        id: "product-clothes",
        categoryId: "category-clothes",
        categoryName: "Clothes",
        categorySlug: "clothes",
        sku: "SHIRT-M",
        name: "Shirt M",
        description: null,
        priceMinor: 8000,
        currency: "MAD",
        imageUrl: null,
        status: "active",
        createdAt: "2026-07-17T10:00:00.000Z",
        updatedAt: "2026-07-17T10:00:00.000Z",
      },
    ];

    let lastQuery: Record<string, string> = {};
    await page.route("**/api/catalog/products**", async (route) => {
      lastQuery = route.request().url().includes("?")
        ? Object.fromEntries(new URL(route.request().url()).searchParams)
        : {};
      const filtered = lastQuery.categoryId
        ? allProducts.filter((p) => p.categoryId === lastQuery.categoryId)
        : allProducts;
      return json(route, filtered);
    });
    await page.route("**/api/catalog/categories**", (route) =>
      json(route, [
        { id: "category-food", name: "Food essentials", slug: "food-essentials", image: "/category-food.png", itemCount: 1, status: "active" },
        { id: "category-clothes", name: "Clothes", slug: "clothes", image: "/category-clothes.png", itemCount: 1, status: "active" },
      ]),
    );

    await page.goto("/products");
    await expect(page.getByText("Rice 5 kg", { exact: true })).toBeVisible();
    await expect(page.getByText("Shirt M", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Filter products by category" }).click();
    await expect(page.getByAltText("Cover image for Food essentials")).toBeVisible();
    await page.getByRole("button", { name: "Food essentials", exact: true }).click();
    await page.waitForURL(/category=category-food/);
    await expect.poll(() => lastQuery.categoryId).toBe("category-food");
    await expect(page.getByText("Rice 5 kg", { exact: true })).toBeVisible();
    await expect(page.getByText("Shirt M", { exact: true })).toHaveCount(0);

    await page.getByRole("button", { name: "Filter products by category" }).click();
    await page.getByRole("button", { name: "Food essentials", exact: true }).click();
    await page.waitForURL((url) => !url.search.includes("category="));
    await expect(page.getByText("Shirt M", { exact: true })).toBeVisible();
  });

  test("operator assisted draft searches active families server-side and lands on /orders?created=...", async ({ page }) => {
    await useRole(page, "operator");

    const allFamilies = Array.from({ length: 5 }).map((_, index) => ({
      id: `family-${index + 1}`,
      userId: `user-${index + 1}`,
      name: `Family ${index + 1}`,
      email: `family${index + 1}@example.test`,
      image: null,
      emailVerified: true,
      status: "active",
      role: "family",
      relationshipToChildren: null,
      notes: null,
      guardianLegalName: `Guardian ${index + 1}`,
      guardianCin: `CIN${index + 1}`,
      guardianDateOfBirth: null,
      exactAddress: `${index + 1} Test Street`,
      housingSituation: "owned",
      registrationDate: "2026-07-17",
      supportPriority: "normal",
      phone: `+21260000000${index}`,
      activeChildCount: 0,
      activeSponsorCount: 0,
      activeSponsorNames: [],
      funding: {
        status: "active",
        targetMinor: 720_000,
        fundedMinor: 720_000,
        pendingMinor: 0,
        remainingMinor: 0,
        availableToContributeMinor: 0,
        capacityStatus: "funded",
        nextPendingExpiryAt: null,
        activatedAt: "2026-07-17T11:00:00.000Z",
      },
      createdAt: "2026-07-17T10:00:00.000Z",
      updatedAt: "2026-07-17T10:00:00.000Z",
    }));

    let lastFamiliesQuery: Record<string, string> = {};
    await page.route("**/api/families**", async (route) => {
      const url = new URL(route.request().url());
      lastFamiliesQuery = Object.fromEntries(url.searchParams);
      const search = (lastFamiliesQuery.search ?? "").toLowerCase();
      const filtered = search
        ? allFamilies.filter(
            (family) =>
              family.guardianLegalName.toLowerCase().includes(search) ||
              family.email.toLowerCase().includes(search) ||
              family.name.toLowerCase().includes(search),
          )
        : allFamilies;
      return json(route, filtered);
    });
    const orderProduct = {
          id: "product-1",
          categoryId: "category-1",
          categoryName: "Food",
          categorySlug: "food",
          sku: "RICE",
          name: "Rice 5 kg",
          description: null,
          priceMinor: 4500,
          currency: "MAD",
          imageUrl: null,
          status: "active",
          createdAt: "2026-07-17T10:00:00.000Z",
          updatedAt: "2026-07-17T10:00:00.000Z",
        };
    await page.route("**/api/catalog/products**", (route) => {
      const pathname = new URL(route.request().url()).pathname;
      return json(
        route,
        pathname === "/api/catalog/products/product-1"
          ? orderProduct
          : [orderProduct],
      );
    });
    await page.route("**/api/budgets/family-3", (route) =>
      json(route, {
        currency: "MAD",
        availableMinor: 720_000,
        reservedMinor: 0,
        spentMinor: 0,
        monthlyLimit: null,
        funding: {
          status: "active",
          targetMinor: 720_000,
          fundedMinor: 720_000,
          pendingMinor: 0,
          remainingMinor: 0,
          availableToContributeMinor: 0,
          capacityStatus: "funded",
          nextPendingExpiryAt: null,
          activatedAt: "2026-07-17T11:00:00.000Z",
        },
      }),
    );
    await page.route("**/api/budgets/families**", (route) =>
      json(route, allFamilies),
    );
    interface AssistedPayload {
      familyProfileId?: string;
      items?: Array<{ productId: string; quantity: number }>;
    }
    let assistedPayload: AssistedPayload = {};
    await page.route("**/api/orders**", async (route) => {
      const pathname = new URL(route.request().url()).pathname;
      if (pathname !== "/api/orders/assisted") return json(route, []);

      assistedPayload = JSON.parse(route.request().postData() ?? "{}");
      return json(route, {
        id: "order-assisted-1",
        orderNumber: "K-ASSISTED-001",
        familyProfileId: assistedPayload.familyProfileId,
        status: "pending",
        totalMinor: 4500,
        currency: "MAD",
      });
    });
    await page.route("**/api/family-orders**", (route) => json(route, []));

    await page.goto("/products");
    await page.getByRole("button", { name: "Add Rice 5 kg to cart" }).click();
    const cartButton = page.getByTestId("floating-order-cart-button");
    await cartButton.click();

    const familySearchInput = page.getByPlaceholder("Search active families");
    await familySearchInput.fill("Family 3");
    await expect.poll(() => lastFamiliesQuery.search ?? "").toBe("Family 3");
    await page.getByRole("button", { name: /Guardian 3/ }).click();
    await expect(familySearchInput).toHaveCount(0);
    await expect(page.getByText(/Active family: Guardian 3/)).toBeVisible();

    await page.getByRole("button", { name: "Review order" }).click();
    await expect(page.getByText("Family 3", { exact: true })).toBeVisible();
    await expect(page.getByText("3 Test Street", { exact: true })).toBeVisible();
    await expect(page.getByText("Rice 5 kg", { exact: true })).toBeVisible();
    expect(assistedPayload).toEqual({});

    await page.getByRole("button", { name: /Confirm order/ }).click();

    await page.waitForURL(/\/orders\?created=order-assisted-1/);
    expect(assistedPayload).toMatchObject({
      familyProfileId: "family-3",
      items: [{ productId: "product-1", quantity: 1 }],
    });
  });
});
