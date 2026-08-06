import { expect, test, type Page } from "@playwright/test";

type ProductRole = "family" | "operator" | "sponsor";

const browserUsers: Record<ProductRole, string> = {
  family: "phase6-browser-family@example.test",
  operator: "phase6-browser-operator@example.test",
  sponsor: "phase6-browser-sponsor@example.test",
};
const browserPassword = "Phase6BrowserPass1!";

async function useRole(page: Page, role: ProductRole, language = "en") {
  await page.context().addCookies([{
    name: "kafil-ui-language",
    value: language,
    url: process.env.KAFIL_E2E_BASE_URL ?? "http://127.0.0.1:3210",
  }]);
  await page.goto("/login");
  await page.getByLabel("Email or phone").fill(browserUsers[role]);
  await page.getByPlaceholder("Enter your password").fill(browserPassword);
  const refresh = page.waitForResponse(
    (response) => response.url().endsWith("/api/auth/refresh") && response.ok(),
  );
  await page.getByRole("button", { name: "Log in" }).focus();
  await page.keyboard.press("Enter");
  await page.waitForURL(/\/dashboard$/);
  await refresh;
  await page.waitForLoadState("domcontentloaded");
}

function json(route: Parameters<Parameters<Page["route"]>[1]>[0], value: unknown) {
  return route.fulfill({ contentType: "application/json", body: JSON.stringify(value) });
}

function sponsorOverviewEvidencePath(fileName: string) {
  return `../../docs/evidence/sponsor-overview/${fileName}`;
}

async function captureSponsorOverviewEvidence(page: Page, fileName: string) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
  const dialogContent = page.locator('[data-slot="dialog-content"]');
  if (await dialogContent.count()) {
    expect(
      await dialogContent.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true);
  }
  await page.screenshot({
    animations: "disabled",
    fullPage: true,
    path: sponsorOverviewEvidencePath(fileName),
  });
}

async function openSponsorOverview(page: Page, sponsorName: string) {
  const sponsorCard = page.locator('[data-row="true"]').filter({ hasText: sponsorName });
  await sponsorCard.getByRole("button", { name: "Row actions" }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("menuitem").first().focus();
  await page.keyboard.press("Enter");
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
  await page.route("**/api/families/me", (route) =>
    json(route, {
      id: "family-browser",
      userId: "phase6_browser_family",
      name: "Phase 6 family",
      email: "phase6-browser-family@example.test",
      image: null,
      emailVerified: true,
      status: "active",
      role: "family",
      relationshipToChildren: null,
      notes: null,
      guardianLegalName: "Phase 6 family",
      guardianCin: "AB123456",
      guardianDateOfBirth: "1985-01-01",
      exactAddress: "10 Test Street",
      housingSituation: "rented",
      registrationDate: "2026-01-01",
      supportPriority: "normal",
      phone: "+212600000001",
      activeChildCount: 0,
      activeSponsorCount: 0,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    }),
  );

  await page.goto("/products");
  await page.getByTestId("floating-order-cart-button").click();
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByText("السلة", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "مراجعة الطلب" })).toBeEnabled();

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
  await page.goto("/dashboard");
  await page.locator("button").filter({ has: page.locator("svg.lucide-languages") }).click();
  await page.getByRole("menuitem").nth(1).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(page.getByRole("button", { name: "Se déconnecter" })).toBeVisible();

  await page.goto("/products");
  await page.getByTestId("floating-order-cart-button").click();
  await page.getByRole("button", { name: "Vérifier la commande" }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: /Confirmer la commande/ }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/orders/);
});

test("operator can advance a mocked order through browser confirmation dialogs", async ({ page }) => {
  test.setTimeout(180_000);
  await useRole(page, "operator");

  const operatorToken = await page.evaluate(async () => {
    const response = await fetch("/api/auth/refresh", { method: "POST" });
    const body = await response.json() as { data: { accessToken: string } };
    return body.data.accessToken;
  });
  const operatorAdminApiStatus = await page.evaluate(
    async (accessToken) =>
      fetch("/api/admin/access/users", {
        headers: { Authorization: `Bearer ${accessToken}` },
      }).then((response) => response.status),
    operatorToken,
  );
  expect(operatorAdminApiStatus).toBe(401);
  await page.goto("/users");
  await expect(page).toHaveURL(/(?:\/forbidden$|\/login\?from=%2Fforbidden$)/);
  await useRole(page, "operator");

  let status = "pending";
  let deliveryAssigned = false;
  let deliveryAttemptStatus = "assigned";
  const purchase = {
    id: "purchase-browser",
    orderId: "operator-order",
    merchantName: "Marjane",
    receiptNumber: "BROWSER-001",
    purchasedAt: "2026-07-17T12:02:00.000Z",
    actualTotalMinor: 2_500,
    currency: "MAD",
    receiptStoragePath:
      "/api/order-evidence/receipts/serve/10000000-0000-4000-8000-000000000001.pdf",
    receiptMediaType: "application/pdf",
    receiptByteSize: 8,
    recordedByUserId: "operator-browser",
    idempotencyKey: "purchase-browser",
    replacesPurchaseId: null,
    createdAt: "2026-07-17T12:02:00.000Z",
  };
  const order = () => ({
    approvedAt: status === "pending" ? null : "2026-07-17T12:01:00.000Z",
    cancellationReason: null,
    createdAt: "2026-07-17T12:00:00.000Z",
    currency: "MAD",
    deliveredAt: status === "delivered" ? "2026-07-17T12:03:00.000Z" : null,
    deliveryStartedAt: ["out_for_delivery", "delivered"].includes(status)
      ? "2026-07-17T12:02:30.000Z"
      : null,
    id: "operator-order",
    orderNumber: "K-OP-001",
    preparationStartedAt: ["in_preparation", "delivered"].includes(status) ? "2026-07-17T12:02:00.000Z" : null,
    familyProfileId: "household-browser",
    rejectionReason: null,
    status,
    placementSource: "family_self_service",
    assistanceChannel: null,
    assistanceNote: null,
    totalMinor: 2_500,
    updatedAt: "2026-07-17T12:00:00.000Z",
    deliveryAddressSnapshot: "Test address",
    deliveryPhoneSnapshot: null,
    guardianLegalNameSnapshot: "Test family",
    items: [],
    statusEvents: [],
    purchases: ["purchased", "out_for_delivery", "delivered"].includes(status)
      ? [{ purchase, reversal: null }]
      : [],
    activePurchase: ["purchased", "out_for_delivery", "delivered"].includes(status)
      ? purchase
      : null,
    requestedTotalMinor: 2_500,
    actualTotalMinor: ["purchased", "out_for_delivery", "delivered"].includes(status)
      ? 2_500
      : null,
    receiptRecorded: ["purchased", "out_for_delivery", "delivered"].includes(status),
    deliveryProofRecorded: false,
    currentDelivery:
      deliveryAssigned && status !== "delivered"
        ? {
            attemptId: "delivery-attempt-browser",
            staffProfileId: "30000000-0000-4000-8000-000000000001",
            name: "Amina Courier",
            status: deliveryAttemptStatus,
            assignedAt: "2026-07-17T12:02:10.000Z",
          }
        : null,
    latestDelivery: deliveryAssigned
      ? {
          attemptId: "delivery-attempt-browser",
          staffProfileId: "30000000-0000-4000-8000-000000000001",
          name: "Amina Courier",
          status: status === "delivered" ? "delivered" : deliveryAttemptStatus,
          assignedAt: "2026-07-17T12:02:10.000Z",
        }
      : null,
    deliveryAttempts: [],
  });

  await page.route("**/api/order-evidence/**", async (route) => {
    const request = route.request();
    if (request.method() === "POST") {
      return json(route, {
        path: "/api/order-evidence/receipts/serve/10000000-0000-4000-8000-000000000001.pdf",
        mediaType: "application/pdf",
        byteSize: 8,
      });
    }
    return json(route, { deleted: true });
  });
  await page.route("**/api/orders**", async (route) => {
    const { pathname } = new URL(route.request().url());
    const method = route.request().method();
    if (method === "GET" && pathname === "/api/orders") return json(route, [order()]);
    if (method === "POST" && pathname.endsWith("/approve")) status = "approved";
    if (method === "POST" && pathname.endsWith("/purchase")) status = "purchased";
    if (method === "POST" && pathname.endsWith("/delivery/assign")) deliveryAssigned = true;
    if (method === "POST" && pathname.endsWith("/delivery/start")) {
      status = "out_for_delivery";
      deliveryAttemptStatus = "in_progress";
    }
    if (method === "POST" && pathname.endsWith("/delivery/confirm")) status = "delivered";
    return json(route, order());
  });
  await page.route("**/api/staff/options/delivery", (route) =>
    json(route, [
      {
        id: "30000000-0000-4000-8000-000000000001",
        name: "Amina Courier",
        image: null,
        phone: "+212600001122",
        affiliation: "internal",
        companyName: null,
        functionKeys: ["delivery"],
      },
    ]),
  );

  await page.goto("/orders");
  await expect(page.getByText("K-OP-001", { exact: true })).toBeVisible();

  const openAction = async (name: string) => {
    await page.getByRole("button", { name: "Row actions" }).click();
    await page.getByRole("menuitem", { name }).click();
  };

  await openAction("Approve");
  await page.getByRole("button", { name: "Approve order" }).click();

  await openAction("Record purchase");
  const purchaseDialog = page.getByRole("dialog", { name: "Record purchase" });
  await purchaseDialog.locator('input[type="file"]').setInputFiles({
    name: "receipt.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4"),
  });
  await purchaseDialog.getByRole("button", { name: "Record purchase" }).click();

  await openAction("Assign delivery");
  const assignmentDialog = page.getByRole("dialog", { name: "Assign delivery" });
  await assignmentDialog.getByRole("combobox").first().click();
  await page.getByRole("option", { name: /Amina Courier/ }).click();
  await assignmentDialog.getByRole("button", { name: "Assign delivery" }).click();

  await openAction("Start delivery");
  await page.getByRole("button", { name: "Start delivery" }).click();

  await openAction("Confirm delivery");
  await page
    .getByRole("dialog", { name: "Confirm delivery" })
    .getByRole("button", { name: "Confirm delivery" })
    .click();

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
  await page.getByLabel("Choose active support").last().selectOption("assignment-browser");
  await page.getByLabel("Amount in MAD").last().fill("25");
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

test("operator can open the sponsor overview dialog with KPIs and sponsor information", async ({ page }) => {
  test.setTimeout(180_000);
  await useRole(page, "operator");
  const populatedSponsorName = "Sponsor Overview Test With An Extraordinarily Long Display Name";
  const populatedSponsorEmail = "sponsor.overview.with.a.long.address@example.test";
  const populatedSponsorAddress = "123 Boulevard Abdelmoumen, Quartier des Palmiers, Casablanca";
  const populatedSponsorNotes = "Long operator notes verify that the complete sponsor context wraps without creating horizontal dialog overflow.";

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const { pathname } = new URL(request.url());
    const method = request.method();
    if (pathname === "/api/ui-language") return route.continue();
    if (pathname === "/api/auth/refresh") return route.continue();
    if (method === "GET" && pathname === "/api/sponsors") return json(route, {
      data: [
        {
          id: "sponsor-overview-1",
          userId: "user-1",
          name: populatedSponsorName,
          email: populatedSponsorEmail,
          image: null,
          emailVerified: true,
          status: "active",
          role: "sponsor",
          phone: "+212600000000",
          cin: "AB123456",
          gender: "M",
          address: populatedSponsorAddress,
          dateOfBirth: "1990-01-01",
          notes: populatedSponsorNotes,
          createdAt: "2025-01-15T00:00:00.000Z",
          updatedAt: "2025-01-15T00:00:00.000Z",
        },
        {
          id: "sponsor-overview-empty",
          userId: "user-empty",
          name: "Inactive Empty Sponsor",
          email: "empty@example.test",
          image: null,
          emailVerified: true,
          status: "inactive",
          role: "sponsor",
          phone: null,
          cin: null,
          gender: null,
          address: null,
          dateOfBirth: null,
          notes: null,
          createdAt: "2025-02-15T00:00:00.000Z",
          updatedAt: "2025-02-15T00:00:00.000Z",
        },
      ],
      status: "success",
    });
    if (method === "GET" && pathname.endsWith("/overview")) {
      const isEmpty = pathname === "/api/sponsors/sponsor-overview-empty/overview";
      return json(route, {
      data: {
        sponsor: {
          id: isEmpty ? "sponsor-overview-empty" : "sponsor-overview-1",
          name: isEmpty ? "Inactive Empty Sponsor" : populatedSponsorName,
          email: isEmpty ? "empty@example.test" : populatedSponsorEmail,
          image: null,
          status: isEmpty ? "inactive" : "active",
          phone: isEmpty ? null : "+212600000000",
          cin: isEmpty ? null : "AB123456",
          gender: isEmpty ? null : "M",
          address: isEmpty ? null : populatedSponsorAddress,
          dateOfBirth: isEmpty ? null : "1990-01-01",
          notes: isEmpty ? null : populatedSponsorNotes,
          createdAt: isEmpty ? "2025-02-15T00:00:00.000Z" : "2025-01-15T00:00:00.000Z",
        },
        metrics: {
          counts: {
            activeSupportedFamilies: isEmpty ? 0 : 2,
            activePlans: isEmpty ? 0 : 1,
            pendingContributions: 0,
            supportedOrders: isEmpty ? 0 : 3,
          },
          money: {
            validatedContributionMinor: isEmpty ? 0 : 8000,
            pendingContributionMinor: 0,
            supportedAvailableMinor: isEmpty ? 0 : 5000,
            supportedReservedMinor: isEmpty ? 0 : 1000,
            supportedSpentMinor: isEmpty ? 0 : 3000,
          },
          nextPlannedContribution: isEmpty
            ? null
            : { planId: "plan-1", amountMinor: 500, dueAt: "2026-08-01T00:00:00.000Z" },
          contributionTrend: [],
          recentContributions: [],
          recentSupportedOrders: [],
        },
      },
      status: "success",
    });
    }
    return json(route, { data: [], status: "success" });
  });

  await page.goto("/sponsors");
  await openSponsorOverview(page, populatedSponsorName);
  const overviewDialog = page.getByRole("dialog", { name: "Sponsor overview" });
  await expect(overviewDialog).toBeVisible();
  await expect(overviewDialog.getByText("Sponsor information", { exact: true })).toBeVisible();
  await expect(overviewDialog.getByText(populatedSponsorName).first()).toBeVisible();
  await expect(overviewDialog.getByText(populatedSponsorEmail)).toBeVisible();
  await expect(overviewDialog.getByText(populatedSponsorAddress)).toBeVisible();
  await captureSponsorOverviewEvidence(page, "operator-populated-desktop.png");
  const overviewDialogContent = page.locator('[data-slot="dialog-content"]');
  await overviewDialogContent.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await captureSponsorOverviewEvidence(page, "operator-long-content-scrolled.png");
  await overviewDialogContent.evaluate((element) => {
    element.scrollTop = 0;
  });

  await page.setViewportSize({ width: 375, height: 812 });
  await captureSponsorOverviewEvidence(page, "operator-populated-mobile.png");
  await page.setViewportSize({ width: 320, height: 720 });
  await captureSponsorOverviewEvidence(page, "operator-populated-mobile-320.png");
  await page.setViewportSize({ width: 768, height: 900 });
  await captureSponsorOverviewEvidence(page, "operator-populated-tablet-768.png");
  await page.setViewportSize({ width: 1024, height: 900 });
  await captureSponsorOverviewEvidence(page, "operator-populated-tablet-1024.png");

  await page.context().addCookies([
    {
      name: "kafil-ui-language",
      value: "en",
      url: process.env.KAFIL_E2E_BASE_URL ?? "http://127.0.0.1:3210",
    },
    { name: "kafil-ui-theme", value: "dark", url: process.env.KAFIL_E2E_BASE_URL ?? "http://127.0.0.1:3210" },
  ]);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/sponsors");
  await openSponsorOverview(page, populatedSponsorName);
  await expect(page.locator("html")).toHaveClass(/dark/);
  await captureSponsorOverviewEvidence(page, "operator-populated-dark.png");

  await page.context().addCookies([
    { name: "kafil-ui-language", value: "fr", url: process.env.KAFIL_E2E_BASE_URL ?? "http://127.0.0.1:3210" },
    { name: "kafil-ui-theme", value: "light", url: process.env.KAFIL_E2E_BASE_URL ?? "http://127.0.0.1:3210" },
  ]);
  await page.goto("/sponsors");
  await openSponsorOverview(page, populatedSponsorName);
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await captureSponsorOverviewEvidence(page, "operator-populated-french.png");

  await page.context().addCookies([
    { name: "kafil-ui-language", value: "ar", url: process.env.KAFIL_E2E_BASE_URL ?? "http://127.0.0.1:3210" },
    { name: "kafil-ui-theme", value: "light", url: process.env.KAFIL_E2E_BASE_URL ?? "http://127.0.0.1:3210" },
  ]);
  await page.goto("/sponsors");
  await openSponsorOverview(page, populatedSponsorName);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await captureSponsorOverviewEvidence(page, "operator-populated-arabic-rtl.png");

  await page.context().addCookies([
    { name: "kafil-ui-language", value: "en", url: process.env.KAFIL_E2E_BASE_URL ?? "http://127.0.0.1:3210" },
  ]);
  await page.goto("/sponsors");
  await openSponsorOverview(page, "Inactive Empty Sponsor");
  await expect(page.getByText("No supported budget activity yet. Budget data will appear here when support is active.")).toBeVisible();
  await expect(
    page.getByText(
      "No contributions yet. Create a plan or submit your first contribution.",
    ),
  ).toBeVisible();
  await captureSponsorOverviewEvidence(page, "operator-inactive-empty-zero.png");
});

test("sponsor dashboard renders populated and empty overview states", async ({ page }) => {
  await useRole(page, "sponsor");

  let empty = false;
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const { pathname } = new URL(request.url());
    const method = request.method();
    if (pathname === "/api/ui-language") return route.continue();
    if (pathname === "/api/auth/refresh") return route.continue();
    if (method === "GET" && pathname === "/api/sponsors/me/profile") {
      return json(route, {
        data: {
          id: "sponsor-profile-browser",
          name: "Dashboard Sponsor",
          email: "phase6-browser-sponsor@example.test",
          image: null,
          status: "active",
          phone: "+212600000001",
          cin: "CD123456",
          gender: "F",
          address: "Rabat",
          dateOfBirth: "1992-02-02",
          createdAt: "2025-01-15T00:00:00.000Z",
          updatedAt: "2025-01-15T00:00:00.000Z",
        },
        status: "success",
      });
    }
    if (method === "GET" && pathname === "/api/dashboard/sponsor") {
      return json(route, {
        data: {
          displayName: "Dashboard Sponsor",
          memberSince: "2025-01-15T00:00:00.000Z",
          counts: {
            activeSupportedFamilies: empty ? 0 : 1,
            activePlans: empty ? 0 : 1,
            pendingContributions: 0,
            supportedOrders: empty ? 0 : 1,
          },
          money: {
            validatedContributionMinor: empty ? 0 : 12_500,
            pendingContributionMinor: 0,
            supportedAvailableMinor: empty ? 0 : 7_500,
            supportedReservedMinor: empty ? 0 : 1_000,
            supportedSpentMinor: empty ? 0 : 4_000,
          },
          nextPlannedContribution: empty
            ? null
            : { planId: "plan-browser", amountMinor: 2_500, dueAt: "2026-08-01T00:00:00.000Z" },
          supportedFamilies: empty
            ? []
            : [{
                assignmentId: "assignment-browser",
                supportReference: "Support ASSIGN01",
                activeChildCount: 2,
                startedAt: "2026-01-01T00:00:00.000Z",
                funding: {
                  activatedAt: null,
                  fundedMinor: 12_500,
                  remainingMinor: 7_500,
                  status: "pending_funding",
                  targetMinor: 20_000,
                },
              }],
          contributionTrend: Array.from({ length: 12 }, (_, index) => ({
            month: `2025-${String(index + 1).padStart(2, "0")}`,
            pendingMinor: 0,
            validatedMinor: empty ? 0 : (index + 1) * 500,
          })),
          contributionStatuses: [],
          recentContributions: empty
            ? []
            : [{
                id: "contribution-browser",
                status: "validated",
                amountMinor: 2_500,
                submittedAt: "2026-07-15T00:00:00.000Z",
              }],
          recentSupportedOrders: empty
            ? []
            : [{
                id: "order-browser",
                orderNumber: "K-SP-001",
                status: "delivered",
                totalMinor: 3_500,
                placedAt: "2026-07-16T00:00:00.000Z",
                itemCount: 3,
              }],
          upcomingContributions: empty
            ? []
            : [{
                planId: "plan-browser",
                amountMinor: 2_500,
                dueAt: "2026-08-01T00:00:00.000Z",
                supportReference: "Support ASSIGN01",
              }],
        },
        status: "success",
      });
    }
    return json(route, { data: [], status: "success" });
  });

  await page.goto("/dashboard");
  await expect(page.getByText(/Dashboard Sponsor/).first()).toBeVisible();
  await expect(page.getByText("Support ASSIGN01").first()).toBeVisible();
  await captureSponsorOverviewEvidence(page, "sponsor-dashboard-populated-desktop.png");

  await page.setViewportSize({ width: 375, height: 812 });
  await captureSponsorOverviewEvidence(page, "sponsor-dashboard-populated-mobile.png");

  empty = true;
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.reload();
  await expect(page.getByText("No supported budget activity yet. Budget data will appear here when support is active.")).toBeVisible();
  await expect(page.getByText("No active plan")).toBeVisible();
  await captureSponsorOverviewEvidence(page, "sponsor-dashboard-empty-zero.png");
});

test("sponsor and family cannot access the operator sponsor overview endpoint", async ({ page }) => {
  await useRole(page, "family");
  const familyToken = await page.evaluate(async () => {
    const response = await fetch("/api/auth/refresh", { method: "POST" });
    const body = await response.json() as { data: { accessToken: string } };
    return body.data.accessToken;
  });
  const familyOverviewStatus = await page.evaluate(
    async (accessToken) =>
      fetch("/api/sponsors/sponsor-overview-1/overview", {
        headers: { Authorization: `Bearer ${accessToken}` },
      }).then((response) => response.status),
    familyToken,
  );
  expect(familyOverviewStatus).toBe(401);

  await page.context().clearCookies();
  await useRole(page, "sponsor");
  const sponsorToken = await page.evaluate(async () => {
    const response = await fetch("/api/auth/refresh", { method: "POST" });
    const body = await response.json() as { data: { accessToken: string } };
    return body.data.accessToken;
  });
  const sponsorOverviewStatus = await page.evaluate(
    async (accessToken) =>
      fetch("/api/sponsors/sponsor-overview-1/overview", {
        headers: { Authorization: `Bearer ${accessToken}` },
      }).then((response) => response.status),
    sponsorToken,
  );
  expect(sponsorOverviewStatus).toBe(401);
});

test("direct URLs and crafted API requests cannot cross role boundaries", async ({ page }) => {
  await useRole(page, "family");
  const familyToken = await page.evaluate(async () => {
    const response = await fetch("/api/auth/refresh", { method: "POST" });
    const body = await response.json() as { data: { accessToken: string } };
    return body.data.accessToken;
  });
  const familyStatuses = await page.evaluate(async (accessToken) => Promise.all([
    fetch("/operator/families", { redirect: "manual" }).then((response) => response.status),
    fetch("/api/orders", { headers: { Authorization: `Bearer ${accessToken}` } }).then((response) => response.status),
    fetch("/api/contributions/me", { headers: { Authorization: `Bearer ${accessToken}` } }).then((response) => response.status),
    fetch("/api/sponsors/sponsor-overview-1/overview", { headers: { Authorization: `Bearer ${accessToken}` } }).then((response) => response.status),
    fetch("/api/order-evidence/receipts/serve/00000000-0000-4000-8000-000000000000.pdf", {
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then((response) => response.status),
  ]), familyToken);
  expect(familyStatuses[0]).toBe(403);
  expect(familyStatuses.slice(1)).toEqual([401, 401, 401, 401]);

  await page.context().clearCookies();
  await useRole(page, "sponsor");
  const sponsorToken = await page.evaluate(async () => {
    const response = await fetch("/api/auth/refresh", { method: "POST" });
    const body = await response.json() as { data: { accessToken: string } };
    return body.data.accessToken;
  });
  // The cart is a sheet mounted by OrderCartOverlay, not a route, so there is no
  // page-level status left to assert — the API is the boundary that matters.
  const sponsorStatuses = await page.evaluate(async (accessToken) => Promise.all([
    fetch("/api/orders/cart", { headers: { Authorization: `Bearer ${accessToken}` } }).then((response) => response.status),
    fetch("/api/sponsors/sponsor-overview-1/overview", { headers: { Authorization: `Bearer ${accessToken}` } }).then((response) => response.status),
  ]), sponsorToken);
  expect(sponsorStatuses).toEqual([401, 401]);
});

test("bootstrap admin can open read-only access management pages", async ({
  page,
}) => {
  const adminEmail = process.env.KAFIL_ADMIN_EMAIL;
  const adminPassword = process.env.KAFIL_ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) {
    throw new Error("KAFIL_ADMIN_EMAIL and KAFIL_ADMIN_PASSWORD are required.");
  }
  await page.route("**/api/admin/access/**", async (route) => {
    const { pathname } = new URL(route.request().url());
    if (pathname === "/api/admin/access/users") {
      return json(route, { items: [], total: 0, limit: 25, offset: 0 });
    }
    if (pathname === "/api/admin/access/roles") {
      return json(route, [
        {
          id: "admin",
          name: "admin",
          description: "Bootstrap administrator",
          userCount: 1,
          permissionCount: 1,
          permissions: [],
          codeManaged: true,
          inSync: true,
        },
      ]);
    }
    if (pathname === "/api/admin/access/permissions") return json(route, []);
    return json(route, {});
  });

  await page.goto("/login");
  await page.getByLabel("Email or phone").fill(adminEmail);
  await page.getByPlaceholder("Enter your password").fill(adminPassword);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL(/\/dashboard$/);
  await page.waitForLoadState("domcontentloaded");

  await page.goto("/users");
  await expect(page.getByRole("heading", { name: "Users", exact: true })).toBeVisible();
  await expect(
    page.getByRole("navigation").getByText("Access", { exact: true }),
  ).toBeVisible();
  await page.goto("/roles");
  await expect(page.getByRole("heading", { name: "Roles", exact: true })).toBeVisible();
  await page.waitForLoadState("domcontentloaded");
  await page.goto("/permissions");
  await expect(
    page.getByRole("heading", { name: "Permissions", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Create permission")).toHaveCount(0);
});
