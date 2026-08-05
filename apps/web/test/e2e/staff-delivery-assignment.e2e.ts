import { expect, test, type Page } from "@playwright/test";

type ProductRole = "admin" | "operator" | "family" | "sponsor";

const browserUsers: Record<ProductRole, string> = {
  admin: "phase6-browser-admin@example.test",
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

    await page.goto("/operator/staff");
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
    await page.goto("/operator/staff");
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
    await page.goto("/operator/staff");
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
