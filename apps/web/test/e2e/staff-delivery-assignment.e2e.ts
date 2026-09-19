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
  test("shows statistics first with no overlay and one right sheet from row or marker", async ({ page }) => {
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

    // Statistics come first; the remaining panels follow the map.
    const mapTop = (await map.boundingBox())!.y;
    const assigned = await page.getByText("Assigned today", { exact: true }).first().boundingBox();
    expect(assigned!.y, "statistics must precede the map").toBeLessThan(mapTop);
    for (const later of ["Delivery overview", "Issues / Attention", "Quick actions"]) {
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

    // The compact workflow tag is omitted; warning state remains visible.
    await expect(sheet.getByText("Purchase required", { exact: true })).toHaveCount(0);
    await expect(sheet.getByText("Address to confirm", { exact: true })).toHaveCount(0);

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

type Box = { x: number; y: number; width: number; height: number };

const layoutLabels = {
  en: {
    map: "Delivery map",
    today: "Today",
    date: "Select delivery date",
    assigned: "Assigned today",
    overview: "Delivery overview",
    stats: [
      "Assigned today",
      "Pending",
      "Delivered",
      "Needs attention",
      "Families today",
      "Packages remaining",
    ],
  },
  fr: {
    map: "Carte des livraisons",
    today: "Aujourd’hui",
    date: "Sélectionner la date de livraison",
  },
  es: {
    map: "Mapa de entregas",
    today: "Hoy",
    date: "Seleccionar fecha de entrega",
  },
  ar: {
    map: "خريطة التوصيل",
    today: "اليوم",
    date: "اختيار تاريخ التوصيل",
  },
} as const;

function overlapsVertically(a: Box, b: Box) {
  return Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > 0;
}

function overlaps(a: Box, b: Box) {
  return (
    overlapsVertically(a, b) &&
    Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > 0
  );
}

function documentOverflow(page: Page) {
  return page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));
}

/** Serves the deterministic dashboard, optionally after a controlled delay. */
function serveDeliveryDashboard(page: Page, delayMs = 0) {
  return page.route("**/api/dashboard/delivery?**", async (route) => {
    if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
    const date = new URL(route.request().url()).searchParams.get("date");
    return json(
      route,
      deliveryDashboard(dashboardItem(date ? { scheduledDate: date } : {})),
    );
  });
}

function mapCardOf(page: Page, title: string) {
  return page
    .locator('[data-slot="card"]')
    .filter({ has: page.getByText(title, { exact: true }) })
    .first();
}

test.describe("Delivery dashboard layout", () => {
  test("keeps the map title, Today, and the date picker on one header row", async ({ page }) => {
    await useRole(page, "delivery");
    await serveDeliveryDashboard(page);
    await page.goto("/dashboard");

    const title = page.getByText(layoutLabels.en.map, { exact: true }).first();
    const today = page.getByRole("button", { name: layoutLabels.en.today, exact: true });
    const date = page.getByRole("button", { name: layoutLabels.en.date });
    await expect(title).toBeVisible();
    await expect(today).toBeVisible();
    await expect(date).toBeVisible();

    for (const width of [320, 390, 430, 768, 1280]) {
      await page.setViewportSize({ width, height: 800 });
      const titleBox = (await title.boundingBox())!;
      const todayBox = (await today.boundingBox())!;
      const dateBox = (await date.boundingBox())!;

      // One row: both controls share vertical space with the title.
      expect(overlapsVertically(titleBox, todayBox), `${width}px Today row`).toBe(true);
      expect(overlapsVertically(titleBox, dateBox), `${width}px date row`).toBe(true);
      // Nothing collides.
      expect(overlaps(titleBox, todayBox), `${width}px title/Today overlap`).toBe(false);
      expect(overlaps(titleBox, dateBox), `${width}px title/date overlap`).toBe(false);
      expect(overlaps(todayBox, dateBox), `${width}px Today/date overlap`).toBe(false);
      // Both controls keep their 40-pixel target.
      expect(todayBox.height, `${width}px Today height`).toBeGreaterThanOrEqual(40);
      expect(dateBox.height, `${width}px date height`).toBeGreaterThanOrEqual(40);

      // Both controls stay inside the map card.
      const card = (await mapCardOf(page, layoutLabels.en.map).boundingBox())!;
      for (const [name, box] of [["Today", todayBox], ["date", dateBox]] as const) {
        expect(box.x, `${width}px ${name} inside card start`).toBeGreaterThanOrEqual(card.x - 1);
        expect(box.x + box.width, `${width}px ${name} inside card end`)
          .toBeLessThanOrEqual(card.x + card.width + 1);
      }

      const overflow = await documentOverflow(page);
      expect(overflow.documentWidth, `${width}px document overflow`)
        .toBeLessThanOrEqual(overflow.viewportWidth);
    }
  });

  test("does not reflow the header while the next date loads", async ({ page }) => {
    await useRole(page, "delivery");
    await serveDeliveryDashboard(page, 1_500);
    await page.goto("/dashboard");
    await page.setViewportSize({ width: 390, height: 800 });

    const today = page.getByRole("button", { name: layoutLabels.en.today, exact: true });
    const date = page.getByRole("button", { name: layoutLabels.en.date });
    const map = page.locator('[aria-label="Delivery map"]');
    await expect(map).toBeVisible();

    const before = { today: (await today.boundingBox())!, date: (await date.boundingBox())! };
    // Marks the live element so a remount, not merely a re-render, is visible.
    await map.evaluate((node) => {
      (node as HTMLElement).dataset.layoutProbe = "1";
    });

    const response = page.waitForResponse(
      (candidate) =>
        new URL(candidate.url()).pathname === "/api/dashboard/delivery" && candidate.ok(),
    );
    await date.click();
    const calendar = page.getByRole("dialog").getByRole("grid");
    await expect(calendar).toBeVisible();
    // Any day other than the currently selected one produces exactly one request.
    const target = new Date().getDate() === 15 ? "16" : "15";
    await calendar.getByRole("button", { name: target, exact: true }).first().click();

    // While the request is in flight the indicator occupies the field's own
    // icon slot: same widths, same position, and the map is never unmounted.
    const loading = page.getByRole("status").first();
    await expect(loading).toBeVisible();
    const during = { today: (await today.boundingBox())!, date: (await date.boundingBox())! };
    expect(during.today.width).toBeCloseTo(before.today.width, 0);
    expect(during.date.width).toBeCloseTo(before.date.width, 0);
    expect(during.date.height).toBeCloseTo(before.date.height, 0);
    expect(during.date.y).toBeCloseTo(before.date.y, 0);
    await expect(map).toHaveAttribute("data-layout-probe", "1");
    // The overlay does not intercept the picker trigger.
    await expect(date).toBeEnabled();

    await response;
    await expect(loading).toBeHidden();
    const after = { today: (await today.boundingBox())!, date: (await date.boundingBox())! };
    expect(after.date.width).toBeCloseTo(before.date.width, 0);
    expect(after.date.height).toBeCloseTo(before.date.height, 0);
    expect(after.date.y).toBeCloseTo(before.date.y, 0);
    await expect(map).toHaveAttribute("data-layout-probe", "1");
    expect(new URL(page.url()).searchParams.has("date")).toBe(false);
  });

  test("keeps the header on one row in French, Spanish, and Arabic RTL", async ({ page }) => {
    await useRole(page, "delivery");
    await serveDeliveryDashboard(page);

    for (const locale of ["fr", "es", "ar"] as const) {
      await page.context().addCookies([{
        name: "kafil-ui-language",
        value: locale,
        url: process.env.KAFIL_E2E_BASE_URL ?? "http://127.0.0.1:3210",
      }]);
      await page.goto("/dashboard");

      const labels = layoutLabels[locale];
      const title = page.getByText(labels.map, { exact: true }).first();
      const today = page.getByRole("button", { name: labels.today, exact: true });
      const date = page.getByRole("button", { name: labels.date });
      await expect(title).toBeVisible();
      if (locale === "ar") {
        await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
      }

      for (const width of [320, 390, 768]) {
        await page.setViewportSize({ width, height: 800 });
        const titleBox = (await title.boundingBox())!;
        const todayBox = (await today.boundingBox())!;
        const dateBox = (await date.boundingBox())!;

        expect(overlapsVertically(titleBox, todayBox), `${locale} ${width}px Today row`).toBe(true);
        expect(overlapsVertically(titleBox, dateBox), `${locale} ${width}px date row`).toBe(true);
        expect(overlaps(todayBox, dateBox), `${locale} ${width}px control overlap`).toBe(false);
        expect(overlaps(titleBox, todayBox), `${locale} ${width}px title overlap`).toBe(false);

        // RTL mirrors the row: the action side moves to the physical left.
        if (locale === "ar") {
          expect(todayBox.x, `ar ${width}px mirrored action side`).toBeLessThan(titleBox.x);
        } else {
          expect(todayBox.x, `${locale} ${width}px action side`).toBeGreaterThan(titleBox.x);
        }

        const overflow = await documentOverflow(page);
        expect(overflow.documentWidth, `${locale} ${width}px overflow`)
          .toBeLessThanOrEqual(overflow.viewportWidth);
      }
    }
  });

  test("puts statistics first and gives the map half of the full-height workspace", async ({ page }) => {
    await useRole(page, "delivery");
    await serveDeliveryDashboard(page);
    await page.goto("/dashboard");

    const mapCard = mapCardOf(page, layoutLabels.en.map);
    const listCard = page.locator("#delivery-list");
    const workspaceSide = page.getByTestId("delivery-workspace-side");
    const map = page.locator('[aria-label="Delivery map"]');
    await expect(map).toBeVisible();

    for (const width of [1280, 1440, 1600]) {
      await page.setViewportSize({ width, height: 1000 });
      const mapBox = (await mapCard.boundingBox())!;
      const mapCanvasBox = (await map.boundingBox())!;
      const listBox = (await listCard.boundingBox())!;
      const sideBox = (await workspaceSide.boundingBox())!;

      // A visible card is not enough: the absolutely positioned Leaflet
      // canvas must receive real height from the card's flex content.
      expect(mapCanvasBox.height, `${width}px Leaflet height`).toBeGreaterThan(300);

      // Every statistic sits above both workspace cards, on one row.
      const statBoxes: Box[] = [];
      for (const stat of layoutLabels.en.stats) {
        const box = (await page.getByText(stat, { exact: true }).first().boundingBox())!;
        statBoxes.push(box);
        expect(box.y, `${width}px ${stat} above the map`).toBeLessThan(mapBox.y);
        expect(box.y, `${width}px ${stat} above the plan`).toBeLessThan(listBox.y);
      }
      for (const box of statBoxes.slice(1)) {
        expect(overlapsVertically(statBoxes[0], box), `${width}px stats on one row`).toBe(true);
      }

      // Tops align, map on the left, plan on the right, no overlap.
      expect(Math.abs(mapBox.y - listBox.y), `${width}px workspace top alignment`)
        .toBeLessThanOrEqual(2);
      // The map spans the full height of the complete right-hand workspace.
      expect(Math.abs(mapBox.height - sideBox.height), `${width}px workspace equal height`)
        .toBeLessThanOrEqual(2);
      expect(mapBox.x, `${width}px map is first`).toBeLessThan(listBox.x);
      expect(overlaps(mapBox, listBox), `${width}px workspace overlap`).toBe(false);

      // Content widths are equal once the single inter-column gap is excluded.
      const gap = sideBox.x - (mapBox.x + mapBox.width);
      const content = mapBox.width + sideBox.width;
      expect(gap, `${width}px column gap`).toBeGreaterThan(0);
      expect(mapBox.width / content, `${width}px map share`).toBeCloseTo(0.5, 2);
      expect(sideBox.width / content, `${width}px side share`).toBeCloseTo(0.5, 2);

      // The secondary row begins below both workspace cards.
      const overview = (await page
        .getByText(layoutLabels.en.overview, { exact: true })
        .first()
        .boundingBox())!;
      expect(overview.y, `${width}px supporting panels follow the plan`)
        .toBeGreaterThan(listBox.y + listBox.height - 2);
      expect(overview.y + overview.height, `${width}px supporting panels stay beside map`)
        .toBeLessThanOrEqual(mapBox.y + mapBox.height + 2);

      const overflow = await documentOverflow(page);
      expect(overflow.documentWidth, `${width}px overflow`)
        .toBeLessThanOrEqual(overflow.viewportWidth);

      // The whole dashboard fits one screen: no page scroll at xl and above.
      const vertical = await page.evaluate(() => {
        const scroller = document.querySelector("main")?.closest("[data-radix-scroll-area-viewport]")
          ?? document.scrollingElement!;
        return { scrollHeight: scroller.scrollHeight, clientHeight: scroller.clientHeight };
      });
      expect(vertical.scrollHeight, `${width}px vertical fit`)
        .toBeLessThanOrEqual(vertical.clientHeight + 2);
    }
  });

  test("stacks statistics, map, and plan in reading order on narrow viewports", async ({ page }) => {
    await useRole(page, "delivery");
    await serveDeliveryDashboard(page);
    await page.goto("/dashboard");

    const mapCard = mapCardOf(page, layoutLabels.en.map);
    const listCard = page.locator("#delivery-list");
    await expect(page.locator('[aria-label="Delivery map"]')).toBeVisible();

    for (const width of [320, 390, 768, 1024]) {
      await page.setViewportSize({ width, height: 900 });
      const assigned = (await page
        .getByText(layoutLabels.en.assigned, { exact: true })
        .first()
        .boundingBox())!;
      const mapBox = (await mapCard.boundingBox())!;
      const listBox = (await listCard.boundingBox())!;

      expect(assigned.y, `${width}px statistics first`).toBeLessThan(mapBox.y);
      // Stacked, not squeezed side by side.
      expect(listBox.y, `${width}px plan below the map`)
        .toBeGreaterThanOrEqual(mapBox.y + mapBox.height - 2);
      expect(overlapsVertically(mapBox, listBox), `${width}px side by side`).toBe(false);

      for (const box of [mapBox, listBox]) {
        expect(box.x, `${width}px card start`).toBeGreaterThanOrEqual(-1);
        expect(box.x + box.width, `${width}px card end`).toBeLessThanOrEqual(width + 1);
      }
      const overflow = await documentOverflow(page);
      expect(overflow.documentWidth, `${width}px overflow`)
        .toBeLessThanOrEqual(overflow.viewportWidth);
    }
  });

  test("redraws the same Leaflet map across the xl breakpoint and keeps both triggers", async ({ page }) => {
    await useRole(page, "delivery");
    await serveDeliveryDashboard(page);
    await page.route(`**/api/orders/${deliveryOrderId}/delivery/me`, (route) =>
      json(route, deliveryDetail()),
    );
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/dashboard");

    const map = page.locator('[aria-label="Delivery map"]');
    await expect(map).toBeVisible();
    await map.evaluate((node) => {
      (node as HTMLElement).dataset.resizeProbe = "1";
    });
    const zoomBefore = await map.evaluate(
      (node) => node.querySelector(".leaflet-proxy")?.getAttribute("style") ?? "",
    );

    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      // The same element, never recreated by the column change.
      await expect(map).toHaveAttribute("data-resize-probe", "1");

      // Loaded tiles cover the resized container instead of leaving a blank strip.
      await expect
        .poll(
          async () =>
            map.evaluate((node) => {
              const rect = node.getBoundingClientRect();
              const tiles = Array.from(node.querySelectorAll(".leaflet-tile-loaded"));
              if (tiles.length === 0) return 0;
              const covered = tiles.reduce((widest, tile) => {
                const box = tile.getBoundingClientRect();
                return Math.max(widest, box.right - rect.left);
              }, 0);
              return Math.round((covered / rect.width) * 100);
            }),
          { message: `${width}px tile coverage` },
        )
        .toBeGreaterThanOrEqual(95);

      // Controls and attribution stay inside the map.
      const mapBox = (await map.boundingBox())!;
      for (const selector of [".leaflet-control-zoom", ".leaflet-control-attribution"]) {
        const control = (await map.locator(selector).first().boundingBox())!;
        expect(control.x, `${width}px ${selector} start`).toBeGreaterThanOrEqual(mapBox.x - 1);
        expect(control.x + control.width, `${width}px ${selector} end`)
          .toBeLessThanOrEqual(mapBox.x + mapBox.width + 1);
      }
    }

    // The resize alone does not reset the user's centre or zoom.
    expect(
      await map.evaluate(
        (node) => node.querySelector(".leaflet-proxy")?.getAttribute("style") ?? "",
      ),
    ).toBe(zoomBefore);

    // A marker and a plan row still open the same single sheet.
    for (const open of [
      () => map.locator(".leaflet-marker-icon").first().click(),
      () => page.getByRole("button", { name: /Fatima Household/ }).first().click(),
    ]) {
      const detail = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname === `/api/orders/${deliveryOrderId}/delivery/me`,
      );
      await open();
      expect((await detail).status()).toBeLessThan(400);
      await expect(page.getByRole("dialog")).toHaveCount(1);
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toBeHidden();
    }
  });
});
