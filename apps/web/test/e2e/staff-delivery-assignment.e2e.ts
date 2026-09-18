import { expect, test, type Page } from "@playwright/test";

type ProductRole = "admin" | "operator" | "family" | "sponsor" | "delivery";

const browserUsers: Record<ProductRole, string> = {
  admin: "phase6-browser-admin@example.test",
  delivery: "phase6-browser-delivery@example.test",
  operator: "phase6-browser-operator@example.test",
  family: "phase6-browser-family@example.test",
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
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL(/\/dashboard$/);
  await refresh;
  await page.waitForLoadState("domcontentloaded");
}

function json(route: Parameters<Parameters<Page["route"]>[1]>[0], value: unknown) {
  return route.fulfill({ contentType: "application/json", body: JSON.stringify(value) });
}

const deliveryStaff = {
  address: null,
  affiliation: "external",
  cin: null,
  companyName: "Atlas Courier",
  contactEmail: "dispatch@atlas.test",
  createdAt: "2026-07-30T10:00:00.000Z",
  dateOfBirth: null,
  email: null,
  emailVerified: null,
  functions: ["delivery"],
  gender: null,
  hasOperatorAccess: false,
  id: "30000000-0000-4000-8000-000000000001",
  image: null,
  jobTitle: "Courier",
  name: "Amina Zahra",
  notes: null,
  phone: "+212655443322",
  role: null,
  status: "active",
  updatedAt: "2026-07-30T10:00:00.000Z",
  userId: null,
  userStatus: null,
};

test.describe("Staff completion", () => {
  test("admin gets Sponsor-style cards and a single role form", async ({ page }) => {
    await useRole(page, "admin");
    await page.route("**/api/staff**", async (route) => {
      if (route.request().method() === "GET") {
        return json(route, {
          data: { items: [deliveryStaff], limit: 25, offset: 0, total: 1 },
          status: "success",
        });
      }
      return json(route, deliveryStaff);
    });

    await page.goto("/staff");
    await expect(page.getByRole("heading", { name: "Staff", exact: true })).toBeVisible();
    await expect(page.getByText("Amina Zahra", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Add staff" })).toBeVisible();

    await page.getByRole("button", { name: "Add staff" }).click();
    const staffDialog = page.getByRole("dialog", { name: "Add staff record" });
    await expect(staffDialog).toBeVisible();
    const roleSelect = page.getByRole("combobox", { name: "Select" }).nth(1);
    await expect(roleSelect).toBeVisible();
    await expect(page.getByText("Functions", { exact: true })).toHaveCount(0);
    await roleSelect.click();
    await page.getByRole("option", { name: "Delivery" }).click();
    await expect(page.getByLabel("CIN")).toBeVisible();
    await expect(page.getByLabel("Date of birth")).toBeVisible();
    await expect(page.getByText("Affiliation", { exact: true })).toHaveCount(0);
    await expect(page.getByPlaceholder("External courier company")).toHaveCount(0);
  });

  test("normal operators are denied the Staff management route", async ({ page }) => {
    await useRole(page, "operator");
    await page.goto("/staff");
    await expect(page).toHaveURL(/(?:\/forbidden$|\/login\?from=%2Fforbidden$)/);
  });

  test("Arabic Staff management uses RTL and translated role copy", async ({ page }) => {
    await useRole(page, "admin", "ar");
    await page.route("**/api/staff**", (route) =>
      json(route, {
        data: { items: [], limit: 25, offset: 0, total: 0 },
        status: "success",
      }),
    );
    await page.goto("/staff");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("heading", { name: "الموظفون" })).toBeVisible();
    await expect(page.getByRole("button", { name: "إضافة موظف" })).toBeVisible();
  });
});

test.describe("Delivery assignment workflow", () => {
  test("operator reassigns, starts, fails, and views immutable history", async ({ page }) => {
    await useRole(page, "operator");
    let status = "purchased";
    let currentStaff = {
      id: "30000000-0000-4000-8000-000000000001",
      name: "Amina Courier",
      phone: "+212600001122",
      affiliation: "internal",
      companyName: null as string | null,
    };
    const attempts: Array<Record<string, unknown>> = [
      deliveryAttempt(currentStaff, "assigned"),
    ];

    const order = () => deliveryOrder(status, currentStaff, attempts);
    await page.route("**/api/staff/options/delivery", (route) =>
      json(route, [
        {
          id: "30000000-0000-4000-8000-000000000002",
          name: "Youssef Driver",
          image: null,
          phone: "+212600003344",
          affiliation: "external",
          companyName: "Atlas Courier",
          functionKeys: ["delivery"],
        },
      ]),
    );
    await page.route("**/api/orders**", async (route) => {
      const request = route.request();
      const { pathname } = new URL(request.url());
      if (request.method() === "GET" && pathname === "/api/orders") {
        return json(route, [order()]);
      }
      if (request.method() === "POST" && pathname.endsWith("/delivery/reassign")) {
        const body = request.postDataJSON() as { reason: string };
        Object.assign(attempts.at(-1)!, {
          status: "cancelled",
          cancelledAt: "2026-07-30T10:10:00.000Z",
          cancellationReason: body.reason,
        });
        currentStaff = {
          id: "30000000-0000-4000-8000-000000000002",
          name: "Youssef Driver",
          phone: "+212600003344",
          affiliation: "external",
          companyName: "Atlas Courier",
        };
        attempts.push(deliveryAttempt(currentStaff, "assigned", "attempt-2"));
      }
      if (request.method() === "POST" && pathname.endsWith("/delivery/start")) {
        status = "out_for_delivery";
        Object.assign(attempts.at(-1)!, {
          status: "in_progress",
          startedAt: "2026-07-30T10:20:00.000Z",
        });
      }
      if (request.method() === "POST" && pathname.endsWith("/delivery/fail")) {
        const body = request.postDataJSON() as { reason: string };
        status = "purchased";
        Object.assign(attempts.at(-1)!, {
          status: "failed",
          failedAt: "2026-07-30T10:30:00.000Z",
          failureReason: body.reason,
        });
      }
      return json(route, order());
    });

    await page.goto("/orders");
    await expect(page.getByRole("button", { name: /View delivery for K-DEL-001: Amina Courier/ })).toBeVisible();

    await page.getByRole("button", { name: "Row actions" }).click();
    await page.getByRole("menuitem", { name: "Change delivery staff" }).click();
    const reassign = page.getByRole("dialog", { name: "Change delivery staff" });
    await reassign.getByRole("combobox").first().click();
    await page.getByRole("option", { name: /Youssef Driver/ }).click();
    await reassign.locator("textarea").fill("Courier shift changed");
    await reassign.getByRole("button", { name: "Change staff" }).click();
    await expect(page.getByRole("button", { name: /Youssef Driver/ })).toBeVisible();

    await page.getByRole("button", { name: "Row actions" }).click();
    await page.getByRole("menuitem", { name: "Start delivery" }).click();
    await page.getByRole("button", { name: "Start delivery" }).click();

    await page.getByRole("button", { name: "Row actions" }).click();
    await page.getByRole("menuitem", { name: "Delivery failed" }).click();
    const failed = page.getByRole("dialog", { name: "Delivery failed" });
    await failed.locator("textarea").fill("Recipient unavailable");
    await failed.getByRole("button", { name: "Record failure" }).click();

    const needsReassignment = page.getByRole("button", {
      name: /View delivery for K-DEL-001: Needs reassignment/,
    });
    await expect(needsReassignment).toBeVisible();
    await needsReassignment.click();
    const sheet = page.getByRole("dialog", { name: /Delivery · K-DEL-001/ });
    await expect(sheet.getByText("Attempt history", { exact: true })).toBeVisible();
    await expect(sheet.getByText("Recipient unavailable", { exact: true })).toBeVisible();
    await expect(sheet.getByText("Courier shift changed", { exact: true })).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    const mobileSheet = await sheet.boundingBox();
    expect(mobileSheet).not.toBeNull();
    expect(mobileSheet!.width).toBeGreaterThanOrEqual(390 * 0.94);
    expect(mobileSheet!.width).toBeLessThanOrEqual(390);
  });

  test("family and sponsor views never render delivery staff identity or phone", async ({ page }) => {
    const forbiddenValues = ["Amina Courier", "+212600001122", "Atlas Courier"];
    await useRole(page, "family");
    await page.route("**/api/orders/me**", (route) =>
      json(route, [familySafeOrder()]),
    );
    await page.goto("/orders");
    await expect(page.getByText("Preparing for delivery", { exact: true })).toBeVisible();
    for (const value of forbiddenValues) {
      await expect(page.getByText(value, { exact: true })).toHaveCount(0);
    }

    await page.context().clearCookies();
    await useRole(page, "sponsor");
    await page.route("**/api/orders/supported**", (route) =>
      json(route, [sponsorSafeOrder()]),
    );
    await page.goto("/orders");
    await expect(page.getByText("K-SAFE-001", { exact: true })).toBeVisible();
    for (const value of forbiddenValues) {
      await expect(page.getByText(value, { exact: true })).toHaveCount(0);
    }
  });
});

function deliveryAttempt(
  staff: { id: string; name: string; phone: string; affiliation: string; companyName: string | null },
  status: string,
  id = "attempt-1",
) {
  return {
    id,
    orderId: "40000000-0000-4000-8000-000000000001",
    staffProfileId: staff.id,
    status,
    deliveryNameSnapshot: staff.name,
    deliveryPhoneSnapshot: staff.phone,
    affiliationSnapshot: staff.affiliation,
    companyNameSnapshot: staff.companyName,
    assignedByUserId: "operator-user",
    assignedAt: "2026-07-30T10:00:00.000Z",
    startedAt: null,
    failedAt: null,
    completedAt: null,
    cancelledAt: null,
    failureReason: null,
    cancellationReason: null,
    createdAt: "2026-07-30T10:00:00.000Z",
    updatedAt: "2026-07-30T10:00:00.000Z",
  };
}

function deliveryOrder(
  status: string,
  staff: { id: string; name: string; phone: string; affiliation: string; companyName: string | null },
  attempts: Array<Record<string, unknown>>,
) {
  const active = attempts.findLast((attempt) =>
    ["assigned", "in_progress"].includes(String(attempt.status)),
  );
  const latest = attempts.at(-1)!;
  return {
    id: "40000000-0000-4000-8000-000000000001",
    orderNumber: "K-DEL-001",
    familyProfileId: "family-1",
    placementSource: "family_self_service",
    assistanceChannel: null,
    assistanceNote: null,
    status,
    subtotalMinor: 2500,
    totalMinor: 2500,
    currency: "MAD",
    guardianLegalNameSnapshot: "Safe Family",
    familyImage: null,
    articleCount: 1,
    deliveryAddressSnapshot: "Protected address",
    deliveryPhoneSnapshot: null,
    createdAt: "2026-07-30T09:00:00.000Z",
    updatedAt: "2026-07-30T10:30:00.000Z",
    approvedAt: "2026-07-30T09:10:00.000Z",
    deliveryStartedAt: status === "out_for_delivery" ? "2026-07-30T10:20:00.000Z" : null,
    deliveredAt: null,
    currentDelivery: active
      ? {
          attemptId: active.id,
          staffProfileId: active.staffProfileId,
          name: active.deliveryNameSnapshot,
          status: active.status,
          assignedAt: active.assignedAt,
        }
      : null,
    latestDelivery: {
      attemptId: latest.id,
      staffProfileId: latest.staffProfileId,
      name: latest.deliveryNameSnapshot,
      status: latest.status,
      assignedAt: latest.assignedAt,
    },
    items: [],
    statusEvents: [],
    purchases: [],
    activePurchase: {
      id: "purchase-1",
      orderId: "40000000-0000-4000-8000-000000000001",
      merchantName: "Marjane",
      purchasedAt: "2026-07-30T09:20:00.000Z",
      actualTotalMinor: 2500,
      receiptNumber: null,
      receiptStoragePath: "/api/order-evidence/receipts/serve/a.pdf",
    },
    requestedTotalMinor: 2500,
    actualTotalMinor: 2500,
    receiptRecorded: true,
    deliveryProofRecorded: false,
    deliveryAttempts: attempts,
    latestStaff: staff.name,
  };
}

function familySafeOrder() {
  return {
    id: "safe-order-1",
    orderNumber: "K-SAFE-001",
    status: "purchased",
    totalMinor: 2500,
    requestedTotalMinor: 2500,
    actualTotalMinor: 2500,
    differenceMinor: 0,
    merchantName: "Marjane",
    purchasedAt: "2026-07-30T09:20:00.000Z",
    receiptRecorded: true,
    deliveryAssigned: true,
    deliveryStartedAt: null,
    deliveredAt: null,
    deliveryProofRecorded: false,
    assisted: false,
    currency: "MAD",
    createdAt: "2026-07-30T09:00:00.000Z",
    updatedAt: "2026-07-30T10:00:00.000Z",
    cancellationReason: null,
  };
}

function sponsorSafeOrder() {
  return {
    id: "safe-order-1",
    orderNumber: "K-SAFE-001",
    status: "purchased",
    totalMinor: 2500,
    actualTotalMinor: 2500,
    merchantName: "Marjane",
    placedAt: "2026-07-30T09:00:00.000Z",
    purchasedAt: "2026-07-30T09:20:00.000Z",
    receiptRecorded: true,
    deliveryStartedAt: null,
    deliveredAt: null,
    deliveryProofRecorded: false,
    items: [{ productName: "Rice", sku: "RICE", quantity: 1, unitPriceMinor: 2500, lineTotalMinor: 2500 }],
  };
}


const deliveryOrderId = "40000000-0000-4000-8000-000000000001";
const deliveryAttemptId = "50000000-0000-4000-8000-000000000001";

function dashboardItem(overrides: Record<string, unknown> = {}) {
  return {
    attemptId: deliveryAttemptId,
    orderId: deliveryOrderId,
    orderNumber: "KAF-HFQCHE",
    familyProfileId: "family-1",
    familyName: "Fatima Household",
    familyImage: null,
    category: "needs_attention",
    attemptStatus: "assigned",
    orderStatus: "approved",
    workflowState: "purchase_required",
    address: "Protected address",
    phone: "+212600001122",
    coordinates: { latitude: 33.5731, longitude: -7.5898 },
    scheduledDate: "2026-09-18",
    windowStartMinute: 600,
    windowEndMinute: 720,
    packageCount: 2,
    delayed: false,
    openIssues: [
      { id: "issue-1", kind: "address_confirmation", note: null },
    ],
    canPurchase: true,
    canStart: false,
    canConfirm: false,
    canReportIssue: true,
    ...overrides,
  };
}

function deliveryDashboard(item: Record<string, unknown>) {
  return {
    selectedDate: String(item.scheduledDate),
    timezone: "Africa/Casablanca",
    counts: {
      assigned: 1,
      pending: 0,
      delivered: 0,
      needsAttention: 1,
      families: 1,
      packagesRemaining: 2,
    },
    issueCounts: {
      addressToConfirm: 1,
      familyUnreachable: 0,
      missingProof: 0,
      delayed: 0,
    },
    deliveries: [item],
  };
}

function deliveryDetail(overrides: Record<string, unknown> = {}) {
  return {
    id: deliveryOrderId,
    orderNumber: "KAF-HFQCHE",
    status: "approved",
    currency: "MAD",
    requestedTotalMinor: 32_900,
    actualTotalMinor: null,
    receiptRecorded: false,
    familyName: "Fatima Household",
    familyImage: null,
    deliveryAddressSnapshot: "Protected address",
    deliveryPhoneSnapshot: "+212600001122",
    coordinates: { latitude: 33.5731, longitude: -7.5898 },
    items: [
      {
        id: "order-item-1",
        productId: "product-1",
        productNameSnapshot: "Rice 5kg",
        skuSnapshot: "RICE-5KG",
        quantity: 2,
        unitPriceMinor: 16_450,
        lineTotalMinor: 32_900,
      },
    ],
    attempt: {
      id: deliveryAttemptId,
      status: "assigned",
      scheduledDate: "2026-09-18",
      windowStartMinute: 600,
      windowEndMinute: 720,
      packageCount: 2,
    },
    openIssues: [{ id: "issue-1", kind: "address_confirmation", note: null }],
    workflowState: "purchase_required",
    canPurchase: true,
    canStart: false,
    canConfirm: false,
    canReportIssue: true,
    ...overrides,
  };
}

test.describe("Delivery purchase workflow", () => {
  test("shows the map first with no overlay and one right sheet from row or marker", async ({ page }) => {
    await useRole(page, "delivery");
    await page.route("**/api/dashboard/delivery?**", (route) =>
      json(route, deliveryDashboard(dashboardItem())),
    );
    await page.route(`**/api/orders/${deliveryOrderId}/delivery/me`, (route) =>
      json(route, deliveryDetail()),
    );

    await page.goto("/dashboard");
    const map = page.locator('[aria-label="Delivery map"]');
    await expect(map).toBeVisible();

    // The map card precedes every other dashboard section in the document.
    const mapTop = (await map.boundingBox())!.y;
    for (const later of ["Assigned today", "Delivery overview", "Issues / Attention", "Quick actions"]) {
      const box = await page.getByText(later, { exact: true }).first().boundingBox();
      expect(box!.y, `${later} must follow the map`).toBeGreaterThan(mapTop);
    }

    // Nothing is layered over the markers before a selection is made.
    await expect(page.getByRole("button", { name: "Validate purchase" })).toHaveCount(0);
    await expect(page.getByText("Protected address", { exact: true })).toHaveCount(0);

    // The planned-delivery row opens the sheet.
    const detailResponse = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === `/api/orders/${deliveryOrderId}/delivery/me`,
    );
    await page.getByRole("button", { name: /Fatima Household/ }).first().click();
    expect((await detailResponse).status()).toBeLessThan(400);

    const sheet = page.getByRole("dialog");
    await expect(sheet).toBeVisible();
    await expect(sheet.getByText("Fatima Household", { exact: true })).toBeVisible();
    await expect(sheet.getByText("Rice 5kg", { exact: true })).toBeVisible();
    await expect(sheet.getByText("Protected address")).toBeVisible();

    // Workflow state and warning state are independent badges.
    await expect(sheet.getByText("Purchase required", { exact: true })).toBeVisible();
    await expect(sheet.getByText("Address to confirm", { exact: true })).toBeVisible();

    // No Delivery-person card: the reader is the assignee.
    await expect(sheet.getByText("Delivery person", { exact: true })).toHaveCount(0);

    // The sheet opens from the right.
    const sheetBox = (await sheet.boundingBox())!;
    const viewport = page.viewportSize()!;
    expect(sheetBox.x + sheetBox.width).toBeGreaterThan(viewport.width - 4);

    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
  });

  test("records the first purchase through the shared form and refreshes from server state", async ({ page }) => {
    await useRole(page, "delivery");
    let purchased = false;
    let purchaseBody: Record<string, unknown> | null = null;

    await page.route("**/api/dashboard/delivery?**", (route) =>
      json(
        route,
        deliveryDashboard(
          purchased
            ? dashboardItem({
                orderStatus: "purchased",
                workflowState: "ready_for_delivery",
                canPurchase: false,
                canStart: true,
              })
            : dashboardItem(),
        ),
      ),
    );
    await page.route(`**/api/orders/${deliveryOrderId}/delivery/me`, (route) =>
      json(
        route,
        purchased
          ? deliveryDetail({
              status: "purchased",
              actualTotalMinor: 31_400,
              receiptRecorded: true,
              workflowState: "ready_for_delivery",
              canPurchase: false,
              canStart: true,
            })
          : deliveryDetail(),
      ),
    );
    await page.route("**/api/order-evidence/me/receipts/*", (route) =>
      json(route, {
        path: "/api/order-evidence/receipts/serve/00000000-0000-4000-8000-0000000000aa.pdf",
        mediaType: "application/pdf",
        byteSize: 64,
      }),
    );
    await page.route(`**/api/orders/${deliveryOrderId}/purchase/me`, async (route) => {
      purchaseBody = JSON.parse(route.request().postData() ?? "{}");
      purchased = true;
      return json(route, deliveryDetail({ status: "purchased", workflowState: "ready_for_delivery" }));
    });

    await page.goto("/dashboard");
    await page.getByRole("button", { name: /Fatima Household/ }).first().click();
    const sheet = page.getByRole("dialog");
    await expect(sheet).toBeVisible();

    await sheet.getByRole("button", { name: "Validate purchase" }).click();
    const purchaseDialog = page.getByRole("dialog", { name: "Validate purchase" });
    await expect(purchaseDialog).toBeVisible();

    // The shared operator form body, without the operator-only replacement field.
    await expect(purchaseDialog.getByLabel("Merchant")).toBeVisible();
    await expect(purchaseDialog.getByLabel("Actual amount")).toHaveValue("329.00");
    await expect(purchaseDialog.getByLabel("Replacement reason")).toHaveCount(0);

    await purchaseDialog.getByLabel("Actual amount").fill("314.00");
    await purchaseDialog
      .getByLabel("Protected receipt")
      .setInputFiles({
        name: "receipt.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("%PDF-1.4 delivery receipt"),
      });

    const purchaseResponse = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === `/api/orders/${deliveryOrderId}/purchase/me`,
    );
    await purchaseDialog.getByRole("button", { name: "Record purchase" }).click();
    expect((await purchaseResponse).status()).toBeLessThan(400);

    // Integer minor units only, and the estimate is not silently confirmed up.
    expect(purchaseBody).toMatchObject({
      actualTotalMinor: 31_400,
      confirmHigherAmount: false,
      merchantName: "Marjane",
    });
    expect(
      Number.isInteger(
        (purchaseBody as unknown as { actualTotalMinor: number }).actualTotalMinor,
      ),
    ).toBe(true);

    // The sheet stays open and advances only from the refreshed server state.
    await expect(purchaseDialog).toBeHidden();
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole("button", { name: "Start delivery" })).toBeVisible();
    await expect(sheet.getByRole("button", { name: "Validate purchase" })).toHaveCount(0);
  });

  test("keeps the Arabic sheet on the right without horizontal overflow at 320px", async ({ page }) => {
    await useRole(page, "delivery", "ar");
    await page.setViewportSize({ width: 320, height: 720 });
    await page.route("**/api/dashboard/delivery?**", (route) =>
      json(route, deliveryDashboard(dashboardItem())),
    );
    await page.route(`**/api/orders/${deliveryOrderId}/delivery/me`, (route) =>
      json(route, deliveryDetail()),
    );

    await page.goto("/dashboard");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await page.getByRole("button", { name: /Fatima Household/ }).first().click();
    const sheet = page.getByRole("dialog");
    await expect(sheet).toBeVisible();

    const sheetBox = (await sheet.boundingBox())!;
    expect(sheetBox.x + sheetBox.width).toBeGreaterThan(316);
    await expect(sheet.getByText("الشراء مطلوب", { exact: true })).toBeVisible();

    const overflow = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    }));
    expect(overflow.documentWidth).toBeLessThanOrEqual(overflow.viewportWidth);
  });
});
