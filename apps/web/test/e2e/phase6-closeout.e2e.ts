import { expect, test, type Page } from "@playwright/test";

type ProductRole = "family" | "operator" | "sponsor";

const browserUsers: Record<ProductRole, string> = {
  family: "phase6-browser-family@example.test",
  operator: "phase6-browser-operator@example.test",
  sponsor: "phase6-browser-sponsor@example.test",
};
const browserPassword = "Phase6BrowserPass1!";

async function useRole(page: Page, role: ProductRole, language = "en") {
  await page.context().addCookies([{ name: "kafil-ui-language", value: language, url: "http://127.0.0.1:3210" }]);
  await page.goto("/login");
  await page.getByLabel("Email or phone").fill(browserUsers[role]);
  await page.getByPlaceholder("Enter your password").fill(browserPassword);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL(new RegExp(`/${role}$`));
}

function json(route: Parameters<Parameters<Page["route"]>[1]>[0], value: unknown) {
  return route.fulfill({ contentType: "application/json", body: JSON.stringify(value) });
}

test("Arabic dashboard copy, switcher, and family cart submission work with RTL", async ({ page }) => {
  await useRole(page, "family", "ar");

  const cart = {
    currency: "MAD",
    id: "cart-browser",
    items: [{ available: true, currency: "MAD", id: "cart-item", lineTotalMinor: 2_500, productId: "product-1", productName: "Rice", quantity: 1, sku: "RICE-1", unitPriceMinor: 2_500 }],
    subtotalMinor: 2_500,
    totalMinor: 2_500,
  };

  await page.route("**/api/orders/**", async (route) => {
    const { pathname } = new URL(route.request().url());
    const method = route.request().method();
    if (method === "GET" && pathname === "/api/orders/cart") return json(route, cart);
    if (method === "POST" && pathname === "/api/orders/submit") return json(route, { cancellationReason: null, createdAt: "2026-07-17T12:00:00.000Z", currency: "MAD", id: "order-family", items: [], orderNumber: "K-001", status: "pending", statusEvents: [], totalMinor: 2_500, updatedAt: "2026-07-17T12:00:00.000Z" });
    if (method === "GET" && pathname === "/api/orders/me") return json(route, []);
    return json(route, cart);
  });
  await page.route("**/api/budgets/me", (route) =>
    json(route, {
      availableMinor: 720_000,
      currency: "MAD",
      funding: {
        activatedAt: "2026-07-17T11:00:00.000Z",
        fundedMinor: 720_000,
        remainingMinor: 0,
        status: "active",
        targetMinor: 720_000,
      },
      monthlyLimit: null,
      reservedMinor: 0,
      spentMinor: 0,
    }),
  );

  await page.goto("/family/cart");
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByText("سلتك", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "إرسال الطلب" })).toBeEnabled();

  await page.route("**/api/dashboard/family", (route) =>
    json(route, {
      budget: { availableMinor: 720_000, reservedMinor: 0, spentMinor: 0 },
      counts: { activeChildren: 0, children: 0, deliveredOrders: 0, openOrders: 0 },
      displayName: "Phase 6 family",
      orderStatuses: [],
      orderTrend: [],
      recentOrders: [],
    }),
  );
  await page.goto("/family");
  await page.locator("button").filter({ has: page.locator("svg.lucide-languages") }).click();
  await page.getByRole("menuitem").nth(1).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(page.getByRole("button", { name: "Se déconnecter" })).toBeVisible();

  await page.goto("/family/cart");
  await page.getByRole("button", { name: "Passer la commande" }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/family\/orders$/);
});

test("operator can advance a mocked order through browser confirmation dialogs", async ({ page }) => {
  await useRole(page, "operator");

  let status = "pending";
  const order = () => ({
    approvedAt: status === "pending" ? null : "2026-07-17T12:01:00.000Z",
    cancellationReason: null,
    createdAt: "2026-07-17T12:00:00.000Z",
    currency: "MAD",
    deliveredAt: status === "delivered" ? "2026-07-17T12:03:00.000Z" : null,
    id: "operator-order",
    orderNumber: "K-OP-001",
    preparationStartedAt: ["in_preparation", "delivered"].includes(status) ? "2026-07-17T12:02:00.000Z" : null,
    familyProfileId: "household-browser",
    rejectionReason: null,
    status,
    totalMinor: 2_500,
    updatedAt: "2026-07-17T12:00:00.000Z",
    deliveryAddressSnapshot: "Test address",
    deliveryPhoneSnapshot: null,
    guardianLegalNameSnapshot: "Test family",
    items: [],
    statusEvents: [],
  });

  await page.route("**/api/orders**", async (route) => {
    const { pathname } = new URL(route.request().url());
    const method = route.request().method();
    if (method === "GET" && pathname === "/api/orders") return json(route, [order()]);
    if (method === "POST" && pathname.endsWith("/approve")) status = "approved";
    if (method === "POST" && pathname.endsWith("/preparation")) status = "in_preparation";
    if (method === "POST" && pathname.endsWith("/deliver")) status = "delivered";
    return json(route, order());
  });

  await page.goto("/operator/orders");
  await expect(page.getByText("K-OP-001", { exact: true })).toBeVisible();

  for (const [menuAction, confirmation, useKeyboard] of [["Approve", "Approve order", true], ["Start preparation", "Start preparation", false], ["Mark delivered", "Mark delivered", false]] as const) {
    const rowMenu = page.locator("tbody tr").getByRole("button");
    if (useKeyboard) {
      await rowMenu.focus();
      await page.keyboard.press("Enter");
    } else {
      await rowMenu.click();
    }
    await page.getByRole("menuitem", { name: menuAction }).click();
    const confirmButton = page.getByRole("button", { name: confirmation });
    await confirmButton.focus();
    await page.keyboard.press("Enter");
  }

  await expect(page.getByText("Delivered", { exact: true })).toBeVisible();
});

test("sponsor can create a contribution plan and submit a contribution", async ({ page }) => {
  await useRole(page, "sponsor");

  const submissions: Array<{ path: string; payload: unknown }> = [];
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const { pathname } = new URL(request.url());
    const method = request.method();
    if (pathname === "/api/ui-language") return route.continue();
    if (pathname === "/api/auth/refresh") return route.continue();
    if (method === "GET" && pathname === "/api/support-assignments/me") return json(route, [{ childId: null, endedAt: null, id: "assignment-browser", startedAt: "2026-07-01T00:00:00.000Z", status: "active" }]);
    if (method === "GET" && pathname === "/api/support-assignments/me/assignment-browser/family") return json(route, { family: { activeChildCount: 2, reference: "FAM-001" } });
    if (method === "GET" && pathname === "/api/contributions/me/plans") return json(route, []);
    if (method === "GET" && pathname === "/api/contributions/me") return json(route, []);
    if (method === "POST" && (pathname === "/api/contributions/me/plans" || pathname === "/api/contributions/me")) {
      submissions.push({ path: pathname, payload: request.postDataJSON() });
      return json(route, { amountMinor: 2_500, currency: "MAD", id: `created-${submissions.length}`, kind: "monthly", paymentMethod: "manual", status: "pending", submittedAt: "2026-07-17T12:00:00.000Z", supportAssignmentId: "assignment-browser" });
    }
    return json(route, []);
  });

  await page.goto("/sponsor/contributions");
  await page.getByLabel("Choose active support").selectOption("assignment-browser");
  await page.getByLabel("Amount in MAD").fill("25");
  await page.getByRole("button", { name: "Create plan" }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Submit contribution" }).focus();
  await page.keyboard.press("Enter");

  await expect.poll(() => submissions.map((entry) => entry.path)).toEqual([
    "/api/contributions/me/plans",
    "/api/contributions/me",
  ]);
  expect(submissions.map((entry) => entry.payload)).toEqual([
    { amountMinor: 2_500, kind: "monthly", supportAssignmentId: "assignment-browser" },
    { amountMinor: 2_500, paymentMethod: "manual", supportAssignmentId: "assignment-browser" },
  ]);
});

test("direct URLs and crafted API requests cannot cross role boundaries", async ({ page }) => {
  await useRole(page, "family");
  const familyToken = await page.evaluate(async () => {
    const response = await fetch("/api/auth/refresh", { method: "POST" });
    const body = await response.json() as { data: { accessToken: string } };
    return body.data.accessToken;
  });
  const familyStatuses = await page.evaluate(async (accessToken) => Promise.all([
    fetch("/operator/orders", { redirect: "manual" }).then((response) => response.status),
    fetch("/api/orders", { headers: { Authorization: `Bearer ${accessToken}` } }).then((response) => response.status),
    fetch("/api/contributions/me", { headers: { Authorization: `Bearer ${accessToken}` } }).then((response) => response.status),
  ]), familyToken);
  expect(familyStatuses[0]).toBe(403);
  expect(familyStatuses.slice(1)).toEqual([401, 401]);

  await page.context().clearCookies();
  await useRole(page, "sponsor");
  const sponsorToken = await page.evaluate(async () => {
    const response = await fetch("/api/auth/refresh", { method: "POST" });
    const body = await response.json() as { data: { accessToken: string } };
    return body.data.accessToken;
  });
  const sponsorStatuses = await page.evaluate(async (accessToken) => Promise.all([
    fetch("/family/cart", { redirect: "manual" }).then((response) => response.status),
    fetch("/api/orders/cart", { headers: { Authorization: `Bearer ${accessToken}` } }).then((response) => response.status),
  ]), sponsorToken);
  expect(sponsorStatuses[0]).toBe(403);
  expect(sponsorStatuses[1]).toBe(401);
});
