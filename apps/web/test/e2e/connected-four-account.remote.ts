import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type Locator,
  type Page,
  type Request,
  type Response,
} from "@playwright/test";

import {
  CONNECTED_RUN_FIXTURE,
  buildRunCin,
  buildRunEmail,
  buildRunPhone,
  formatMadFromMinor,
} from "../../scripts/connected-four-account-fixtures";

const baseUrl = process.env.KAFIL_E2E_BASE_URL ?? "";
const adminEmail = process.env.KAFIL_ADMIN_EMAIL ?? "";
const adminPassword = process.env.KAFIL_ADMIN_PASSWORD ?? "";
const mailboxApiUrl = process.env.KAFIL_E2E_MAILBOX_API_URL ?? "";
const mailboxApiUser = process.env.KAFIL_E2E_MAILBOX_USER ?? "";
const mailboxApiPassword = process.env.KAFIL_E2E_MAILBOX_PASSWORD ?? "";

if (baseUrl !== "https://kafala360.ma") {
  throw new Error("Remote connected acceptance requires the exact guarded demo origin.");
}
if (!mailboxApiUrl || !mailboxApiUser || !mailboxApiPassword) {
  throw new Error("Remote connected acceptance requires the guarded Mailpit API configuration.");
}

interface ExpectedResponse {
  method: string;
  path: string;
  status: number;
  consumed: number;
  required: boolean;
}

interface ExpectedConsoleError {
  path: string;
  status: number;
  consumed: number;
}

interface Diagnostics {
  pageErrors: string[];
  consoleErrors: string[];
  failedRequests: string[];
  badResponses: string[];
  expectedResponses: ExpectedResponse[];
  expectedConsoleErrors: ExpectedConsoleError[];
}

interface BrowserJsonResult {
  status: number;
  body: unknown;
}

interface BrowserResourceResult {
  status: number;
  contentType: string;
  byteLength: number;
}

interface CleanupSummary {
  applicationRowsRetained: number;
  evidenceFilesRetained: number;
  mailboxMessagesRetained: number;
  evidenceFilesDeleted: number;
  mailboxMessagesDeleted: number;
  reporting: "counts-only";
  databaseOnlyGuarantees: "NOT VERIFIED";
}

interface BudgetSnapshot {
  availableMinor: number;
  reservedMinor: number;
  spentMinor: number;
}

interface OrderJourneyPages {
  adminPage: Page;
  familyPage: Page;
  sponsorAPage: Page;
  sponsorBPage: Page;
}

interface OrderJourneyProduct {
  id: string;
  name: string;
  priceMinor: number;
}

interface ReversibleOrdersState {
  pages: OrderJourneyPages;
  initialBudget: BudgetSnapshot;
  product: OrderJourneyProduct;
  staffAId: string;
  staffBId: string;
}

interface DeliveredOrderState {
  pages: OrderJourneyPages;
  staffAId: string;
  staffBId: string;
  order3Id: string;
  receiptPath: string;
  deliveryProofPath: string;
}

type DeliveredOrderPhase =
  | "delivery-complete"
  | "family-projection-complete"
  | "sponsor-a-projection-complete"
  | "sponsor-b-projection-complete"
  | "admin-projection-complete"
  | "family-denial-complete"
  | "sponsor-a-denial-complete"
  | "denials-complete";

type OrderJourneyState =
  | { phase: "not-started" }
  | (ReversibleOrdersState & { phase: "reversible-orders-complete" })
  | (DeliveredOrderState & { phase: DeliveredOrderPhase });

function requireReversibleOrdersComplete(
  value: OrderJourneyState,
): ReversibleOrdersState {
  if (value.phase !== "reversible-orders-complete") {
    throw new Error("Remote order lifecycle requires completed reversible orders");
  }
  return value;
}

function requireDeliveredOrderPhase(
  value: OrderJourneyState,
  expectedPhase: DeliveredOrderPhase,
): DeliveredOrderState {
  if (!("order3Id" in value) || value.phase !== expectedPhase) {
    throw new Error(`Remote order lifecycle requires phase ${expectedPhase}`);
  }
  return value;
}

interface RemoteState {
  familyProfileId: string;
  familyUserId: string;
  familyTemporaryCredential: string;
  sponsorAApplicantId: string;
  sponsorAProfileId: string;
  sponsorAUserId: string;
  sponsorBApplicantId: string;
  sponsorBProfileId: string;
  sponsorBUserId: string;
  assignmentAId: string;
  assignmentBId: string;
}

interface MailpitMessageSummary {
  ID: string;
  Created: string;
}

interface MailpitMessage extends MailpitMessageSummary {
  To: Array<{ Address: string }>;
  Subject: string;
  Snippet?: string;
  Body?: string;
  HTML?: string;
}

const runStartedAt = Date.now();
const runLabel = `vps-${runStartedAt.toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
const familyEmail = buildRunEmail(runLabel, "family");
const familyPhone = buildRunPhone(runLabel, "family");
const familyCin = buildRunCin(runLabel, "family");
const familyName = `Connected Family ${runLabel}`;
const familyAddress = `VPS acceptance address ${runLabel}`;
const familyRuntimePassword = `Kf${crypto.randomUUID().replaceAll("-", "").slice(0, 20)}9`;
const sponsorAEmail = buildRunEmail(runLabel, "sponsorA");
const sponsorAPhone = buildRunPhone(runLabel, "sponsorA");
const sponsorACin = buildRunCin(runLabel, "sponsorA");
const sponsorAName = `Connected Sponsor A ${runLabel}`;
const sponsorAPassword = `Ks${crypto.randomUUID().replaceAll("-", "").slice(0, 20)}7`;
const sponsorBEmail = buildRunEmail(runLabel, "sponsorB");
const sponsorBPhone = buildRunPhone(runLabel, "sponsorB");
const sponsorBCin = buildRunCin(runLabel, "sponsorB");
const sponsorBName = `Connected Sponsor B ${runLabel}`;
const sponsorBPassword = `Kt${crypto.randomUUID().replaceAll("-", "").slice(0, 20)}8`;
const deliveryStaffFixtures = (["a", "b"] as const).map((alias, index) => {
  const fixtureLabel = `${runLabel}-delivery-${alias}`;
  return {
    cin: buildRunCin(fixtureLabel, "family"),
    email: buildRunEmail(fixtureLabel, "family"),
    name: `Connected Delivery ${index === 0 ? "A" : "B"} ${runLabel}`,
    phone: buildRunPhone(fixtureLabel, "family"),
  };
});
const state: RemoteState = {
  familyProfileId: "",
  familyUserId: "",
  familyTemporaryCredential: "",
  sponsorAApplicantId: "",
  sponsorAProfileId: "",
  sponsorAUserId: "",
  sponsorBApplicantId: "",
  sponsorBProfileId: "",
  sponsorBUserId: "",
  assignmentAId: "",
  assignmentBId: "",
};

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

function makeDiagnostics(): Diagnostics {
  return {
    pageErrors: [],
    consoleErrors: [],
    failedRequests: [],
    badResponses: [],
    expectedResponses: [],
    expectedConsoleErrors: [],
  };
}

function registerExpectedResponse(
  captured: Diagnostics,
  contract: { method: string; path: string; status: number },
  required = true,
): ExpectedResponse {
  const expected = { ...contract, consumed: 0, required };
  captured.expectedResponses.push(expected);
  captured.expectedConsoleErrors.push({
    path: contract.path,
    status: contract.status,
    consumed: 0,
  });
  return expected;
}

function attachDiagnostics(page: Page, captured: Diagnostics): void {
  page.on("pageerror", (error) => captured.pageErrors.push(error.name || "pageerror"));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const statusMatch = message.text().match(/status of (\d{3})/i);
    const locationUrl = message.location().url;
    if (statusMatch && locationUrl) {
      const path = new URL(locationUrl).pathname;
      const status = Number(statusMatch[1]);
      const expected = captured.expectedConsoleErrors.find(
        (candidate) =>
          candidate.path === path &&
          candidate.status === status &&
          candidate.consumed === 0,
      );
      if (expected) {
        expected.consumed = 1;
        return;
      }
    }
    captured.consoleErrors.push("console-error");
  });
  page.on("requestfailed", (request) => {
    const failure = request.failure();
    if (failure && /^(net::ERR_ABORTED|aborted)$/i.test(failure.errorText)) return;
    captured.failedRequests.push(`${request.method()} ${new URL(request.url()).pathname}`);
  });
  page.on("response", (response) => {
    if (response.status() < 400) return;
    const path = new URL(response.url()).pathname;
    const method = response.request().method();
    const expected = captured.expectedResponses.find(
      (candidate) =>
        candidate.method === method &&
        candidate.path === path &&
        candidate.status === response.status() &&
        candidate.consumed === 0,
    );
    if (expected) {
      expected.consumed = 1;
      return;
    }
    captured.badResponses.push(`${method} ${path} ${response.status()}`);
  });
}

async function onlyVisible(locator: Locator): Promise<Locator> {
  let visibleIndex = -1;
  await expect.poll(async () => {
    const visibleIndexes: number[] = [];
    for (let index = 0; index < await locator.count(); index += 1) {
      if (await locator.nth(index).isVisible()) visibleIndexes.push(index);
    }
    visibleIndex = visibleIndexes.length === 1 ? visibleIndexes[0]! : -1;
    return visibleIndexes.length;
  }).toBe(1);
  const visible = locator.nth(visibleIndex);
  await expect(visible).toBeVisible();
  return visible;
}

async function expectNoneVisible(locator: Locator): Promise<void> {
  await expect.poll(async () => {
    let visible = 0;
    for (let index = 0; index < await locator.count(); index += 1) {
      if (await locator.nth(index).isVisible()) visible += 1;
    }
    return visible;
  }).toBe(0);
}

async function setLanguage(
  context: BrowserContext,
  language: "ar" | "en",
): Promise<void> {
  await context.addCookies([
    { name: "kafil-ui-language", value: language, url: baseUrl },
  ]);
}

async function setEnglish(context: BrowserContext): Promise<void> {
  await setLanguage(context, "en");
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  await expect.poll(() =>
    page.evaluate(() =>
      Math.max(
        0,
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
      ),
    ),
  ).toBeLessThanOrEqual(1);
}

async function waitForLoginHydration(page: Page): Promise<Locator> {
  const identifier = page.getByLabel(/Email or phone/i);
  await expect(identifier).toBeVisible();
  await expect.poll(
    () => page.locator("#login-form").evaluate((form) => {
      const propsKey = Object.keys(form).find((key) => key.startsWith("__reactProps$"));
      if (!propsKey) return false;
      const props = (form as unknown as Record<string, { onSubmit?: unknown }>)[propsKey];
      return typeof props?.onSubmit === "function";
    }),
  ).toBe(true);
  return identifier;
}

async function prepareLogin(page: Page, identifier: string, password: string): Promise<void> {
  await page.goto("/login", { waitUntil: "commit" });
  expect(new URL(page.url()).pathname).toBe("/login");
  await (await waitForLoginHydration(page)).fill(identifier);
  await page.getByPlaceholder(/Enter your password/i).fill(password);
}

async function submitPreparedLogin(
  page: Page,
  captured?: Diagnostics,
  expectedStatus?: number,
): Promise<Response> {
  const expected =
    captured && expectedStatus !== undefined && expectedStatus >= 400
      ? registerExpectedResponse(captured, {
          method: "POST",
          path: "/api/auth/login",
          status: expectedStatus,
        })
      : undefined;
  const observedRequest = page.waitForRequest((request) => {
    const path = new URL(request.url()).pathname;
    return (
      (request.method() === "POST" && path === "/api/auth/login") ||
      (request.method() === "GET" && path === "/login")
    );
  });
  const loginResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname === "/api/auth/login",
  );
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  const request = await observedRequest;
  expect(request.method(), "login must use the hydrated Najm submit handler").toBe("POST");
  const response = await loginResponse;
  if (expectedStatus === undefined) {
    expect(response.status()).toBeLessThan(400);
  } else {
    expect(response.status()).toBe(expectedStatus);
  }
  if (expected) await expect.poll(() => expected.consumed).toBe(1);
  return response;
}

async function signOut(page: Page): Promise<void> {
  const authBoundaryResponses: string[] = [];
  const observeAuthBoundaryResponse = (response: Response): void => {
    const url = new URL(response.url());
    if (
      response.request().method() === "POST" &&
      ["/api/auth/logout", "/api/auth/refresh", "/api/auth/session/recover"].includes(
        url.pathname,
      )
    ) {
      authBoundaryResponses.push(`${url.pathname}:${response.status()}`);
    }
  };
  page.on("response", observeAuthBoundaryResponse);
  const signOutButton = await onlyVisible(
    page.locator("button").filter({ has: page.locator("svg.lucide-log-out") }),
  );
  try {
    await expect.poll(
      () => signOutButton.evaluate((button) => {
        const propsKey = Object.keys(button).find((key) => key.startsWith("__reactProps$"));
        if (!propsKey) return false;
        const props = (button as unknown as Record<string, { onClick?: unknown }>)[propsKey];
        return typeof props?.onClick === "function";
      }),
    ).toBe(true);
    await signOutButton.click({ trial: true, timeout: 5_000 });
    const logoutResponse = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === "/api/auth/logout",
    );
    await signOutButton.click();
    expect((await logoutResponse).status()).toBeLessThan(400);
    await expect.poll(() => new URL(page.url()).pathname).toBe("/login");
    await assertNoAuthCookies(page.context(), authBoundaryResponses);
  } finally {
    page.off("response", observeAuthBoundaryResponse);
  }
}

async function restoreDesktopViewports(...pages: Page[]): Promise<void> {
  await Promise.all(
    pages.map((page) => page.setViewportSize({ width: 1280, height: 900 })),
  );
}

async function assertNoAuthCookies(
  context: BrowserContext,
  authBoundaryResponses: string[] = [],
): Promise<void> {
  const cookies = await context.cookies();
  const authCookieKinds = cookies.flatMap((cookie) => {
    if (/^accessToken$/i.test(cookie.name)) return ["access"];
    if (/^refreshToken$/i.test(cookie.name)) return ["refresh"];
    if (/^najm\.session$/i.test(cookie.name)) return ["session"];
    return [];
  });
  expect(
    authCookieKinds,
    `recognized auth cookies remained after logout; kinds=${authCookieKinds.join(",") || "none"}; auth-boundary-responses=${authBoundaryResponses.join(",") || "none"}`,
  ).toEqual([]);
}

async function browserJsonRequest(
  page: Page,
  method: "DELETE" | "GET" | "POST",
  path: string,
  body?: Record<string, unknown>,
): Promise<BrowserJsonResult> {
  return page.evaluate(
    async ({ requestBody, requestMethod, requestPath, rootUrl }) => {
      const response = await fetch(`${rootUrl}${requestPath}`, {
        method: requestMethod,
        credentials: "include",
        headers: requestBody ? { "content-type": "application/json" } : undefined,
        body: requestBody ? JSON.stringify(requestBody) : undefined,
      });
      return {
        status: response.status,
        body: await response.json().catch(() => null),
      };
    },
    { requestBody: body, requestMethod: method, requestPath: path, rootUrl: baseUrl },
  );
}

async function browserResourceRequest(
  page: Page,
  path: string,
): Promise<BrowserResourceResult> {
  return page.evaluate(
    async ({ requestPath, rootUrl }) => {
      const response = await fetch(`${rootUrl}${requestPath}`, {
        credentials: "include",
      });
      const bytes = await response.arrayBuffer();
      return {
        status: response.status,
        contentType: response.headers.get("content-type") ?? "",
        byteLength: bytes.byteLength,
      };
    },
    { requestPath: path, rootUrl: baseUrl },
  );
}

async function uploadGeneratedPdfEvidence(
  page: Page,
  kind: "deliveries" | "receipts",
): Promise<BrowserJsonResult> {
  return page.evaluate(
    async ({ evidenceKind, rootUrl }) => {
      const fileName = `${crypto.randomUUID()}.pdf`;
      const bytes = new TextEncoder().encode("%PDF-1.4\n%%EOF\n");
      const response = await fetch(
        `${rootUrl}/api/order-evidence/${evidenceKind}/${fileName}`,
        {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/pdf" },
          body: bytes,
        },
      );
      return {
        status: response.status,
        body: await response.json().catch(() => null),
      };
    },
    { evidenceKind: kind, rootUrl: baseUrl },
  );
}

async function readBudgetSnapshot(
  page: Page,
  path: "/api/budgets/me" | `/api/budgets/${string}`,
): Promise<BudgetSnapshot> {
  const result = await browserJsonRequest(page, "GET", path);
  expect(result.status).toBe(200);
  const record = responseRecord(result.body);
  const snapshot = {
    availableMinor: Number(record.availableMinor),
    reservedMinor: Number(record.reservedMinor),
    spentMinor: Number(record.spentMinor),
  };
  for (const [field, value] of Object.entries(snapshot)) {
    expect(
      Number.isSafeInteger(value),
      `${field} must be a safe integer minor-unit value`,
    ).toBe(true);
    expect(value, `${field} must remain non-negative`).toBeGreaterThanOrEqual(0);
  }
  return snapshot;
}

function expectBudgetSnapshot(
  actual: BudgetSnapshot,
  expected: BudgetSnapshot,
): void {
  expect(actual).toEqual(expected);
}

function containsProjectionKey(value: unknown, forbiddenKeys: string[]): boolean {
  if (Array.isArray(value)) {
    return value.some((entry) => containsProjectionKey(entry, forbiddenKeys));
  }
  if (typeof value !== "object" || value === null) return false;
  const normalizedForbidden = new Set(
    forbiddenKeys.map((key) => key.toLowerCase().replaceAll(/[^a-z0-9]/g, "")),
  );
  return Object.entries(value as Record<string, unknown>).some(([key, nested]) => {
    const normalized = key.toLowerCase().replaceAll(/[^a-z0-9]/g, "");
    return normalizedForbidden.has(normalized) || containsProjectionKey(nested, forbiddenKeys);
  });
}

async function expectExactNegativeResponse(
  page: Page,
  captured: Diagnostics,
  contract: { method: "GET" | "POST"; path: string; status: number },
  action: () => Promise<BrowserJsonResult>,
): Promise<BrowserJsonResult> {
  const expected = registerExpectedResponse(captured, contract);
  const requestPromise = page.waitForRequest(
    (request) =>
      request.method() === contract.method &&
      new URL(request.url()).pathname === contract.path,
  );
  const responsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === contract.method &&
      new URL(response.url()).pathname === contract.path,
  );
  void responsePromise.catch(() => undefined);
  const actionPromise = action();
  await Promise.race([
    requestPromise,
    actionPromise.then(() => {
      throw new Error("Negative action completed before its exact request was observed");
    }),
  ]);
  const [result, response] = await Promise.all([actionPromise, responsePromise]);
  expect(response.status()).toBe(contract.status);
  expect(result.status).toBe(contract.status);
  await expect.poll(() => expected.consumed).toBe(1);
  return result;
}

function responseData(value: unknown): unknown {
  if (typeof value !== "object" || value === null || !("data" in value)) return value;
  return (value as { data: unknown }).data;
}

function responseRows(value: unknown): Array<Record<string, unknown>> {
  const data = responseData(value);
  if (!Array.isArray(data)) return [];
  return data.filter(
    (row): row is Record<string, unknown> => typeof row === "object" && row !== null,
  );
}

function responseRecord(value: unknown): Record<string, unknown> {
  const data = responseData(value);
  return typeof data === "object" && data !== null && !Array.isArray(data)
    ? (data as Record<string, unknown>)
    : {};
}

function responseMessage(value: unknown): string {
  if (typeof value !== "object" || value === null || !("message" in value)) return "";
  const message = (value as { message?: unknown }).message;
  return typeof message === "string" ? message : "";
}

function responseId(value: unknown): string {
  const data = responseData(value);
  if (typeof data !== "object" || data === null || !("id" in data)) return "";
  const id = (data as { id?: unknown }).id;
  return typeof id === "string" ? id : "";
}

async function submitFamilyOrder(
  familyPage: Page,
  product: OrderJourneyProduct,
  label: string,
): Promise<{ idempotencyKey: string; order: Record<string, unknown> }> {
  const add = await browserJsonRequest(
    familyPage,
    "POST",
    "/api/orders/cart/items",
    { productId: product.id, quantity: 1 },
  );
  expect(add.status).toBeLessThan(400);
  const cart = responseRecord(add.body);
  expect(Number(cart.totalMinor)).toBe(product.priceMinor);

  const idempotencyKey = `${label}-${crypto.randomUUID()}`;
  const submitted = await browserJsonRequest(
    familyPage,
    "POST",
    "/api/orders/submit",
    { idempotencyKey },
  );
  expect(submitted.status).toBeLessThan(400);
  const order = responseRecord(submitted.body);
  expect(order.status).toBe("pending");
  expect(responseId(submitted.body)).not.toBe("");
  expect(Number(order.requestedTotalMinor)).toBe(product.priceMinor);
  return { idempotencyKey, order };
}

const sponsorAllowedOrderKeys = [
  "actualTotalMinor",
  "approvedAt",
  "currency",
  "deliveredAt",
  "deliveryName",
  "deliveryProofRecorded",
  "deliveryStartedAt",
  "deliveryStatus",
  "dominantCategoryImage",
  "dominantCategoryName",
  "id",
  "items",
  "merchantName",
  "orderNumber",
  "placedAt",
  "preparationStartedAt",
  "purchasedAt",
  "receiptRecorded",
  "status",
  "subtotalMinor",
  "totalMinor",
].sort();

const sponsorForbiddenOrderKeys = [
  "deliveryAddressSnapshot",
  "deliveryPhoneSnapshot",
  "receiptStoragePath",
  "receiptMediaType",
  "receiptByteSize",
  "deliveryNote",
  "deliveryProofStoragePath",
  "deliveryProofMediaType",
  "deliveryProofByteSize",
  "staffProfileId",
  "affiliationSnapshot",
  "companyNameSnapshot",
  "assignedByUserId",
  "statusEvents",
  "purchases",
  "contributions",
  "sponsorProfileId",
];

function sponsorOrderSensitiveValues(order: DeliveredOrderState): string[] {
  return [
    familyAddress,
    familyCin,
    familyEmail,
    familyPhone,
    order.receiptPath,
    order.deliveryProofPath,
    order.staffAId,
    order.staffBId,
    state.assignmentAId,
    state.assignmentBId,
    state.sponsorAProfileId,
    state.sponsorBProfileId,
    sponsorAEmail,
    sponsorBEmail,
    sponsorAPhone,
    sponsorBPhone,
  ];
}

async function assertSponsorOrderProjection(
  sponsorPage: Page,
  orderId: string,
  sensitiveValues: string[],
): Promise<void> {
  const supportedOrders = await browserJsonRequest(
    sponsorPage,
    "GET",
    "/api/orders/supported?limit=100&offset=0",
  );
  expect(supportedOrders.status).toBe(200);
  const orderMatches = responseRows(supportedOrders.body).filter(
    (order) => order.id === orderId,
  );
  expect(orderMatches).toHaveLength(1);
  expect(Object.keys(orderMatches[0]!).sort()).toEqual(sponsorAllowedOrderKeys);
  expect(containsProjectionKey(orderMatches[0], sponsorForbiddenOrderKeys)).toBe(false);
  expect(containsSensitiveValue(orderMatches[0], sensitiveValues)).toBe(false);

  const supportedDetail = await browserJsonRequest(
    sponsorPage,
    "GET",
    `/api/orders/${orderId}`,
  );
  expect(supportedDetail.status).toBe(200);
  const supportedDetailRecord = responseRecord(supportedDetail.body);
  expect(Object.keys(supportedDetailRecord).sort()).toEqual(sponsorAllowedOrderKeys);
  expect(
    containsProjectionKey(supportedDetailRecord, sponsorForbiddenOrderKeys),
  ).toBe(false);
  expect(containsSensitiveValue(supportedDetailRecord, sensitiveValues)).toBe(false);
}

async function openStaffDirectory(page: Page): Promise<void> {
  const listResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "GET" &&
      new URL(response.url()).pathname === "/api/staff" &&
      response.ok(),
  );
  await page.goto("/staff", { waitUntil: "commit" });
  await listResponse;
  await expect(page.getByText("Loading staff records...", { exact: true })).toBeHidden();
  await expect(page.getByRole("heading", { name: "Staff", exact: true })).toBeVisible();
}

async function createDeliveryStaffThroughUi(
  page: Page,
  fixture: (typeof deliveryStaffFixtures)[number],
): Promise<Record<string, unknown>> {
  const addStaff = await onlyVisible(
    page.getByRole("button", { name: "Add staff", exact: true }),
  );
  await addStaff.click({ trial: true, timeout: 5_000 });
  await addStaff.click();

  const dialog = page.getByRole("dialog", { name: "Add staff record", exact: true });
  await expect(dialog).toBeVisible();
  const form = dialog.locator("#create-staff-form");
  await expect(form).toBeVisible({ timeout: 5_000 });
  // Date of birth is deliberately absent. `createStaffFormSchema` only requires it
  // when the operator function is selected, and these fixtures are delivery-only.
  // Its control is a calendar popover with no text field, so a typed value could
  // not reach it anyway.
  const fields: Array<[Locator, string]> = [
    [form.getByLabel(/^Full name\s*\*?$/), fixture.name],
    [form.getByLabel(/^CIN\s*\*?$/), fixture.cin],
    [form.getByLabel(/^Phone\s*\*?$/), fixture.phone],
    [form.getByLabel(/^Email\s*\*?$/), fixture.email],
    [form.getByLabel(/^Job title\s*\*?$/), "Acceptance delivery agent"],
    [form.getByLabel(/^Address\s*\*?$/), "Acceptance delivery office"],
    [form.getByLabel(/^Internal notes\s*\*?$/), "Guarded delivery acceptance profile"],
  ];
  for (const [field, value] of fields) {
    await expect(field).toBeVisible({ timeout: 5_000 });
    await field.fill(value);
  }

  // Resolve the portal through the trigger's own `aria-controls`, the same contract
  // The assignment step uses the same portal contract. A global open-popover locator matches every
  // visible portal on the page, which is how the first combined A-E attempt failed.
  const capabilities = form.getByRole("combobox", { name: /^Capabilities\s*\*?$/ });
  await capabilities.click();
  await expect(capabilities).toHaveAttribute("aria-expanded", "true");
  const capabilitiesPopoverId = await capabilities.getAttribute("aria-controls");
  expect(
    capabilitiesPopoverId,
    "open capabilities combobox must identify its portal",
  ).toBeTruthy();
  const capabilitiesPopover = page.locator(
    `[data-slot="popover-content"][id=${JSON.stringify(capabilitiesPopoverId)}]`,
  );
  await expect(capabilitiesPopover).toHaveAttribute("data-state", "open");
  await expect(capabilitiesPopover).toBeVisible();
  // The form defaults `functions` to ["operator"], so the first click deselects it
  // and the second selects Delivery, leaving exactly the delivery-only capability.
  await capabilitiesPopover.getByText("Operator", { exact: true }).click();
  await capabilitiesPopover.getByText("Delivery", { exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(capabilities).toHaveAttribute("aria-expanded", "false");
  await expect(capabilities).toContainText("Delivery");
  await expect(capabilities).not.toContainText("Operator");

  const submit = form.getByRole("button", {
    name: "Create staff record",
    exact: true,
  });
  await submit.click({ trial: true, timeout: 5_000 });
  const createResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname === "/api/staff",
  );
  await submit.click();
  const response = await createResponse;
  expect(response.status()).toBeLessThan(400);
  const created = responseRecord(await response.json());
  expect(created.name).toBe(fixture.name);
  expect(created.status).toBe("active");
  expect(created.functions).toEqual(["delivery"]);
  expect(created.userId).toBeNull();
  expect(created.hasOperatorAccess).toBe(false);
  expect(created.initialPassword).toBeNull();
  await expect(dialog).toBeHidden();
  return created;
}

async function readFamilyFundingFromSponsorCatalog(
  page: Page,
  familyProfileId: string,
): Promise<Record<string, unknown>> {
  const catalog = await browserJsonRequest(
    page,
    "GET",
    "/api/support-assignments/catalog?relationship=supported&limit=100&offset=0",
  );
  expect(catalog.status).toBe(200);
  const matches = responseRows(catalog.body).filter(
    (row) => row.id === familyProfileId,
  );
  expect(matches).toHaveLength(1);
  const funding = responseRecord(matches[0]!.funding);
  for (const field of [
    "targetMinor",
    "fundedMinor",
    "pendingMinor",
    "remainingMinor",
    "availableToContributeMinor",
  ]) {
    expect(
      Number.isSafeInteger(funding[field]),
      `${field} must be a safe integer minor-unit value`,
    ).toBe(true);
  }
  return funding;
}

function containsSensitiveValue(value: unknown, sensitiveValues: string[]): boolean {
  const serialized = JSON.stringify(value ?? {});
  return sensitiveValues.some(
    (sensitiveValue) => sensitiveValue.length > 0 && serialized.includes(sensitiveValue),
  );
}

function containsForbiddenProjectionKey(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsForbiddenProjectionKey);
  if (typeof value !== "object" || value === null) return false;
  const forbidden = new Set([
    "address",
    "cin",
    "document",
    "documents",
    "email",
    "exactaddress",
    "guardiancin",
    "notes",
    "phone",
    "privatenotes",
  ]);
  return Object.entries(value as Record<string, unknown>).some(([key, nested]) => {
    const normalized = key.toLowerCase().replaceAll(/[^a-z0-9]/g, "");
    return forbidden.has(normalized) || containsForbiddenProjectionKey(nested);
  });
}

async function openComboboxSearch(
  page: Page,
  combobox: Locator,
  placeholder: string,
): Promise<Locator> {
  await combobox.click();
  await expect(combobox).toHaveAttribute("aria-expanded", "true");
  const popoverId = await combobox.getAttribute("aria-controls");
  expect(popoverId, "open Najm combobox must identify its portal").toBeTruthy();
  const popover = page.locator(
    `[data-slot="popover-content"][id=${JSON.stringify(popoverId)}]`,
  );
  await expect(popover).toHaveAttribute("data-state", "open");
  await expect(popover).toBeVisible();
  const search = popover.getByPlaceholder(placeholder, { exact: true });
  await expect(search).toHaveCount(1);
  await expect(search).toBeVisible();
  return search;
}

async function createAssignmentThroughUi(
  page: Page,
  sponsorEmail: string,
): Promise<void> {
  const assignmentsResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      response.request().method() === "GET" &&
      url.pathname === "/api/support-assignments" &&
      url.searchParams.has("limit") &&
      url.searchParams.has("offset")
    );
  });
  await page.goto("/assignments", { waitUntil: "commit" });
  expect((await assignmentsResponse).status()).toBeLessThan(400);
  await expectNoneVisible(
    page.getByText("Loading support assignments...", { exact: true }),
  );

  const createAssignmentButton = await onlyVisible(
    page.getByRole("button", { name: "Create assignment", exact: true }),
  );
  await createAssignmentButton.click({ trial: true, timeout: 5_000 });
  await createAssignmentButton.click();

  const dialog = page.getByRole("dialog", {
    name: "Create support assignment",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  const sponsorCombobox = dialog.getByRole("combobox").nth(0);
  const familyCombobox = dialog.getByRole("combobox").nth(1);
  await expect(sponsorCombobox).toContainText("Choose a sponsor");
  const sponsorSearch = await openComboboxSearch(
    page,
    sponsorCombobox,
    "Search sponsors...",
  );
  await sponsorSearch.fill(sponsorEmail);
  await page.getByRole("option").filter({ hasText: sponsorEmail }).click();
  await expect(sponsorCombobox).toHaveAttribute("aria-expanded", "false");

  await expect(familyCombobox).toContainText("Choose a family");
  const familySearch = await openComboboxSearch(
    page,
    familyCombobox,
    "Search families...",
  );
  await familySearch.fill(familyName);
  await page.getByRole("option").filter({ hasText: familyName }).click();
  await expect(familyCombobox).toHaveAttribute("aria-expanded", "false");

  const createResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname === "/api/support-assignments",
  );
  await dialog
    .getByRole("button", { name: "Create support assignment", exact: true })
    .click();
  expect((await createResponse).status()).toBeLessThan(400);
  await expect(dialog).toBeHidden();
}

function mailboxFetch(path: string, init: RequestInit = {}): Promise<globalThis.Response> {
  const headers = new Headers(init.headers);
  headers.set(
    "Authorization",
    `Basic ${Buffer.from(`${mailboxApiUser}:${mailboxApiPassword}`).toString("base64")}`,
  );
  return fetch(new URL(path, mailboxApiUrl), { ...init, headers });
}

async function findMailboxMessages(input: {
  recipient: string;
  since: number;
  subjectKeyword?: string;
  signal?: AbortSignal;
}): Promise<MailpitMessage[]> {
  const query = input.subjectKeyword
    ? `to:${input.recipient} subject:"${input.subjectKeyword}"`
    : `to:${input.recipient}`;
  const search = await mailboxFetch(
    `/api/v1/search?query=${encodeURIComponent(query)}`,
    { signal: input.signal },
  );
  if (!search.ok) throw new Error("Authenticated Mailpit search failed.");
  const payload = (await search.json()) as { messages?: MailpitMessageSummary[] };
  const matches: MailpitMessage[] = [];
  for (const summary of payload.messages ?? []) {
    if (new Date(summary.Created).getTime() < input.since - 1_000) continue;
    const detail = await mailboxFetch(`/api/v1/message/${summary.ID}`, {
      signal: input.signal,
    });
    if (!detail.ok) throw new Error("Authenticated Mailpit detail read failed.");
    const message = (await detail.json()) as MailpitMessage;
    const exactRecipient = message.To.some(
      (destination) => destination.Address.toLowerCase() === input.recipient.toLowerCase(),
    );
    const subjectMatches = input.subjectKeyword
      ? message.Subject.includes(input.subjectKeyword)
      : true;
    if (exactRecipient && subjectMatches) matches.push(message);
  }
  return matches;
}

async function findOtpMailboxMessages(input: {
  recipient: string;
  since: number;
  subjectKeyword: string;
  signal?: AbortSignal;
}): Promise<MailpitMessage[]> {
  return findMailboxMessages(input);
}

async function pollExactlyOneOtpMessage(input: {
  recipient: string;
  since: number;
  subjectKeyword: string;
  signal: AbortSignal;
}): Promise<MailpitMessage> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (input.signal.aborted) throw new Error("Mailpit OTP polling was cancelled.");
    const matches = await findOtpMailboxMessages(input);
    if (matches.length > 1) {
      throw new Error("Mailpit returned more than one matching OTP message.");
    }
    if (matches.length === 1) return matches[0]!;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Mailpit did not return exactly one matching OTP message in time.");
}

function extractOtp(message: MailpitMessage): string {
  const content = `${message.Body ?? ""} ${message.HTML ?? ""} ${message.Snippet ?? ""}`;
  const match = content.match(/\b(\d{6})\b/);
  if (!match) throw new Error("The matching Mailpit message did not contain a six-digit OTP.");
  return match[1]!;
}

async function deleteMailboxMessages(messageIds: string[]): Promise<void> {
  if (messageIds.length === 0) return;
  const response = await mailboxFetch("/api/v1/messages", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ IDs: messageIds }),
  });
  expect(response.ok, "Mailpit batch delete must succeed").toBe(true);
}

async function deleteMailboxMessage(messageId: string): Promise<void> {
  await deleteMailboxMessages([messageId]);
}

async function selectDate(
  page: Page,
  scope: Locator,
  value: `${number}-${number}-${number}`,
): Promise<void> {
  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  await scope.getByText("Pick a date", { exact: true }).first().click();
  await page.getByRole("combobox", { name: "Choose the Year" }).selectOption(String(year));
  await page
    .getByRole("combobox", { name: "Choose the Month" })
    .selectOption({ label: monthNames[month - 1] });
  await page
    .getByRole("button", {
      name: new RegExp(`${monthNames[month - 1]} ${day}(?:st|nd|rd|th), ${year}`),
    })
    .click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("combobox", { name: "Choose the Year" })).toBeHidden();
}

function assertDiagnosticsClean(alias: string, captured: Diagnostics): void {
  expect(captured.pageErrors, `${alias} remote page errors`).toEqual([]);
  expect(captured.consoleErrors, `${alias} remote console errors`).toEqual([]);
  expect(captured.failedRequests, `${alias} remote failed requests`).toEqual([]);
  expect(captured.badResponses, `${alias} remote unexplained HTTP errors`).toEqual([]);
  for (const expected of captured.expectedResponses) {
    if (expected.required) {
      expect(expected.consumed, `${alias} exact negative response count`).toBe(1);
    } else {
      expect(expected.consumed, `${alias} optional retry response count`).toBeLessThanOrEqual(1);
    }
  }
  for (const expected of captured.expectedConsoleErrors) {
    expect(expected.consumed, `${alias} expected console error count`).toBeLessThanOrEqual(1);
  }
}

async function newIsolatedContext(browser: Browser): Promise<BrowserContext> {
  const context = await browser.newContext();
  await setEnglish(context);
  return context;
}

test.describe.serial("connected VPS acceptance", () => {
  let adminContext: BrowserContext;
  let familyContext: BrowserContext;
  let sponsorAContext: BrowserContext;
  let sponsorBContext: BrowserContext;
  const adminDiagnostics = makeDiagnostics();
  const familyDiagnostics = makeDiagnostics();
  const sponsorADiagnostics = makeDiagnostics();
  const sponsorBDiagnostics = makeDiagnostics();
  let orderJourneyState: OrderJourneyState = { phase: "not-started" };
  let cleanupSummary: CleanupSummary | undefined;

  test.beforeAll(async ({ browser }) => {
    expect(adminEmail && adminPassword, "remote admin credentials must be present").toBeTruthy();
    adminContext = await newIsolatedContext(browser);
    familyContext = await newIsolatedContext(browser);
    sponsorAContext = await newIsolatedContext(browser);
    sponsorBContext = await newIsolatedContext(browser);
  });

  test.afterAll(async () => {
    await Promise.allSettled([
      adminContext?.close(),
      familyContext?.close(),
      sponsorAContext?.close(),
      sponsorBContext?.close(),
    ]);
  });

  test("remote step 01 - guarded admin smoke", async () => {
    const page = await adminContext.newPage();
    attachDiagnostics(page, adminDiagnostics);

    await prepareLogin(page, adminEmail, adminPassword);
    const dashboardResponse = page.waitForResponse(
      (response) =>
        response.request().method() === "GET" &&
        new URL(response.url()).pathname === "/api/dashboard/operator",
    );
    await submitPreparedLogin(page);
    await expect(page).toHaveURL(/\/dashboard$/);
    expect((await dashboardResponse).status()).toBeLessThan(400);
    await expectNoneVisible(page.getByText("Loading…", { exact: true }));
    await expect(
      page.getByRole("heading", { name: "Operator dashboard", exact: true }),
    ).toBeVisible();

    const assignmentsResponse = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return (
        response.request().method() === "GET" &&
        url.pathname === "/api/support-assignments" &&
        url.searchParams.has("limit") &&
        url.searchParams.has("offset")
      );
    });
    await page.goto("/assignments", { waitUntil: "commit" });
    expect((await assignmentsResponse).status()).toBeLessThan(400);
    await expectNoneVisible(
      page.getByText("Loading support assignments...", { exact: true }),
    );
    const createAssignmentButton = await onlyVisible(
      page.getByRole("button", { name: "Create assignment", exact: true }),
    );
    await createAssignmentButton.click({ trial: true, timeout: 5_000 });

    await signOut(page);
    expect((await adminContext.request.get("/api/auth/me")).status()).toBe(401);
    await page.close();
  });

  test("remote step 02 - Family provisioning and first login", async () => {
    const adminPage = await adminContext.newPage();
    attachDiagnostics(adminPage, adminDiagnostics);

    await prepareLogin(adminPage, adminEmail, adminPassword);
    const operatorDashboardResponse = adminPage.waitForResponse(
      (response) =>
        response.request().method() === "GET" &&
        new URL(response.url()).pathname === "/api/dashboard/operator",
    );
    await submitPreparedLogin(adminPage);
    await expect(adminPage).toHaveURL(/\/dashboard$/);
    expect((await operatorDashboardResponse).status()).toBeLessThan(400);
    await expectNoneVisible(adminPage.getByText("Loading…", { exact: true }));
    await expect(
      adminPage.getByRole("heading", { name: "Operator dashboard", exact: true }),
    ).toBeVisible();

    const familiesResponse = adminPage.waitForResponse((response) => {
      const url = new URL(response.url());
      return (
        response.request().method() === "GET" &&
        url.pathname === "/api/families" &&
        url.searchParams.has("limit") &&
        url.searchParams.has("offset")
      );
    });
    await adminPage.goto("/family", { waitUntil: "commit" });
    expect((await familiesResponse).status()).toBeLessThan(400);
    await expectNoneVisible(adminPage.getByText("Loading families...", { exact: true }));
    const createFamilyButton = await onlyVisible(
      adminPage.getByRole("button", { name: "Create family", exact: true }),
    );
    await createFamilyButton.click({ trial: true, timeout: 5_000 });
    await createFamilyButton.click();

    const dialog = adminPage.getByRole("dialog", {
      name: "Create family account",
      exact: true,
    });
    await expect(dialog).toBeVisible();
    let createFamilyRequestCount = 0;
    const countCreateFamilyRequest = (request: Request): void => {
      if (
        request.method() === "POST" &&
        new URL(request.url()).pathname === "/api/families"
      ) {
        createFamilyRequestCount += 1;
      }
    };
    adminPage.on("request", countCreateFamilyRequest);
    await dialog.getByRole("button", { name: "Next", exact: true }).click();
    await expect(
      adminPage.getByText("Enter the account holder's name", { exact: true }),
    ).toBeVisible();
    expect(createFamilyRequestCount).toBe(0);

    await dialog.getByLabel(/^Guardian name\s*\*?$/).fill(familyName);
    await dialog.getByLabel(/CIN/i).fill(familyCin);
    await dialog.getByLabel(/^Email\s*\*?$/).fill(familyEmail);
    await selectDate(adminPage, dialog, "1985-04-12");
    await dialog.getByLabel(/^Household phone\s*\*?$/).fill(familyPhone);
    await dialog.getByRole("button", { name: "Next", exact: true }).click();
    await expect(dialog.locator("#step-household")).toBeVisible({ timeout: 5_000 });

    await dialog
      .getByRole("combobox", { name: "Choose a housing situation", exact: true })
      .click();
    await adminPage.getByRole("option", { name: "Rented", exact: true }).click();
    await dialog
      .getByLabel(/^Activation target \(MAD\)\s*\*?$/)
      .fill(formatMadFromMinor(CONNECTED_RUN_FIXTURE.fundingTargetMinor));
    await dialog
      .getByPlaceholder("Full household address", { exact: true })
      .fill(familyAddress);
    await dialog.getByRole("button", { name: "Next", exact: true }).click();
    await expect(dialog.locator("#step-initial-children")).toBeVisible({ timeout: 5_000 });

    await dialog
      .getByRole("button", { name: /^Add initial child\b/ })
      .click({ timeout: 5_000 });
    const childLegalName = dialog.getByPlaceholder("Child's legal name", { exact: true });
    await expect(childLegalName).toBeVisible({ timeout: 5_000 });
    await childLegalName.fill(`Connected Child ${runLabel}`);
    await selectDate(adminPage, dialog, "2018-09-15");
    const createResponse = adminPage.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === "/api/families",
    );
    await dialog
      .getByRole("button", { name: "Create family account", exact: true })
      .click();
    expect((await createResponse).status()).toBeLessThan(400);
    expect(createFamilyRequestCount).toBe(1);
    adminPage.off("request", countCreateFamilyRequest);

    const credentialsCard = dialog.getByTestId("credentials-card");
    await expect(credentialsCard).toBeVisible();
    const credentialFields = credentialsCard.getByTestId("credentials-card-field");
    expect(await credentialFields.count()).toBe(2);
    state.familyTemporaryCredential =
      (await credentialFields.nth(1).locator("dd").textContent())?.trim() ?? "";
    expect(state.familyTemporaryCredential.length).toBeGreaterThan(0);
    await credentialsCard.getByRole("button", { name: "Done", exact: true }).click();
    await expect(dialog).toBeHidden();

    const familyList = await browserJsonRequest(
      adminPage,
      "GET",
      `/api/families?search=${encodeURIComponent(familyEmail)}&limit=10&offset=0`,
    );
    expect(familyList.status).toBe(200);
    const matches = responseRows(familyList.body).filter((row) => row.email === familyEmail);
    expect(matches.length).toBe(1);
    const createdFamily = matches[0]!;
    state.familyProfileId = typeof createdFamily.id === "string" ? createdFamily.id : "";
    state.familyUserId = typeof createdFamily.userId === "string" ? createdFamily.userId : "";
    expect(Boolean(state.familyProfileId && state.familyUserId)).toBe(true);
    expect(createdFamily.status).toBe("active");
    await signOut(adminPage);
    await adminPage.close();

    const familyPage = await familyContext.newPage();
    attachDiagnostics(familyPage, familyDiagnostics);
    await prepareLogin(familyPage, familyEmail, state.familyTemporaryCredential);
    await submitPreparedLogin(familyPage);
    await expect
      .poll(() => new URL(familyPage.url()).pathname, { timeout: 5_000 })
      .toBe("/change-password");
    await assertNoAuthCookies(familyContext);

    await expectExactNegativeResponse(
      familyPage,
      familyDiagnostics,
      { method: "GET", path: "/api/dashboard/family", status: 401 },
      () => browserJsonRequest(familyPage, "GET", "/api/dashboard/family"),
    );
    await expect(familyPage.locator("#family-first-password-form")).toBeVisible({
      timeout: 5_000,
    });

    const newPassword = familyPage.getByRole("textbox", {
      name: "New password *",
      exact: true,
    });
    const repeatPassword = familyPage.getByRole("textbox", {
      name: "Repeat the new password *",
      exact: true,
    });
    await newPassword.fill("MismatchPassword1");
    await repeatPassword.fill("MismatchPassword2");
    await familyPage.getByRole("button", { name: "Save my password", exact: true }).click();
    await expect(familyPage.getByText("Passwords do not match", { exact: true })).toBeVisible();

    await newPassword.fill(familyRuntimePassword);
    await repeatPassword.fill(familyRuntimePassword);
    const passwordChangeResponse = familyPage.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === "/api/auth/credential-setup/change",
    );
    await familyPage.getByRole("button", { name: "Save my password", exact: true }).click();
    expect((await passwordChangeResponse).status()).toBeLessThan(400);
    await expect.poll(() => new URL(familyPage.url()).pathname).toBe("/login");

    await prepareLogin(familyPage, familyEmail, state.familyTemporaryCredential);
    await submitPreparedLogin(familyPage, familyDiagnostics, 401);
    await expect.poll(() => new URL(familyPage.url()).pathname).toBe("/login");
    await assertNoAuthCookies(familyContext);

    await prepareLogin(familyPage, familyEmail, familyRuntimePassword);
    const familyDashboardResponse = familyPage.waitForResponse(
      (response) =>
        response.request().method() === "GET" &&
        new URL(response.url()).pathname === "/api/dashboard/family",
    );
    const ownFamilyResponse = familyPage.waitForResponse(
      (response) =>
        response.request().method() === "GET" &&
        new URL(response.url()).pathname === "/api/families/me",
    );
    await submitPreparedLogin(familyPage);
    await expect(familyPage).toHaveURL(/\/dashboard$/);
    expect((await familyDashboardResponse).status()).toBeLessThan(400);
    expect((await ownFamilyResponse).status()).toBeLessThan(400);
    await expectNoneVisible(
      familyPage.getByText("Loading your family dashboard", { exact: true }),
    );
    await expect(familyPage.getByRole("heading", { name: /^Welcome,/i })).toBeVisible();

    const familyNavigation = familyPage.getByRole("navigation");
    await onlyVisible(familyNavigation.locator('a[href="/children"]'));
    await onlyVisible(familyNavigation.locator('a[href="/products"]'));
    await onlyVisible(familyNavigation.locator('a[href="/orders"]'));
    await expect(familyPage.locator('a[href="/family"]')).toHaveCount(0);
    await expect(familyPage.locator('a[href="/sponsors"]')).toHaveCount(0);
    await expect(familyPage.locator('a[href="/applicants"]')).toHaveCount(0);

    await expectExactNegativeResponse(
      familyPage,
      familyDiagnostics,
      { method: "GET", path: "/api/admin/access/users", status: 401 },
      () => browserJsonRequest(familyPage, "GET", "/api/admin/access/users?limit=1&offset=0"),
    );

    await signOut(familyPage);
    expect((await familyContext.request.get("/api/families/me")).status()).toBe(401);
    await familyPage.close();
  });

  test("remote step 03 - Sponsor A application and approval", async () => {
    const expectedPhoneE164 = sponsorAPhone;
    const phoneLocal = expectedPhoneE164.replace(/^\+212/, "");
    const sponsorPage = await sponsorAContext.newPage();
    attachDiagnostics(sponsorPage, sponsorADiagnostics);

    // Prove the configured account has step 03's exact admin capability before
    // the public flow can retain a pending applicant in the disposable demo.
    const adminPage = await adminContext.newPage();
    attachDiagnostics(adminPage, adminDiagnostics);
    await prepareLogin(adminPage, adminEmail, adminPassword);
    const operatorDashboardResponse = adminPage.waitForResponse(
      (response) =>
        response.request().method() === "GET" &&
        new URL(response.url()).pathname === "/api/dashboard/operator",
    );
    await submitPreparedLogin(adminPage);
    await expect(adminPage).toHaveURL(/\/dashboard$/);
    expect((await operatorDashboardResponse).status()).toBeLessThan(400);
    await expectNoneVisible(adminPage.getByText("Loading…", { exact: true }));
    await expect(
      adminPage.getByRole("heading", { name: "Operator dashboard", exact: true }),
    ).toBeVisible();

    const adminIdentity = await browserJsonRequest(adminPage, "GET", "/api/auth/me");
    expect(adminIdentity.status).toBe(200);
    expect(responseRecord(adminIdentity.body).role).toBe("admin");
    const applicantsCapability = await browserJsonRequest(
      adminPage,
      "GET",
      "/api/applicants?limit=1&offset=0",
    );
    expect(applicantsCapability.status).toBe(200);

    await sponsorPage.goto("/apply", { waitUntil: "commit" });
    expect(new URL(sponsorPage.url()).pathname).toBe("/apply");
    const applicationForm = sponsorPage.locator("#applicant-application-form");
    const submitApplication = sponsorPage.getByRole("button", {
      name: "Submit application",
      exact: true,
    });
    await expect(applicationForm).toBeVisible();
    await expect(submitApplication).toBeVisible();
    await expect.poll(
      () => applicationForm.evaluate((form) => {
        const propsKey = Object.keys(form).find((key) => key.startsWith("__reactProps$"));
        if (!propsKey) return false;
        const props = (form as unknown as Record<string, { onSubmit?: unknown }>)[propsKey];
        return typeof props?.onSubmit === "function";
      }),
    ).toBe(true);

    let applicationRequestCount = 0;
    const countApplicationRequest = (request: Request): void => {
      if (
        request.method() === "POST" &&
        new URL(request.url()).pathname === "/api/applicants"
      ) {
        applicationRequestCount += 1;
      }
    };
    sponsorPage.on("request", countApplicationRequest);
    await submitApplication.click();
    await expect(sponsorPage.getByText("Enter your full name", { exact: true })).toBeVisible();
    expect(applicationRequestCount).toBe(0);

    await sponsorPage.getByRole("textbox", { name: "Full name *" }).fill(sponsorAName);
    await sponsorPage.getByRole("textbox", { name: "Email address *" }).fill(sponsorAEmail);
    const phoneTextbox = sponsorPage.getByPlaceholder(
      "For example: +212 6 12 34 56 78",
      { exact: true },
    );
    await phoneTextbox.click();
    await phoneTextbox.press("End");
    await sponsorPage.keyboard.type(phoneLocal);
    expect(
      (await phoneTextbox.inputValue()).replace(/[\s().-]+/g, "") ===
        expectedPhoneE164,
    ).toBe(true);
    await sponsorPage
      .getByPlaceholder("For example: AB123456", { exact: true })
      .fill(sponsorACin);
    await sponsorPage.getByRole("textbox", { name: "Password *" }).fill(sponsorAPassword);

    const submitStartedAt = Date.now();
    const otpSubjectKeyword = "Verify your Kafil sponsor application";
    const otpPolling = new AbortController();
    const otpMessagePromise = pollExactlyOneOtpMessage({
      recipient: sponsorAEmail,
      since: submitStartedAt,
      subjectKeyword: otpSubjectKeyword,
      signal: otpPolling.signal,
    });
    let otpMessage: MailpitMessage;
    try {
      const submitResponse = sponsorPage.waitForResponse(
        (response) =>
          response.request().method() === "POST" &&
          new URL(response.url()).pathname === "/api/applicants",
      );
      await submitApplication.click();
      expect((await submitResponse).status()).toBeLessThan(400);
      expect(applicationRequestCount).toBe(1);
      sponsorPage.off("request", countApplicationRequest);
      otpMessage = await otpMessagePromise;
    } catch (error) {
      otpPolling.abort();
      await otpMessagePromise.catch(() => undefined);
      throw error;
    }

    expect(
      otpMessage.To.some(
        (destination) => destination.Address.toLowerCase() === sponsorAEmail.toLowerCase(),
      ),
    ).toBe(true);
    const otp = extractOtp(otpMessage);
    const otpGroup = sponsorPage.getByRole("group", { name: "One-time code" });
    await expect(otpGroup).toBeVisible();
    await otpGroup.locator("input").first().click();
    await sponsorPage.keyboard.type(otp);
    const confirmResponse = sponsorPage.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === "/api/applicants/email-verification/confirm",
    );
    await sponsorPage.getByRole("button", { name: "Verify email", exact: true }).click();
    expect((await confirmResponse).status()).toBeLessThan(400);
    const confirmedOtpMessages = await findOtpMailboxMessages({
      recipient: sponsorAEmail,
      since: submitStartedAt,
      subjectKeyword: otpSubjectKeyword,
    });
    expect(confirmedOtpMessages).toHaveLength(1);
    expect(confirmedOtpMessages[0]?.ID === otpMessage.ID).toBe(true);
    await deleteMailboxMessage(otpMessage.ID);
    expect(
      await findOtpMailboxMessages({
        recipient: sponsorAEmail,
        since: submitStartedAt,
        subjectKeyword: otpSubjectKeyword,
      }),
    ).toHaveLength(0);
    await expect(
      sponsorPage.getByRole("heading", { name: "Application pending review", exact: true }),
    ).toBeVisible();

    await prepareLogin(sponsorPage, sponsorAEmail, sponsorAPassword);
    const pendingLogin = await submitPreparedLogin(sponsorPage, sponsorADiagnostics, 403);
    const pendingLoginBody = responseRecord(await pendingLogin.json().catch(() => null));
    expect(/inactive/i.test(typeof pendingLoginBody.message === "string" ? pendingLoginBody.message : ""))
      .toBe(true);
    await expect.poll(() => new URL(sponsorPage.url()).pathname).toBe("/login");
    await assertNoAuthCookies(sponsorAContext);

    // Najm Auth may answer one request with 401, refresh, and retry it once.
    // The route is ready only when that retry succeeds; a second 401 remains
    // an unexplained diagnostic failure.
    registerExpectedResponse(
      adminDiagnostics,
      { method: "GET", path: "/api/applicants", status: 401 },
      false,
    );
    const applicantsResponse = adminPage.waitForResponse((response) => {
      const url = new URL(response.url());
      return (
        response.request().method() === "GET" &&
        url.pathname === "/api/applicants" &&
        url.searchParams.has("limit") &&
        url.searchParams.has("offset") &&
        response.status() < 400
      );
    });
    await adminPage.goto("/applicants", { waitUntil: "commit" });
    expect((await applicantsResponse).status()).toBeLessThan(400);
    await expectNoneVisible(adminPage.getByText("Loading applicants...", { exact: true }));
    const filteredApplicantsResponse = adminPage.waitForResponse((response) => {
      const url = new URL(response.url());
      return (
        response.request().method() === "GET" &&
        url.pathname === "/api/applicants" &&
        url.searchParams.get("search") === sponsorAName
      );
    });
    const applicantSearch = await onlyVisible(
      adminPage.getByPlaceholder("Search applicant name...", { exact: true }),
    );
    await applicantSearch.fill(sponsorAName);
    expect((await filteredApplicantsResponse).status()).toBeLessThan(400);
    await expectNoneVisible(adminPage.getByText("Loading applicants...", { exact: true }));

    const applicantList = await browserJsonRequest(
      adminPage,
      "GET",
      `/api/applicants?search=${encodeURIComponent(sponsorAName)}&limit=10&offset=0`,
    );
    expect(applicantList.status).toBe(200);
    const applicantMatches = responseRows(applicantList.body).filter(
      (row) => row.email === sponsorAEmail,
    );
    expect(applicantMatches).toHaveLength(1);
    const applicant = applicantMatches[0]!;
    state.sponsorAApplicantId = typeof applicant.id === "string" ? applicant.id : "";
    expect(Boolean(state.sponsorAApplicantId)).toBe(true);
    expect(applicant.status).toBe("pending_review");

    const applicantRows = adminPage.locator('tr[data-row="true"]');
    await expect(applicantRows).toHaveCount(1);
    const applicantRow = applicantRows.nth(0);
    await applicantRow.getByRole("button", { name: "Row actions", exact: true }).click();
    await adminPage.getByRole("menuitem", { name: "View", exact: true }).click();
    const detailsSheet = adminPage.getByRole("dialog", {
      name: "Applicant details",
      exact: true,
    });
    await expect(detailsSheet).toBeVisible();
    expect(
      await detailsSheet.evaluate(
        (sheet, expectedValues) =>
          expectedValues.every((value) => sheet.textContent?.includes(value) === true),
        [sponsorAName, sponsorAEmail, expectedPhoneE164],
      ),
    ).toBe(true);
    await adminPage.keyboard.press("Escape");
    await expect(detailsSheet).toBeHidden();

    await applicantRow.getByRole("button", { name: "Row actions", exact: true }).click();
    await adminPage.getByRole("menuitem", { name: "Approve", exact: true }).click();
    const approveDialog = adminPage.getByRole("dialog", { name: /^Approve / });
    await expect(approveDialog).toBeVisible();
    const approvalResponse = adminPage.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname ===
          `/api/applicants/${state.sponsorAApplicantId}/approve`,
    );
    await approveDialog.getByRole("button", { name: "Approve", exact: true }).click();
    const approval = await approvalResponse;
    expect(approval.status()).toBe(200);
    const approvedApplicant = responseRecord(await approval.json().catch(() => null));
    state.sponsorAUserId =
      typeof approvedApplicant.authUserId === "string" ? approvedApplicant.authUserId : "";
    state.sponsorAProfileId =
      typeof approvedApplicant.sponsorProfileId === "string"
        ? approvedApplicant.sponsorProfileId
        : "";
    expect(Boolean(state.sponsorAUserId && state.sponsorAProfileId)).toBe(true);
    expect(approvedApplicant.status).toBe("approved");
    expect(approvedApplicant.phone === expectedPhoneE164).toBe(true);
    await expect(approveDialog).toBeHidden();

    await expectExactNegativeResponse(
      adminPage,
      adminDiagnostics,
      {
        method: "POST",
        path: `/api/applicants/${state.sponsorAApplicantId}/approve`,
        status: 409,
      },
      () =>
        browserJsonRequest(
          adminPage,
          "POST",
          `/api/applicants/${state.sponsorAApplicantId}/approve`,
        ),
    );
    await signOut(adminPage);
    await adminPage.close();

    await prepareLogin(sponsorPage, sponsorAEmail, sponsorAPassword);
    const sponsorDashboardResponse = sponsorPage.waitForResponse(
      (response) =>
        response.request().method() === "GET" &&
        new URL(response.url()).pathname === "/api/dashboard/sponsor",
    );
    await submitPreparedLogin(sponsorPage);
    await expect(sponsorPage).toHaveURL(/\/dashboard$/);
    expect((await sponsorDashboardResponse).status()).toBeLessThan(400);
    await expectNoneVisible(
      sponsorPage.getByText("Loading your sponsor dashboard", { exact: true }),
    );
    await expect(sponsorPage.getByRole("heading", { name: /^Welcome,/i })).toBeVisible();
    const sponsorNavigation = sponsorPage.getByRole("navigation");
    await onlyVisible(sponsorNavigation.locator('a[href="/family"]'));
    await onlyVisible(sponsorNavigation.locator('a[href="/contribution"]'));
    await onlyVisible(sponsorNavigation.locator('a[href="/orders"]'));
    await expect(sponsorNavigation.locator('a[href="/applicants"]')).toHaveCount(0);
    await expect(
      sponsorPage.getByText("Find a family to support", { exact: true }).first(),
    ).toBeVisible();

    await signOut(sponsorPage);
    await expectExactNegativeResponse(
      sponsorPage,
      sponsorADiagnostics,
      { method: "GET", path: "/api/sponsors/me/profile", status: 401 },
      () => browserJsonRequest(sponsorPage, "GET", "/api/sponsors/me/profile"),
    );

    await prepareLogin(sponsorPage, expectedPhoneE164, sponsorAPassword);
    const phoneDashboardResponse = sponsorPage.waitForResponse(
      (response) =>
        response.request().method() === "GET" &&
        new URL(response.url()).pathname === "/api/dashboard/sponsor",
    );
    await submitPreparedLogin(sponsorPage);
    await expect(sponsorPage).toHaveURL(/\/dashboard$/);
    expect((await phoneDashboardResponse).status()).toBeLessThan(400);
    await signOut(sponsorPage);
    await sponsorPage.close();
  });

  test("remote step 04 - Sponsor B application and approval", async () => {
    const expectedPhoneE164 = sponsorBPhone;
    const phoneLocal = expectedPhoneE164.replace(/^\+212/, "");
    const sponsorPage = await sponsorBContext.newPage();
    attachDiagnostics(sponsorPage, sponsorBDiagnostics);

    const adminPage = await adminContext.newPage();
    attachDiagnostics(adminPage, adminDiagnostics);
    await prepareLogin(adminPage, adminEmail, adminPassword);
    const operatorDashboardResponse = adminPage.waitForResponse(
      (response) =>
        response.request().method() === "GET" &&
        new URL(response.url()).pathname === "/api/dashboard/operator",
    );
    await submitPreparedLogin(adminPage);
    await expect(adminPage).toHaveURL(/\/dashboard$/);
    expect((await operatorDashboardResponse).status()).toBeLessThan(400);
    await expectNoneVisible(adminPage.getByText("Loading…", { exact: true }));
    await expect(
      adminPage.getByRole("heading", { name: "Operator dashboard", exact: true }),
    ).toBeVisible();

    const adminIdentity = await browserJsonRequest(adminPage, "GET", "/api/auth/me");
    expect(adminIdentity.status).toBe(200);
    expect(responseRecord(adminIdentity.body).role).toBe("admin");
    const applicantsCapability = await browserJsonRequest(
      adminPage,
      "GET",
      "/api/applicants?limit=1&offset=0",
    );
    expect(applicantsCapability.status).toBe(200);

    await sponsorPage.goto("/apply", { waitUntil: "commit" });
    expect(new URL(sponsorPage.url()).pathname).toBe("/apply");
    const applicationForm = sponsorPage.locator("#applicant-application-form");
    const submitApplication = sponsorPage.getByRole("button", {
      name: "Submit application",
      exact: true,
    });
    await expect(applicationForm).toBeVisible();
    await expect(submitApplication).toBeVisible();
    await expect.poll(
      () => applicationForm.evaluate((form) => {
        const propsKey = Object.keys(form).find((key) => key.startsWith("__reactProps$"));
        if (!propsKey) return false;
        const props = (form as unknown as Record<string, { onSubmit?: unknown }>)[propsKey];
        return typeof props?.onSubmit === "function";
      }),
    ).toBe(true);

    let applicationRequestCount = 0;
    const countApplicationRequest = (request: Request): void => {
      if (
        request.method() === "POST" &&
        new URL(request.url()).pathname === "/api/applicants"
      ) {
        applicationRequestCount += 1;
      }
    };
    sponsorPage.on("request", countApplicationRequest);
    await submitApplication.click();
    await expect(sponsorPage.getByText("Enter your full name", { exact: true })).toBeVisible();
    expect(applicationRequestCount).toBe(0);

    await sponsorPage.getByRole("textbox", { name: "Full name *" }).fill(sponsorBName);
    await sponsorPage.getByRole("textbox", { name: "Email address *" }).fill(sponsorBEmail);
    const phoneTextbox = sponsorPage.getByPlaceholder(
      "For example: +212 6 12 34 56 78",
      { exact: true },
    );
    await phoneTextbox.click();
    await phoneTextbox.press("End");
    await sponsorPage.keyboard.type(phoneLocal);
    expect(
      (await phoneTextbox.inputValue()).replace(/[\s().-]+/g, "") ===
        expectedPhoneE164,
    ).toBe(true);
    await sponsorPage
      .getByPlaceholder("For example: AB123456", { exact: true })
      .fill(sponsorBCin);
    await sponsorPage.getByRole("textbox", { name: "Password *" }).fill(sponsorBPassword);

    const submitStartedAt = Date.now();
    const otpSubjectKeyword = "Verify your Kafil sponsor application";
    const otpPolling = new AbortController();
    const otpMessagePromise = pollExactlyOneOtpMessage({
      recipient: sponsorBEmail,
      since: submitStartedAt,
      subjectKeyword: otpSubjectKeyword,
      signal: otpPolling.signal,
    });
    let otpMessage: MailpitMessage;
    try {
      const submitResponse = sponsorPage.waitForResponse(
        (response) =>
          response.request().method() === "POST" &&
          new URL(response.url()).pathname === "/api/applicants",
      );
      await submitApplication.click();
      expect((await submitResponse).status()).toBeLessThan(400);
      expect(applicationRequestCount).toBe(1);
      sponsorPage.off("request", countApplicationRequest);
      otpMessage = await otpMessagePromise;
    } catch (error) {
      otpPolling.abort();
      await otpMessagePromise.catch(() => undefined);
      throw error;
    }

    expect(
      otpMessage.To.some(
        (destination) => destination.Address.toLowerCase() === sponsorBEmail.toLowerCase(),
      ),
    ).toBe(true);
    const otp = extractOtp(otpMessage);
    const otpGroup = sponsorPage.getByRole("group", { name: "One-time code" });
    await expect(otpGroup).toBeVisible();
    await otpGroup.locator("input").first().click();
    await sponsorPage.keyboard.type(otp);
    const confirmResponse = sponsorPage.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === "/api/applicants/email-verification/confirm",
    );
    await sponsorPage.getByRole("button", { name: "Verify email", exact: true }).click();
    expect((await confirmResponse).status()).toBeLessThan(400);
    const confirmedOtpMessages = await findOtpMailboxMessages({
      recipient: sponsorBEmail,
      since: submitStartedAt,
      subjectKeyword: otpSubjectKeyword,
    });
    expect(confirmedOtpMessages).toHaveLength(1);
    expect(confirmedOtpMessages[0]?.ID === otpMessage.ID).toBe(true);
    await deleteMailboxMessage(otpMessage.ID);
    expect(
      await findOtpMailboxMessages({
        recipient: sponsorBEmail,
        since: submitStartedAt,
        subjectKeyword: otpSubjectKeyword,
      }),
    ).toHaveLength(0);
    await expect(
      sponsorPage.getByRole("heading", { name: "Application pending review", exact: true }),
    ).toBeVisible();

    await prepareLogin(sponsorPage, sponsorBEmail, sponsorBPassword);
    const pendingLogin = await submitPreparedLogin(sponsorPage, sponsorBDiagnostics, 403);
    const pendingLoginBody = responseRecord(await pendingLogin.json().catch(() => null));
    expect(/inactive/i.test(typeof pendingLoginBody.message === "string" ? pendingLoginBody.message : ""))
      .toBe(true);
    await expect.poll(() => new URL(sponsorPage.url()).pathname).toBe("/login");
    await assertNoAuthCookies(sponsorBContext);

    registerExpectedResponse(
      adminDiagnostics,
      { method: "GET", path: "/api/applicants", status: 401 },
      false,
    );
    const applicantsResponse = adminPage.waitForResponse((response) => {
      const url = new URL(response.url());
      return (
        response.request().method() === "GET" &&
        url.pathname === "/api/applicants" &&
        url.searchParams.has("limit") &&
        url.searchParams.has("offset") &&
        response.status() < 400
      );
    });
    await adminPage.goto("/applicants", { waitUntil: "commit" });
    expect((await applicantsResponse).status()).toBeLessThan(400);
    await expectNoneVisible(adminPage.getByText("Loading applicants...", { exact: true }));
    const filteredApplicantsResponse = adminPage.waitForResponse((response) => {
      const url = new URL(response.url());
      return (
        response.request().method() === "GET" &&
        url.pathname === "/api/applicants" &&
        url.searchParams.get("search") === sponsorBName
      );
    });
    const applicantSearch = await onlyVisible(
      adminPage.getByPlaceholder("Search applicant name...", { exact: true }),
    );
    await applicantSearch.fill(sponsorBName);
    expect((await filteredApplicantsResponse).status()).toBeLessThan(400);
    await expectNoneVisible(adminPage.getByText("Loading applicants...", { exact: true }));

    const applicantList = await browserJsonRequest(
      adminPage,
      "GET",
      `/api/applicants?search=${encodeURIComponent(sponsorBName)}&limit=10&offset=0`,
    );
    expect(applicantList.status).toBe(200);
    const applicantMatches = responseRows(applicantList.body).filter(
      (row) => row.email === sponsorBEmail,
    );
    expect(applicantMatches).toHaveLength(1);
    const applicant = applicantMatches[0]!;
    state.sponsorBApplicantId = typeof applicant.id === "string" ? applicant.id : "";
    expect(Boolean(state.sponsorBApplicantId)).toBe(true);
    expect(applicant.status).toBe("pending_review");

    const applicantRows = adminPage.locator('tr[data-row="true"]');
    await expect(applicantRows).toHaveCount(1);
    const applicantRow = applicantRows.nth(0);
    await applicantRow.getByRole("button", { name: "Row actions", exact: true }).click();
    await adminPage.getByRole("menuitem", { name: "View", exact: true }).click();
    const detailsSheet = adminPage.getByRole("dialog", {
      name: "Applicant details",
      exact: true,
    });
    await expect(detailsSheet).toBeVisible();
    expect(
      await detailsSheet.evaluate(
        (sheet, expectedValues) =>
          expectedValues.every((value) => sheet.textContent?.includes(value) === true),
        [sponsorBName, sponsorBEmail, expectedPhoneE164],
      ),
    ).toBe(true);
    await adminPage.keyboard.press("Escape");
    await expect(detailsSheet).toBeHidden();

    await applicantRow.getByRole("button", { name: "Row actions", exact: true }).click();
    await adminPage.getByRole("menuitem", { name: "Approve", exact: true }).click();
    const approveDialog = adminPage.getByRole("dialog", { name: /^Approve / });
    await expect(approveDialog).toBeVisible();
    const approvalResponse = adminPage.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname ===
          `/api/applicants/${state.sponsorBApplicantId}/approve`,
    );
    await approveDialog.getByRole("button", { name: "Approve", exact: true }).click();
    const approval = await approvalResponse;
    expect(approval.status()).toBe(200);
    const approvedApplicant = responseRecord(await approval.json().catch(() => null));
    state.sponsorBUserId =
      typeof approvedApplicant.authUserId === "string" ? approvedApplicant.authUserId : "";
    state.sponsorBProfileId =
      typeof approvedApplicant.sponsorProfileId === "string"
        ? approvedApplicant.sponsorProfileId
        : "";
    expect(Boolean(state.sponsorBUserId && state.sponsorBProfileId)).toBe(true);
    expect(approvedApplicant.status).toBe("approved");
    expect(approvedApplicant.phone === expectedPhoneE164).toBe(true);
    await expect(approveDialog).toBeHidden();

    await expectExactNegativeResponse(
      adminPage,
      adminDiagnostics,
      {
        method: "POST",
        path: `/api/applicants/${state.sponsorBApplicantId}/approve`,
        status: 409,
      },
      () =>
        browserJsonRequest(
          adminPage,
          "POST",
          `/api/applicants/${state.sponsorBApplicantId}/approve`,
        ),
    );
    await signOut(adminPage);
    await adminPage.close();

    await prepareLogin(sponsorPage, sponsorBEmail, sponsorBPassword);
    const sponsorDashboardResponse = sponsorPage.waitForResponse(
      (response) =>
        response.request().method() === "GET" &&
        new URL(response.url()).pathname === "/api/dashboard/sponsor",
    );
    await submitPreparedLogin(sponsorPage);
    await expect(sponsorPage).toHaveURL(/\/dashboard$/);
    expect((await sponsorDashboardResponse).status()).toBeLessThan(400);
    await expectNoneVisible(
      sponsorPage.getByText("Loading your sponsor dashboard", { exact: true }),
    );
    await expect(sponsorPage.getByRole("heading", { name: /^Welcome,/i })).toBeVisible();
    const sponsorNavigation = sponsorPage.getByRole("navigation");
    await onlyVisible(sponsorNavigation.locator('a[href="/family"]'));
    await onlyVisible(sponsorNavigation.locator('a[href="/contribution"]'));
    await onlyVisible(sponsorNavigation.locator('a[href="/orders"]'));
    await expect(sponsorNavigation.locator('a[href="/applicants"]')).toHaveCount(0);
    await expect(
      sponsorPage.getByText("Find a family to support", { exact: true }).first(),
    ).toBeVisible();

    await signOut(sponsorPage);
    await expectExactNegativeResponse(
      sponsorPage,
      sponsorBDiagnostics,
      { method: "GET", path: "/api/sponsors/me/profile", status: 401 },
      () => browserJsonRequest(sponsorPage, "GET", "/api/sponsors/me/profile"),
    );
    await sponsorPage.close();
  });

  test("remote step 05 - assignments and sponsor privacy", async () => {
    expect(
      Boolean(
        state.familyProfileId &&
          state.sponsorAProfileId &&
          state.sponsorBProfileId,
      ),
      "remote step 05 requires the in-process identifiers produced by steps 02-04",
    ).toBe(true);

    const adminPage = await adminContext.newPage();
    attachDiagnostics(adminPage, adminDiagnostics);
    await prepareLogin(adminPage, adminEmail, adminPassword);
    const operatorDashboardResponse = adminPage.waitForResponse(
      (response) =>
        response.request().method() === "GET" &&
        new URL(response.url()).pathname === "/api/dashboard/operator",
    );
    await submitPreparedLogin(adminPage);
    await expect(adminPage).toHaveURL(/\/dashboard$/);
    expect((await operatorDashboardResponse).status()).toBeLessThan(400);
    await expectNoneVisible(adminPage.getByText("Loading…", { exact: true }));
    await expect(
      adminPage.getByRole("heading", { name: "Operator dashboard", exact: true }),
    ).toBeVisible();

    await createAssignmentThroughUi(adminPage, sponsorAEmail);
    await createAssignmentThroughUi(adminPage, sponsorBEmail);

    const duplicatePath = "/api/support-assignments";
    const duplicate = await expectExactNegativeResponse(
      adminPage,
      adminDiagnostics,
      { method: "POST", path: duplicatePath, status: 409 },
      () =>
        browserJsonRequest(adminPage, "POST", duplicatePath, {
          sponsorProfileId: state.sponsorAProfileId,
          familyProfileId: state.familyProfileId,
        }),
    );
    expect(responseMessage(duplicate.body)).toMatch(
      /active support assignment already exists/i,
    );

    const assignmentList = await browserJsonRequest(
      adminPage,
      "GET",
      `/api/support-assignments?familyProfileId=${encodeURIComponent(state.familyProfileId)}` +
        "&status=active&limit=100&offset=0",
    );
    expect(assignmentList.status).toBe(200);
    const activeAssignments = responseRows(assignmentList.body).filter(
      (row) =>
        row.familyProfileId === state.familyProfileId && row.status === "active",
    );
    expect(activeAssignments).toHaveLength(2);
    expect(
      activeAssignments.filter(
        (row) => row.sponsorProfileId === state.sponsorAProfileId,
      ),
    ).toHaveLength(1);
    expect(
      activeAssignments.filter(
        (row) => row.sponsorProfileId === state.sponsorBProfileId,
      ),
    ).toHaveLength(1);
    state.assignmentAId = String(
      activeAssignments.find(
        (row) => row.sponsorProfileId === state.sponsorAProfileId,
      )?.id ?? "",
    );
    state.assignmentBId = String(
      activeAssignments.find(
        (row) => row.sponsorProfileId === state.sponsorBProfileId,
      )?.id ?? "",
    );
    expect(Boolean(state.assignmentAId && state.assignmentBId)).toBe(true);

    const sponsorSessions = [
      {
        alias: "sponsor-a",
        context: sponsorAContext,
        diagnostics: sponsorADiagnostics,
        email: sponsorAEmail,
        password: sponsorAPassword,
        ownAssignmentId: state.assignmentAId,
        otherAssignmentId: state.assignmentBId,
        otherSensitiveValues: [
          sponsorBName,
          sponsorBEmail,
          sponsorBPhone,
          sponsorBPassword,
          state.sponsorBApplicantId,
          state.sponsorBProfileId,
          state.sponsorBUserId,
        ],
        page: undefined as Page | undefined,
        planId: "",
        contributionId: "",
      },
      {
        alias: "sponsor-b",
        context: sponsorBContext,
        diagnostics: sponsorBDiagnostics,
        email: sponsorBEmail,
        password: sponsorBPassword,
        ownAssignmentId: state.assignmentBId,
        otherAssignmentId: state.assignmentAId,
        otherSensitiveValues: [
          sponsorAName,
          sponsorAEmail,
          sponsorAPhone,
          sponsorAPassword,
          state.sponsorAApplicantId,
          state.sponsorAProfileId,
          state.sponsorAUserId,
        ],
        page: undefined as Page | undefined,
        planId: "",
        contributionId: "",
      },
    ];

    for (const session of sponsorSessions) {
      const page = await session.context.newPage();
      session.page = page;
      attachDiagnostics(page, session.diagnostics);
      await prepareLogin(page, session.email, session.password);
      const sponsorDashboardResponse = page.waitForResponse(
        (response) =>
          response.request().method() === "GET" &&
          new URL(response.url()).pathname === "/api/dashboard/sponsor",
      );
      await submitPreparedLogin(page);
      await expect(page).toHaveURL(/\/dashboard$/);
      expect((await sponsorDashboardResponse).status()).toBeLessThan(400);

      const catalogReadiness = page.waitForResponse((response) => {
        const url = new URL(response.url());
        return (
          response.request().method() === "GET" &&
          url.pathname === "/api/support-assignments/catalog" &&
          url.searchParams.has("limit") &&
          url.searchParams.has("offset")
        );
      });
      await page.goto("/sponsor/support", { waitUntil: "commit" });
      expect((await catalogReadiness).status()).toBeLessThan(400);
      await expect.poll(() => new URL(page.url()).pathname).toBe("/family");
      await expectNoneVisible(page.getByText("Loading families", { exact: true }));
      await expect(page.getByRole("heading", { name: "Families", exact: true })).toBeVisible();

      const catalog = await browserJsonRequest(
        page,
        "GET",
        "/api/support-assignments/catalog?relationship=supported&limit=100&offset=0",
      );
      expect(catalog.status).toBe(200);
      const familyRows = responseRows(catalog.body).filter(
        (row) => row.id === state.familyProfileId,
      );
      expect(familyRows).toHaveLength(1);
      expect(Object.keys(familyRows[0]!).sort()).toEqual([
        "activeChildCount",
        "activeSponsorCount",
        "assignmentId",
        "funding",
        "id",
        "image",
        "name",
        "reference",
        "supportPriority",
      ]);
      expect(familyRows[0]!.assignmentId).toBe(session.ownAssignmentId);

      const summary = await browserJsonRequest(
        page,
        "GET",
        `/api/support-assignments/me/${session.ownAssignmentId}/family`,
      );
      expect(summary.status).toBe(200);
      const summaryData = responseRecord(summary.body);
      expect(Object.keys(summaryData).sort()).toEqual(["assignment", "family"]);
      const summaryAssignment = responseRecord(summaryData.assignment);
      const summaryFamily = responseRecord(summaryData.family);
      expect(Object.keys(summaryAssignment).sort()).toEqual(["id", "startedAt"]);
      expect(Object.keys(summaryFamily).sort()).toEqual([
        "activeChildCount",
        "reference",
      ]);
      expect(summaryAssignment.id).toBe(session.ownAssignmentId);

      const sponsorProjection = { catalog: familyRows[0], summary: summaryData };
      expect(containsForbiddenProjectionKey(sponsorProjection)).toBe(false);
      expect(
        containsSensitiveValue(sponsorProjection, [
          familyCin,
          familyAddress,
          familyEmail,
          familyPhone,
          familyRuntimePassword,
          state.familyTemporaryCredential,
          ...session.otherSensitiveValues,
        ]),
        `${session.alias} sponsor projection included a private runtime value`,
      ).toBe(false);

      const plan = await browserJsonRequest(
        page,
        "POST",
        "/api/contributions/me/plans",
        {
          supportAssignmentId: session.ownAssignmentId,
          kind: "one_time",
          amountMinor: 1,
        },
      );
      expect(plan.status).toBeLessThan(400);
      session.planId = responseId(plan.body);
      expect(session.planId).not.toBe("");

      const contribution = await browserJsonRequest(
        page,
        "POST",
        "/api/contributions/me",
        {
          supportAssignmentId: session.ownAssignmentId,
          amountMinor: 1,
          paymentMethod: "acceptance-canary",
        },
      );
      expect(contribution.status).toBeLessThan(400);
      session.contributionId = responseId(contribution.body);
      expect(session.contributionId).not.toBe("");
    }

    for (const session of sponsorSessions) {
      const page = session.page!;
      const other = sponsorSessions.find(
        (candidate) => candidate.alias !== session.alias,
      )!;
      await expectExactNegativeResponse(
        page,
        session.diagnostics,
        {
          method: "GET",
          path: `/api/support-assignments/me/${session.otherAssignmentId}`,
          status: 404,
        },
        () =>
          browserJsonRequest(
            page,
            "GET",
            `/api/support-assignments/me/${session.otherAssignmentId}`,
          ),
      );
      await expectExactNegativeResponse(
        page,
        session.diagnostics,
        {
          method: "GET",
          path: `/api/contributions/me/${other.contributionId}`,
          status: 404,
        },
        () =>
          browserJsonRequest(
            page,
            "GET",
            `/api/contributions/me/${other.contributionId}`,
          ),
      );
      await expectExactNegativeResponse(
        page,
        session.diagnostics,
        {
          method: "GET",
          path: `/api/contributions/me/plans/${other.planId}`,
          status: 404,
        },
        () =>
          browserJsonRequest(
            page,
            "GET",
            `/api/contributions/me/plans/${other.planId}`,
          ),
      );

      const stopPlan = await browserJsonRequest(
        page,
        "POST",
        `/api/contributions/me/plans/${session.planId}/stop`,
        { reason: "Acceptance privacy canary complete" },
      );
      expect(stopPlan.status).toBeLessThan(400);
      expect(responseRecord(stopPlan.body).status).toBe("stopped");
      await signOut(page);
      await page.close();
    }

    for (const session of sponsorSessions) {
      const rejection = await browserJsonRequest(
        adminPage,
        "POST",
        `/api/contributions/${session.contributionId}/reject`,
        { reason: "Acceptance privacy canary complete" },
      );
      expect(rejection.status).toBeLessThan(400);
      expect(responseRecord(rejection.body).status).toBe("rejected");
    }

    // Preserve the authenticated Admin context for dependent step 06. The
    // combined journey otherwise consumes one login-rate-limit slot per unit
    // and the sixth short-window login is correctly rejected with 429.
    await adminPage.close();
  });

  test("remote step 06 - contributions and exact funding", async () => {
    expect(
      Boolean(
        state.familyProfileId &&
          state.assignmentAId &&
          state.assignmentBId,
      ),
      "remote step 06 requires the in-process Family and assignment identifiers from steps 02-05",
    ).toBe(true);

    const adminPage = await adminContext.newPage();
    const sponsorAPage = await sponsorAContext.newPage();
    const sponsorBPage = await sponsorBContext.newPage();
    attachDiagnostics(adminPage, adminDiagnostics);
    attachDiagnostics(sponsorAPage, sponsorADiagnostics);
    attachDiagnostics(sponsorBPage, sponsorBDiagnostics);

    const operatorDashboardResponse = adminPage.waitForResponse(
      (response) =>
        response.request().method() === "GET" &&
        new URL(response.url()).pathname === "/api/dashboard/operator",
    );
    await adminPage.goto("/dashboard", { waitUntil: "commit" });
    await expect.poll(() => new URL(adminPage.url()).pathname).toBe("/dashboard");
    expect((await operatorDashboardResponse).status()).toBeLessThan(400);
    await expect(
      adminPage.getByRole("heading", { name: "Operator dashboard", exact: true }),
    ).toBeVisible();

    for (const sponsor of [
      {
        page: sponsorAPage,
        email: sponsorAEmail,
        password: sponsorAPassword,
      },
      {
        page: sponsorBPage,
        email: sponsorBEmail,
        password: sponsorBPassword,
      },
    ]) {
      await prepareLogin(sponsor.page, sponsor.email, sponsor.password);
      const dashboardResponse = sponsor.page.waitForResponse(
        (response) =>
          response.request().method() === "GET" &&
          new URL(response.url()).pathname === "/api/dashboard/sponsor",
      );
      await submitPreparedLogin(sponsor.page);
      await expect(sponsor.page).toHaveURL(/\/dashboard$/);
      expect((await dashboardResponse).status()).toBeLessThan(400);
    }

    const initialFunding = await readFamilyFundingFromSponsorCatalog(
      sponsorAPage,
      state.familyProfileId,
    );
    const fundingTargetMinor = Number(initialFunding.targetMinor);
    expect(Number.isSafeInteger(fundingTargetMinor)).toBe(true);
    expect(fundingTargetMinor).toBeGreaterThan(1);
    expect(initialFunding.fundedMinor).toBe(0);
    expect(initialFunding.pendingMinor).toBe(0);
    expect(initialFunding.status).toBe("pending_funding");

    const monthlyPlan = await browserJsonRequest(
      sponsorAPage,
      "POST",
      "/api/contributions/me/plans",
      {
        supportAssignmentId: state.assignmentAId,
        kind: "monthly",
        amountMinor: 1,
      },
    );
    expect(monthlyPlan.status).toBeLessThan(400);
    const monthlyPlanId = responseId(monthlyPlan.body);
    expect(monthlyPlanId).not.toBe("");
    expect(responseRecord(monthlyPlan.body).status).toBe("active");

    const pausePlan = await browserJsonRequest(
      sponsorAPage,
      "POST",
      `/api/contributions/me/plans/${monthlyPlanId}/pause`,
      { reason: "Acceptance lifecycle pause" },
    );
    expect(pausePlan.status).toBeLessThan(400);
    expect(responseRecord(pausePlan.body).status).toBe("paused");

    const resumePlan = await browserJsonRequest(
      sponsorAPage,
      "POST",
      `/api/contributions/me/plans/${monthlyPlanId}/resume`,
      { reason: "Acceptance lifecycle resume" },
    );
    expect(resumePlan.status).toBeLessThan(400);
    expect(responseRecord(resumePlan.body).status).toBe("active");

    await expectExactNegativeResponse(
      sponsorBPage,
      sponsorBDiagnostics,
      {
        method: "GET",
        path: `/api/contributions/me/plans/${monthlyPlanId}`,
        status: 404,
      },
      () =>
        browserJsonRequest(
          sponsorBPage,
          "GET",
          `/api/contributions/me/plans/${monthlyPlanId}`,
        ),
    );
    await expectExactNegativeResponse(
      sponsorBPage,
      sponsorBDiagnostics,
      {
        method: "POST",
        path: `/api/contributions/me/plans/${monthlyPlanId}/pause`,
        status: 404,
      },
      () =>
        browserJsonRequest(
          sponsorBPage,
          "POST",
          `/api/contributions/me/plans/${monthlyPlanId}/pause`,
          { reason: "Acceptance cross-sponsor denial" },
        ),
    );

    const stopPlan = await browserJsonRequest(
      sponsorAPage,
      "POST",
      `/api/contributions/me/plans/${monthlyPlanId}/stop`,
      { reason: "Acceptance lifecycle complete" },
    );
    expect(stopPlan.status).toBeLessThan(400);
    expect(responseRecord(stopPlan.body).status).toBe("stopped");
    await expectExactNegativeResponse(
      sponsorAPage,
      sponsorADiagnostics,
      {
        method: "POST",
        path: `/api/contributions/me/plans/${monthlyPlanId}/resume`,
        status: 409,
      },
      () =>
        browserJsonRequest(
          sponsorAPage,
          "POST",
          `/api/contributions/me/plans/${monthlyPlanId}/resume`,
          { reason: "Acceptance resume-after-stop proof" },
        ),
    );

    const rejectedPending = await browserJsonRequest(
      sponsorAPage,
      "POST",
      "/api/contributions/me",
      {
        supportAssignmentId: state.assignmentAId,
        amountMinor: 1,
        paymentMethod: "acceptance-funding-reject",
      },
    );
    expect(rejectedPending.status).toBeLessThan(400);
    const rejectedPendingId = responseId(rejectedPending.body);
    expect(rejectedPendingId).not.toBe("");
    let funding = await readFamilyFundingFromSponsorCatalog(
      sponsorAPage,
      state.familyProfileId,
    );
    expect(funding.fundedMinor).toBe(0);
    expect(funding.pendingMinor).toBe(1);

    const rejection = await browserJsonRequest(
      adminPage,
      "POST",
      `/api/contributions/${rejectedPendingId}/reject`,
      { reason: "Acceptance funding rejection" },
    );
    expect(rejection.status).toBeLessThan(400);
    expect(responseRecord(rejection.body).status).toBe("rejected");
    funding = await readFamilyFundingFromSponsorCatalog(
      sponsorAPage,
      state.familyProfileId,
    );
    expect(funding.fundedMinor).toBe(0);
    expect(funding.pendingMinor).toBe(0);

    const refundablePending = await browserJsonRequest(
      sponsorAPage,
      "POST",
      "/api/contributions/me",
      {
        supportAssignmentId: state.assignmentAId,
        amountMinor: 1,
        paymentMethod: "acceptance-funding-refund",
      },
    );
    expect(refundablePending.status).toBeLessThan(400);
    const refundableContributionId = responseId(refundablePending.body);
    expect(refundableContributionId).not.toBe("");

    const validationPath = `/api/contributions/${refundableContributionId}/validate`;
    const validation = await browserJsonRequest(adminPage, "POST", validationPath);
    expect(validation.status).toBeLessThan(400);
    expect(responseRecord(responseRecord(validation.body).contribution).status).toBe(
      "validated",
    );
    funding = await readFamilyFundingFromSponsorCatalog(
      sponsorAPage,
      state.familyProfileId,
    );
    expect(funding.fundedMinor).toBe(1);
    expect(funding.pendingMinor).toBe(0);

    const validationReplay = await browserJsonRequest(
      adminPage,
      "POST",
      validationPath,
    );
    expect(validationReplay.status).toBeLessThan(400);
    expect(responseRecord(validationReplay.body).status).toBe("validated");
    funding = await readFamilyFundingFromSponsorCatalog(
      sponsorAPage,
      state.familyProfileId,
    );
    expect(funding.fundedMinor).toBe(1);

    const refundPath = `/api/contributions/${refundableContributionId}/refund`;
    const refund = await browserJsonRequest(adminPage, "POST", refundPath, {
      reason: "Acceptance funding refund",
    });
    expect(refund.status).toBeLessThan(400);
    expect(responseRecord(responseRecord(refund.body).contribution).status).toBe(
      "refunded",
    );
    funding = await readFamilyFundingFromSponsorCatalog(
      sponsorAPage,
      state.familyProfileId,
    );
    expect(funding.fundedMinor).toBe(0);

    const refundReplay = await browserJsonRequest(adminPage, "POST", refundPath, {
      reason: "Acceptance funding refund replay",
    });
    expect(refundReplay.status).toBeLessThan(400);
    expect(responseRecord(refundReplay.body).status).toBe("refunded");
    funding = await readFamilyFundingFromSponsorCatalog(
      sponsorAPage,
      state.familyProfileId,
    );
    expect(funding.fundedMinor).toBe(0);

    const sponsorATargetMinor = Math.trunc(fundingTargetMinor / 2);
    const sponsorBTargetMinor = fundingTargetMinor - sponsorATargetMinor;
    expect(Number.isSafeInteger(sponsorATargetMinor)).toBe(true);
    expect(Number.isSafeInteger(sponsorBTargetMinor)).toBe(true);
    expect(sponsorATargetMinor).toBeGreaterThan(0);
    expect(sponsorBTargetMinor).toBeGreaterThan(0);
    expect(sponsorATargetMinor + sponsorBTargetMinor).toBe(fundingTargetMinor);

    const targetContributionA = await browserJsonRequest(
      sponsorAPage,
      "POST",
      "/api/contributions/me",
      {
        supportAssignmentId: state.assignmentAId,
        amountMinor: sponsorATargetMinor,
        paymentMethod: "acceptance-exact-target-a",
      },
    );
    expect(targetContributionA.status).toBeLessThan(400);
    const targetContributionAId = responseId(targetContributionA.body);
    expect(targetContributionAId).not.toBe("");

    const targetContributionB = await browserJsonRequest(
      sponsorBPage,
      "POST",
      "/api/contributions/me",
      {
        supportAssignmentId: state.assignmentBId,
        amountMinor: sponsorBTargetMinor,
        paymentMethod: "acceptance-exact-target-b",
      },
    );
    expect(targetContributionB.status).toBeLessThan(400);
    const targetContributionBId = responseId(targetContributionB.body);
    expect(targetContributionBId).not.toBe("");

    funding = await readFamilyFundingFromSponsorCatalog(
      sponsorAPage,
      state.familyProfileId,
    );
    expect(funding.fundedMinor).toBe(0);
    expect(funding.pendingMinor).toBe(fundingTargetMinor);
    expect(funding.status).toBe("pending_funding");

    const validateTargetA = await browserJsonRequest(
      adminPage,
      "POST",
      `/api/contributions/${targetContributionAId}/validate`,
    );
    expect(validateTargetA.status).toBeLessThan(400);
    funding = await readFamilyFundingFromSponsorCatalog(
      sponsorAPage,
      state.familyProfileId,
    );
    expect(funding.fundedMinor).toBe(sponsorATargetMinor);
    expect(Number(funding.fundedMinor)).toBeLessThan(fundingTargetMinor);
    expect(funding.status).toBe("pending_funding");

    const validateTargetB = await browserJsonRequest(
      adminPage,
      "POST",
      `/api/contributions/${targetContributionBId}/validate`,
    );
    expect(validateTargetB.status).toBeLessThan(400);
    funding = await readFamilyFundingFromSponsorCatalog(
      sponsorAPage,
      state.familyProfileId,
    );
    expect(funding.fundedMinor).toBe(fundingTargetMinor);
    expect(Number(funding.fundedMinor)).toBeLessThanOrEqual(Number(funding.targetMinor));
    expect(funding.pendingMinor).toBe(0);
    expect(funding.status).toBe("active");
    expect(funding.capacityStatus).toBe("funded");

    const sponsorAHistory = await browserJsonRequest(
      sponsorAPage,
      "GET",
      "/api/contributions/me?limit=100&offset=0",
    );
    const sponsorBHistory = await browserJsonRequest(
      sponsorBPage,
      "GET",
      "/api/contributions/me?limit=100&offset=0",
    );
    expect(sponsorAHistory.status).toBe(200);
    expect(sponsorBHistory.status).toBe(200);
    const sponsorATargetRows = responseRows(sponsorAHistory.body).filter(
      (row) =>
        row.id === targetContributionAId || row.id === targetContributionBId,
    );
    const sponsorBTargetRows = responseRows(sponsorBHistory.body).filter(
      (row) =>
        row.id === targetContributionAId || row.id === targetContributionBId,
    );
    expect(sponsorATargetRows).toHaveLength(1);
    expect(sponsorATargetRows[0]!.id).toBe(targetContributionAId);
    expect(sponsorBTargetRows).toHaveLength(1);
    expect(sponsorBTargetRows[0]!.id).toBe(targetContributionBId);

    const adminHistory = await browserJsonRequest(
      adminPage,
      "GET",
      `/api/contributions?familyProfileId=${encodeURIComponent(state.familyProfileId)}` +
        "&limit=100&offset=0",
    );
    expect(adminHistory.status).toBe(200);
    const adminTargetRows = responseRows(adminHistory.body).filter(
      (row) =>
        row.id === targetContributionAId || row.id === targetContributionBId,
    );
    expect(adminTargetRows).toHaveLength(2);
    expect(
      adminTargetRows.reduce((sum, row) => sum + Number(row.amountMinor), 0),
    ).toBe(fundingTargetMinor);
    expect(adminTargetRows.every((row) => row.status === "validated")).toBe(true);

    const fundedCatalogResponse = sponsorAPage.waitForResponse((response) => {
      const url = new URL(response.url());
      return (
        response.request().method() === "GET" &&
        url.pathname === "/api/support-assignments/catalog" &&
        url.searchParams.has("limit") &&
        url.searchParams.has("offset")
      );
    });
    await sponsorAPage.goto("/sponsor/support", { waitUntil: "commit" });
    expect((await fundedCatalogResponse).status()).toBeLessThan(400);
    await expect.poll(() => new URL(sponsorAPage.url()).pathname).toBe("/family");
    await expectNoneVisible(
      sponsorAPage.getByText("Loading families", { exact: true }),
    );
    const fundedFamilyRows = sponsorAPage.locator(
      '[data-ntable-cards-grid] > [data-row="true"]',
    );
    const fundedFamilyRow = fundedFamilyRows
      .filter({
        has: sponsorAPage.getByText(familyName, { exact: true }),
      });
    const catalogPagination = sponsorAPage.getByRole("navigation", {
      name: "Pagination",
      exact: true,
    });
    for (let pageStep = 0; pageStep < 100; pageStep += 1) {
      if ((await fundedFamilyRow.count()) !== 0) break;

      const nextPage = catalogPagination.getByRole("button", {
        name: "Next page",
        exact: true,
      });
      await expect(nextPage).toBeVisible();
      if (await nextPage.isDisabled()) break;

      const currentPage = catalogPagination.locator('[aria-current="page"]');
      const currentPageLabel = await currentPage.getAttribute("aria-label");
      expect(currentPageLabel).not.toBeNull();
      await nextPage.click();
      await expect.poll(
        () => currentPage.getAttribute("aria-label"),
      ).not.toBe(currentPageLabel);
    }
    await expect(fundedFamilyRow).toHaveCount(1);
    const fundedProgress = await onlyVisible(
      fundedFamilyRow.getByRole("progressbar", {
        name: "Family funding progress",
        exact: true,
      }),
    );
    await expect(fundedProgress).toHaveAttribute(
      "aria-valuenow",
      "100",
    );

    await signOut(sponsorAPage);
    await signOut(sponsorBPage);
    await signOut(adminPage);
    await Promise.all([
      sponsorAPage.close(),
      sponsorBPage.close(),
      adminPage.close(),
    ]);
  });

  test("remote step 07 - delivery staff and reversible orders", async () => {
    expect(
      Boolean(
        state.familyProfileId &&
          state.assignmentAId &&
          state.assignmentBId,
      ),
      "remote step 07 requires the in-process Family and support graph from steps 02-06",
    ).toBe(true);

    const adminPage = await adminContext.newPage();
    const familyPage = await familyContext.newPage();
    const sponsorAPage = await sponsorAContext.newPage();
    const sponsorBPage = await sponsorBContext.newPage();
    attachDiagnostics(adminPage, adminDiagnostics);
    attachDiagnostics(familyPage, familyDiagnostics);
    attachDiagnostics(sponsorAPage, sponsorADiagnostics);
    attachDiagnostics(sponsorBPage, sponsorBDiagnostics);

    for (const principal of [
      { page: adminPage, identifier: adminEmail, password: adminPassword },
      { page: familyPage, identifier: familyEmail, password: familyRuntimePassword },
      { page: sponsorAPage, identifier: sponsorAEmail, password: sponsorAPassword },
      { page: sponsorBPage, identifier: sponsorBEmail, password: sponsorBPassword },
    ]) {
      await prepareLogin(principal.page, principal.identifier, principal.password);
      await submitPreparedLogin(principal.page);
      await expect(principal.page).toHaveURL(/\/dashboard$/);
    }

    const initialBudget = await readBudgetSnapshot(familyPage, "/api/budgets/me");
    const catalog = await browserJsonRequest(
      familyPage,
      "GET",
      "/api/catalog/browse/products?limit=100&offset=0",
    );
    expect(catalog.status).toBe(200);
    const eligibleProducts = responseRows(catalog.body)
      .filter((product) => {
        const priceMinor = Number(product.priceMinor);
        return (
          typeof product.id === "string" &&
          typeof product.name === "string" &&
          Number.isSafeInteger(priceMinor) &&
          priceMinor > 0 &&
          (priceMinor > 1
            ? priceMinor <= initialBudget.availableMinor
            : initialBudget.availableMinor >= 2)
        );
      })
      .sort((left, right) => Number(left.priceMinor) - Number(right.priceMinor));
    if (eligibleProducts.length === 0) {
      throw new Error(
        "ENVIRONMENT BLOCKED: the deployed Family catalog has no affordable active product for purchase-variance acceptance",
      );
    }
    const eligibleProduct = eligibleProducts[0]!;
    const product: OrderJourneyProduct = {
      id: String(eligibleProduct.id),
      name: String(eligibleProduct.name),
      priceMinor: Number(eligibleProduct.priceMinor),
    };

    await openStaffDirectory(adminPage);
    const createdDeliveryStaff = [];
    for (const fixture of deliveryStaffFixtures) {
      createdDeliveryStaff.push(await createDeliveryStaffThroughUi(adminPage, fixture));
    }
    const createdDeliveryStaffIds = createdDeliveryStaff.map((profile) => profile.id);
    expect(createdDeliveryStaffIds.every((id) => typeof id === "string")).toBe(true);
    expect(new Set(createdDeliveryStaffIds).size).toBe(2);

    const deliveryOptions = await browserJsonRequest(
      adminPage,
      "GET",
      "/api/staff/options/delivery",
    );
    expect(deliveryOptions.status).toBe(200);
    const deliveryStaff = responseRows(deliveryOptions.body).filter(
      (profile) =>
        typeof profile.id === "string" &&
        deliveryStaffFixtures.some((fixture) => profile.name === fixture.name),
    );
    expect(deliveryStaff).toHaveLength(2);
    const deliveryStaffByName = new Map(
      deliveryStaff.map((profile) => [profile.name, profile]),
    );
    const staffA = deliveryStaffByName.get(deliveryStaffFixtures[0]!.name)!;
    const staffB = deliveryStaffByName.get(deliveryStaffFixtures[1]!.name)!;
    expect(staffA).toBeDefined();
    expect(staffB).toBeDefined();
    expect(staffA.id).toBe(createdDeliveryStaff[0]!.id);
    expect(staffB.id).toBe(createdDeliveryStaff[1]!.id);
    expect(staffA.functionKeys).toEqual(["delivery"]);
    expect(staffB.functionKeys).toEqual(["delivery"]);

    // Order 1: self-service creation, exact visible reserve, UI cancellation,
    // and idempotent creation/cancellation replays with no second aggregate effect.
    const order1Submission = await submitFamilyOrder(
      familyPage,
      product,
      "step-07-order-1",
    );
    const order1 = order1Submission.order;
    const order1Id = String(order1.id);
    const order1Number = String(order1.orderNumber);
    const order1TotalMinor = Number(order1.requestedTotalMinor);
    const afterOrder1Submit = await readBudgetSnapshot(familyPage, "/api/budgets/me");
    expectBudgetSnapshot(afterOrder1Submit, {
      availableMinor: initialBudget.availableMinor - order1TotalMinor,
      reservedMinor: initialBudget.reservedMinor + order1TotalMinor,
      spentMinor: initialBudget.spentMinor,
    });

    const order1Replay = await browserJsonRequest(
      familyPage,
      "POST",
      "/api/orders/submit",
      { idempotencyKey: order1Submission.idempotencyKey },
    );
    expect(order1Replay.status).toBeLessThan(400);
    expect(responseId(order1Replay.body)).toBe(order1Id);
    expectBudgetSnapshot(
      await readBudgetSnapshot(familyPage, "/api/budgets/me"),
      afterOrder1Submit,
    );

    const familyOrdersResponse = familyPage.waitForResponse((response) => {
      const url = new URL(response.url());
      return (
        response.request().method() === "GET" &&
        url.pathname === "/api/orders" &&
        url.searchParams.has("limit") &&
        url.searchParams.has("offset")
      );
    });
    await familyPage.goto("/orders", { waitUntil: "commit" });
    expect((await familyOrdersResponse).status()).toBe(200);
    const order1Cell = await onlyVisible(
      familyPage.getByText(order1Number, { exact: true }),
    );
    const order1DetailResponse = familyPage.waitForResponse(
      (response) =>
        response.request().method() === "GET" &&
        new URL(response.url()).pathname === `/api/orders/me/${order1Id}` &&
        response.status() === 200,
    );
    await order1Cell.click();
    await order1DetailResponse;
    const order1Sheet = familyPage.getByRole("dialog", {
      name: `View ${order1Number}`,
      exact: true,
    });
    await expect(order1Sheet).toBeVisible();
    await expect(order1Sheet.getByText("Total", { exact: true })).toBeVisible();
    await expect(order1Sheet.getByText(product.name, { exact: true })).toBeVisible();
    await familyPage.keyboard.press("Escape");
    await expect(order1Sheet).toBeHidden();

    const order1Row = familyPage
      .locator("tbody tr")
      .filter({ has: familyPage.getByText(order1Number, { exact: true }) });
    await expect(order1Row).toHaveCount(1);
    await (await onlyVisible(
      order1Row.getByRole("button", { name: "Row actions", exact: true }),
    )).click();
    await familyPage.getByRole("menuitem", { name: "Cancel", exact: true }).click();
    const familyCancelDialog = familyPage.getByRole("dialog", {
      name: "Cancel order",
      exact: true,
    });
    await expect(familyCancelDialog).toBeVisible();
    await familyCancelDialog.locator("textarea").fill("Acceptance family cancellation");
    const cancelResponse = familyPage.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === `/api/orders/me/${order1Id}/cancel`,
    );
    await familyCancelDialog
      .getByRole("button", { name: "Cancel", exact: true })
      .click();
    expect((await cancelResponse).status()).toBeLessThan(400);
    await expect(order1Row.getByText("Cancelled", { exact: true })).toBeVisible();
    const afterOrder1Cancel = await readBudgetSnapshot(familyPage, "/api/budgets/me");
    expectBudgetSnapshot(afterOrder1Cancel, initialBudget);
    const cancelledOrder1 = await browserJsonRequest(
      familyPage,
      "GET",
      `/api/orders/me/${order1Id}`,
    );
    expect(cancelledOrder1.status).toBe(200);
    const cancelledOrder1Record = responseRecord(cancelledOrder1.body);
    expect(cancelledOrder1Record.status).toBe("cancelled");
    expect(cancelledOrder1Record.cancellationReason).toBe(
      "Acceptance family cancellation",
    );
    const order1EventCount = responseRows(cancelledOrder1Record.statusEvents).length;
    const cancellationReplay = await browserJsonRequest(
      familyPage,
      "POST",
      `/api/orders/me/${order1Id}/cancel`,
      { reason: "Acceptance cancellation replay" },
    );
    expect(cancellationReplay.status).toBeLessThan(400);
    expect(responseRecord(cancellationReplay.body).status).toBe("cancelled");
    expect(responseRows(responseRecord(cancellationReplay.body).statusEvents)).toHaveLength(
      order1EventCount,
    );
    expectBudgetSnapshot(
      await readBudgetSnapshot(familyPage, "/api/budgets/me"),
      initialBudget,
    );

    // Order 2: Admin rejection releases the reserve exactly once and both
    // operational and owner projections retain only the permitted reason.
    const order2 = (
      await submitFamilyOrder(familyPage, product, "step-07-order-2")
    ).order;
    const order2Id = String(order2.id);
    const order2TotalMinor = Number(order2.requestedTotalMinor);
    expectBudgetSnapshot(
      await readBudgetSnapshot(familyPage, "/api/budgets/me"),
      {
        availableMinor: initialBudget.availableMinor - order2TotalMinor,
        reservedMinor: initialBudget.reservedMinor + order2TotalMinor,
        spentMinor: initialBudget.spentMinor,
      },
    );
    const order2RejectionReason = "Acceptance order rejection";
    const rejectedOrder2 = await browserJsonRequest(
      adminPage,
      "POST",
      `/api/orders/${order2Id}/reject`,
      { reason: order2RejectionReason },
    );
    expect(rejectedOrder2.status).toBeLessThan(400);
    expect(responseRecord(rejectedOrder2.body).status).toBe("rejected");
    expect(responseRecord(rejectedOrder2.body).rejectionReason).toBe(
      order2RejectionReason,
    );
    const familyOrder2 = await browserJsonRequest(
      familyPage,
      "GET",
      `/api/orders/me/${order2Id}`,
    );
    expect(familyOrder2.status).toBe(200);
    expect(responseRecord(familyOrder2.body).status).toBe("rejected");
    expect(responseRecord(familyOrder2.body).rejectionReason).toBe(
      order2RejectionReason,
    );
    expectBudgetSnapshot(
      await readBudgetSnapshot(familyPage, "/api/budgets/me"),
      initialBudget,
    );

    orderJourneyState = {
      phase: "reversible-orders-complete",
      pages: { adminPage, familyPage, sponsorAPage, sponsorBPage },
      initialBudget,
      product,
      staffAId: String(staffA.id),
      staffBId: String(staffB.id),
    };
  });

  test("remote step 08 - purchase and delivery lifecycle", async () => {
    const reversibleOrders = requireReversibleOrdersComplete(orderJourneyState);
    const { adminPage, familyPage } = reversibleOrders.pages;
    const { initialBudget, product, staffAId, staffBId } = reversibleOrders;

    // Order 3: purchase variance, replay safety, failed delivery history,
    // semantic reassignment to Staff B, retry, and terminal confirmation.
    const order3 = (
      await submitFamilyOrder(familyPage, product, "step-08-order-3")
    ).order;
    const order3Id = String(order3.id);
    const order3TotalMinor = Number(order3.requestedTotalMinor);
    const approval = await browserJsonRequest(
      adminPage,
      "POST",
      `/api/orders/${order3Id}/approve`,
    );
    expect(approval.status).toBeLessThan(400);
    expect(responseRecord(approval.body).status).toBe("approved");

    const receiptUpload = await uploadGeneratedPdfEvidence(adminPage, "receipts");
    expect(receiptUpload.status).toBeLessThan(400);
    const receipt = responseRecord(receiptUpload.body);
    expect(receipt.mediaType).toBe("application/pdf");
    expect(Number(receipt.byteSize)).toBeGreaterThan(0);
    const receiptPath = String(receipt.path ?? "");
    expect(receiptPath).not.toBe("");
    const actualTotalMinor =
      order3TotalMinor > 1 ? order3TotalMinor - 1 : order3TotalMinor + 1;
    expect(actualTotalMinor).not.toBe(order3TotalMinor);
    const purchaseIdempotencyKey = `step-08-purchase-${crypto.randomUUID()}`;
    const purchase = await browserJsonRequest(
      adminPage,
      "POST",
      `/api/orders/${order3Id}/purchase`,
      {
        merchantName: "Acceptance merchant",
        purchasedAt: new Date().toISOString(),
        actualTotalMinor,
        receiptStoragePath: receiptPath,
        receiptMediaType: receipt.mediaType,
        receiptByteSize: receipt.byteSize,
        confirmHigherAmount: actualTotalMinor > order3TotalMinor,
        idempotencyKey: purchaseIdempotencyKey,
      },
    );
    expect(purchase.status).toBeLessThan(400);
    const purchasedOrder3 = responseRecord(purchase.body);
    expect(purchasedOrder3.status).toBe("purchased");
    expect(Number(purchasedOrder3.requestedTotalMinor)).toBe(order3TotalMinor);
    expect(Number(purchasedOrder3.actualTotalMinor)).toBe(actualTotalMinor);
    expect(
      Number(purchasedOrder3.actualTotalMinor) -
        Number(purchasedOrder3.requestedTotalMinor),
    ).toBe(actualTotalMinor - order3TotalMinor);
    const budgetAfterPurchase = await readBudgetSnapshot(
      familyPage,
      "/api/budgets/me",
    );
    expectBudgetSnapshot(budgetAfterPurchase, {
      availableMinor: initialBudget.availableMinor - actualTotalMinor,
      reservedMinor: initialBudget.reservedMinor,
      spentMinor: initialBudget.spentMinor + actualTotalMinor,
    });
    const purchasesBeforeReplay = responseRows(purchasedOrder3.purchases).length;
    const eventsBeforePurchaseReplay = responseRows(
      purchasedOrder3.statusEvents,
    ).length;
    const purchaseReplay = await browserJsonRequest(
      adminPage,
      "POST",
      `/api/orders/${order3Id}/purchase`,
      {
        merchantName: "Acceptance merchant",
        purchasedAt: new Date().toISOString(),
        actualTotalMinor,
        receiptStoragePath: receiptPath,
        receiptMediaType: receipt.mediaType,
        receiptByteSize: receipt.byteSize,
        confirmHigherAmount: actualTotalMinor > order3TotalMinor,
        idempotencyKey: purchaseIdempotencyKey,
      },
    );
    expect(purchaseReplay.status).toBeLessThan(400);
    const purchaseReplayRecord = responseRecord(purchaseReplay.body);
    expect(purchaseReplayRecord.status).toBe("purchased");
    expect(responseRows(purchaseReplayRecord.purchases)).toHaveLength(
      purchasesBeforeReplay,
    );
    expect(responseRows(purchaseReplayRecord.statusEvents)).toHaveLength(
      eventsBeforePurchaseReplay,
    );
    expectBudgetSnapshot(
      await readBudgetSnapshot(familyPage, "/api/budgets/me"),
      budgetAfterPurchase,
    );

    const assignmentA = await browserJsonRequest(
      adminPage,
      "POST",
      `/api/orders/${order3Id}/delivery/assign`,
      {
        staffProfileId: staffAId,
        idempotencyKey: `step-08-assign-a-${crypto.randomUUID()}`,
      },
    );
    expect(assignmentA.status).toBeLessThan(400);
    expect(responseRecord(responseRecord(assignmentA.body).currentDelivery).staffProfileId)
      .toBe(staffAId);
    const firstStart = await browserJsonRequest(
      adminPage,
      "POST",
      `/api/orders/${order3Id}/delivery/start`,
      { idempotencyKey: `step-08-start-a-${crypto.randomUUID()}` },
    );
    expect(firstStart.status).toBeLessThan(400);
    expect(responseRecord(firstStart.body).status).toBe("out_for_delivery");
    const failedDelivery = await browserJsonRequest(
      adminPage,
      "POST",
      `/api/orders/${order3Id}/delivery/fail`,
      {
        reason: "Acceptance recipient unavailable",
        idempotencyKey: `step-08-fail-a-${crypto.randomUUID()}`,
      },
    );
    expect(failedDelivery.status).toBeLessThan(400);
    const failedOrder3 = responseRecord(failedDelivery.body);
    expect(failedOrder3.status).toBe("purchased");
    expect(failedOrder3.currentDelivery).toBeNull();
    const failedAttempts = responseRows(failedOrder3.deliveryAttempts);
    expect(failedAttempts).toHaveLength(1);
    expect(failedAttempts[0]!.status).toBe("failed");
    expect(failedAttempts[0]!.failureReason).toBe(
      "Acceptance recipient unavailable",
    );

    const assignmentB = await browserJsonRequest(
      adminPage,
      "POST",
      `/api/orders/${order3Id}/delivery/assign`,
      {
        staffProfileId: staffBId,
        idempotencyKey: `step-08-assign-b-${crypto.randomUUID()}`,
      },
    );
    expect(assignmentB.status).toBeLessThan(400);
    const reassignedOrder3 = responseRecord(assignmentB.body);
    const reassignedAttempts = responseRows(reassignedOrder3.deliveryAttempts);
    expect(reassignedAttempts).toHaveLength(2);
    expect(reassignedAttempts[0]!.status).toBe("failed");
    expect(reassignedAttempts[1]!.status).toBe("assigned");
    expect(reassignedAttempts[1]!.staffProfileId).toBe(staffBId);
    const retryStart = await browserJsonRequest(
      adminPage,
      "POST",
      `/api/orders/${order3Id}/delivery/start`,
      { idempotencyKey: `step-08-start-b-${crypto.randomUUID()}` },
    );
    expect(retryStart.status).toBeLessThan(400);
    expect(responseRecord(retryStart.body).status).toBe("out_for_delivery");

    const deliveryProofUpload = await uploadGeneratedPdfEvidence(
      adminPage,
      "deliveries",
    );
    expect(deliveryProofUpload.status).toBeLessThan(400);
    const deliveryProof = responseRecord(deliveryProofUpload.body);
    const deliveryProofPath = String(deliveryProof.path ?? "");
    expect(deliveryProofPath).not.toBe("");
    const confirmationIdempotencyKey = `step-08-confirm-${crypto.randomUUID()}`;
    const confirmationPayload = {
      confirmationMethod: "recipient_signature",
      deliveryNote: "Acceptance delivery confirmed",
      proofStoragePath: deliveryProofPath,
      proofMediaType: deliveryProof.mediaType,
      proofByteSize: deliveryProof.byteSize,
      idempotencyKey: confirmationIdempotencyKey,
    };
    const confirmedDelivery = await browserJsonRequest(
      adminPage,
      "POST",
      `/api/orders/${order3Id}/delivery/confirm`,
      confirmationPayload,
    );
    expect(confirmedDelivery.status).toBeLessThan(400);
    const deliveredOrder3 = responseRecord(confirmedDelivery.body);
    expect(deliveredOrder3.status).toBe("delivered");
    const deliveredAttempts = responseRows(deliveredOrder3.deliveryAttempts);
    expect(deliveredAttempts).toHaveLength(2);
    expect(deliveredAttempts.map((attempt) => attempt.status)).toEqual([
      "failed",
      "delivered",
    ]);
    const deliveredEventCount = responseRows(deliveredOrder3.statusEvents).length;
    const confirmationReplay = await browserJsonRequest(
      adminPage,
      "POST",
      `/api/orders/${order3Id}/delivery/confirm`,
      confirmationPayload,
    );
    expect(confirmationReplay.status).toBeLessThan(400);
    const confirmationReplayRecord = responseRecord(confirmationReplay.body);
    expect(confirmationReplayRecord.status).toBe("delivered");
    expect(responseRows(confirmationReplayRecord.deliveryAttempts)).toHaveLength(2);
    expect(responseRows(confirmationReplayRecord.statusEvents)).toHaveLength(
      deliveredEventCount,
    );
    expectBudgetSnapshot(
      await readBudgetSnapshot(familyPage, "/api/budgets/me"),
      budgetAfterPurchase,
    );

    orderJourneyState = {
      phase: "delivery-complete",
      pages: reversibleOrders.pages,
      staffAId,
      staffBId,
      order3Id,
      receiptPath,
      deliveryProofPath,
    };
  });

  test("remote step 09 - Family order projection", async () => {
    const deliveredOrder = requireDeliveredOrderPhase(
      orderJourneyState,
      "delivery-complete",
    );
    const { familyPage } = deliveredOrder.pages;
    const { order3Id } = deliveredOrder;

    // The Family projection is checked separately from both sponsor privacy
    // projections and the complete Admin operational projection.
    const familyOrder3 = await browserJsonRequest(
      familyPage,
      "GET",
      `/api/orders/me/${order3Id}`,
    );
    expect(familyOrder3.status).toBe(200);
    const familyOrder3Record = responseRecord(familyOrder3.body);
    expect(familyOrder3Record.status).toBe("delivered");
    expect(
      containsProjectionKey(familyOrder3Record, [
        "submissionIdempotencyKey",
        "placedByUserId",
        "approvedByUserId",
        "rejectedByUserId",
        "cancelledByUserId",
        "deliveryStartedByUserId",
        "deliveredByUserId",
        "deliveryConfirmationIdempotencyKey",
        "deliveryNote",
        "deliveryProofStoragePath",
        "deliveryProofMediaType",
        "deliveryProofByteSize",
        "actorUserId",
        "purchases",
        "deliveryAttempts",
      ]),
    ).toBe(false);

    orderJourneyState = {
      ...deliveredOrder,
      phase: "family-projection-complete",
    };
  });

  test("remote step 10 - Sponsor A order privacy", async () => {
    const familyProjection = requireDeliveredOrderPhase(
      orderJourneyState,
      "family-projection-complete",
    );
    await assertSponsorOrderProjection(
      familyProjection.pages.sponsorAPage,
      familyProjection.order3Id,
      sponsorOrderSensitiveValues(familyProjection),
    );
    orderJourneyState = {
      ...familyProjection,
      phase: "sponsor-a-projection-complete",
    };
  });

  test("remote step 11 - Sponsor B order privacy", async () => {
    const sponsorAProjection = requireDeliveredOrderPhase(
      orderJourneyState,
      "sponsor-a-projection-complete",
    );
    await assertSponsorOrderProjection(
      sponsorAProjection.pages.sponsorBPage,
      sponsorAProjection.order3Id,
      sponsorOrderSensitiveValues(sponsorAProjection),
    );
    orderJourneyState = {
      ...sponsorAProjection,
      phase: "sponsor-b-projection-complete",
    };
  });

  test("remote step 12 - Admin order projection", async () => {
    const sponsorBProjection = requireDeliveredOrderPhase(
      orderJourneyState,
      "sponsor-b-projection-complete",
    );
    const { adminPage } = sponsorBProjection.pages;
    const { order3Id, receiptPath, deliveryProofPath } = sponsorBProjection;

    const adminOrder3 = await browserJsonRequest(
      adminPage,
      "GET",
      `/api/orders/${order3Id}`,
    );
    expect(adminOrder3.status).toBe(200);
    const adminOrder3Record = responseRecord(adminOrder3.body);
    expect(adminOrder3Record.deliveryAddressSnapshot).toBe(familyAddress);
    expect(adminOrder3Record.deliveryPhoneSnapshot).toBe(familyPhone);
    expect(responseRecord(adminOrder3Record.activePurchase).receiptStoragePath).toBe(
      receiptPath,
    );
    expect(adminOrder3Record.deliveryNote).toBe("Acceptance delivery confirmed");
    expect(adminOrder3Record.deliveryProofStoragePath).toBe(deliveryProofPath);
    expect(responseRows(adminOrder3Record.deliveryAttempts)).toHaveLength(2);
    expect(
      responseRows(adminOrder3Record.deliveryAttempts).every(
        (attempt) =>
          typeof attempt.staffProfileId === "string" &&
          Object.hasOwn(attempt, "deliveryPhoneSnapshot") &&
          Object.hasOwn(attempt, "affiliationSnapshot"),
      ),
    ).toBe(true);

    orderJourneyState = {
      ...sponsorBProjection,
      phase: "admin-projection-complete",
    };
  });

  test("remote step 13 - Family delivery assignment denial", async () => {
    const adminProjection = requireDeliveredOrderPhase(
      orderJourneyState,
      "admin-projection-complete",
    );
    const { familyPage } = adminProjection.pages;
    const { order3Id, staffAId } = adminProjection;

    await expectExactNegativeResponse(
      familyPage,
      familyDiagnostics,
      {
        method: "POST",
        path: `/api/orders/${order3Id}/delivery/assign`,
        status: 401,
      },
      () =>
        browserJsonRequest(
          familyPage,
          "POST",
          `/api/orders/${order3Id}/delivery/assign`,
          {
            staffProfileId: staffAId,
            idempotencyKey: `step-13-family-denial-${crypto.randomUUID()}`,
          },
        ),
    );

    orderJourneyState = {
      ...adminProjection,
      phase: "family-denial-complete",
    };
  });

  test("remote step 14 - Sponsor A approval denial", async () => {
    const familyDenial = requireDeliveredOrderPhase(
      orderJourneyState,
      "family-denial-complete",
    );
    const { sponsorAPage } = familyDenial.pages;
    const { order3Id } = familyDenial;

    await expectExactNegativeResponse(
      sponsorAPage,
      sponsorADiagnostics,
      {
        method: "POST",
        path: `/api/orders/${order3Id}/approve`,
        status: 401,
      },
      () =>
        browserJsonRequest(
          sponsorAPage,
          "POST",
          `/api/orders/${order3Id}/approve`,
        ),
    );

    orderJourneyState = {
      ...familyDenial,
      phase: "sponsor-a-denial-complete",
    };
  });

  test("remote step 15 - Sponsor B delivery confirmation denial", async () => {
    const sponsorADenial = requireDeliveredOrderPhase(
      orderJourneyState,
      "sponsor-a-denial-complete",
    );
    const { sponsorBPage } = sponsorADenial.pages;
    const { order3Id } = sponsorADenial;

    await expectExactNegativeResponse(
      sponsorBPage,
      sponsorBDiagnostics,
      {
        method: "POST",
        path: `/api/orders/${order3Id}/delivery/confirm`,
        status: 401,
      },
      () =>
        browserJsonRequest(
          sponsorBPage,
          "POST",
          `/api/orders/${order3Id}/delivery/confirm`,
          {
            confirmationMethod: "operator_confirmation",
            idempotencyKey: `step-15-sponsor-denial-${crypto.randomUUID()}`,
          },
        ),
    );

    orderJourneyState = {
      ...sponsorADenial,
      phase: "denials-complete",
    };
  });

  test("remote responsive - phone, tablet, RTL, keyboard, and protected images", async () => {
    const denialsComplete = requireDeliveredOrderPhase(
      orderJourneyState,
      "denials-complete",
    );
    const { adminPage, familyPage, sponsorBPage } = denialsComplete.pages;

    await adminPage.setViewportSize({ width: 768, height: 900 });
    await adminPage.goto("/staff", { waitUntil: "commit" });
    await expect(adminPage.getByRole("heading", { name: "Staff", exact: true })).toBeVisible();
    await expect(adminPage.getByText(deliveryStaffFixtures[0]!.name, { exact: true })).toBeVisible();
    await expect(adminPage.getByText(deliveryStaffFixtures[1]!.name, { exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(adminPage);

    await familyPage.setViewportSize({ width: 390, height: 844 });
    await familyPage.goto("/products", { waitUntil: "commit" });
    await expect(
      familyPage.getByRole("heading", { name: "Products", exact: true }),
    ).toBeVisible();
    const protectedProductImages = familyPage.locator(
      'img[src*="/api/product-images/files/serve/"]',
    );
    await expect.poll(() => protectedProductImages.count()).toBeGreaterThan(0);
    const protectedProductImage = protectedProductImages.first();
    await protectedProductImage.scrollIntoViewIfNeeded();
    await expect.poll(() =>
      protectedProductImage.evaluate((node) => {
        const image = node as HTMLImageElement;
        return image.complete && image.naturalWidth > 0;
      }),
    ).toBe(true);
    const productName = (await protectedProductImage.getAttribute("alt")) ?? "";
    const protectedImageSource =
      (await protectedProductImage.getAttribute("src")) ?? "";
    expect(productName.length).toBeGreaterThan(0);
    expect(protectedImageSource.length).toBeGreaterThan(0);
    const imagePath = new URL(protectedImageSource, baseUrl).pathname;
    const protectedImageResponse = await browserResourceRequest(familyPage, imagePath);
    expect(protectedImageResponse.status).toBe(200);
    expect(protectedImageResponse.contentType.startsWith("image/")).toBe(true);
    expect(protectedImageResponse.byteLength).toBeGreaterThan(0);

    const productRow = protectedProductImage.locator(
      "xpath=ancestor::*[@data-row='true'][1]",
    );
    const rowActions = productRow.getByRole("button", {
      name: "Row actions",
      exact: true,
    });
    await rowActions.focus();
    await expect(rowActions).toBeFocused();
    await familyPage.keyboard.press("Enter");
    const viewMenuItem = familyPage.getByRole("menuitem", {
      name: "View",
      exact: true,
    });
    await expect(viewMenuItem).toBeFocused();
    await familyPage.keyboard.press("Enter");
    const productDialog = familyPage.getByRole("dialog", {
      name: productName,
      exact: true,
    });
    await expect(productDialog).toBeVisible();
    await expect.poll(() =>
      productDialog.evaluate((dialog) => dialog.contains(document.activeElement)),
    ).toBe(true);
    await familyPage.keyboard.press("Escape");
    await expect(productDialog).toBeHidden();
    await expectNoHorizontalOverflow(familyPage);

    const supportedOrders = await browserJsonRequest(
      sponsorBPage,
      "GET",
      "/api/orders/supported?limit=100&offset=0",
    );
    expect(supportedOrders.status).toBe(200);
    const targetOrders = responseRows(supportedOrders.body).filter(
      (order) => order.id === denialsComplete.order3Id,
    );
    expect(targetOrders.length, "Sponsor B must retain exactly one target order").toBe(1);
    const orderNumber = String(targetOrders[0]!.orderNumber ?? "");
    expect(orderNumber.length).toBeGreaterThan(0);

    await setLanguage(sponsorBPage.context(), "ar");
    await sponsorBPage.setViewportSize({ width: 375, height: 812 });
    await sponsorBPage.goto("/orders", { waitUntil: "commit" });
    await expect(sponsorBPage.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(sponsorBPage.getByText(orderNumber, { exact: true }).first()).toBeVisible();
    await expectNoHorizontalOverflow(sponsorBPage);
    await setEnglish(sponsorBPage.context());
  });

  test("remote step 16 - supported cleanup, role logout, and closure", async () => {
    const denialsComplete = requireDeliveredOrderPhase(
      orderJourneyState,
      "denials-complete",
    );
    const { adminPage, familyPage, sponsorAPage, sponsorBPage } =
      denialsComplete.pages;
    const { deliveryProofPath, receiptPath, staffAId, staffBId } =
      denialsComplete;

    await restoreDesktopViewports(adminPage, familyPage, sponsorAPage, sponsorBPage);
    await signOut(familyPage);
    await signOut(sponsorAPage);
    await signOut(sponsorBPage);
    await Promise.all([
      familyPage.close(),
      sponsorAPage.close(),
      sponsorBPage.close(),
    ]);

    const familyDelete = await browserJsonRequest(adminPage, "DELETE", `/api/families/${state.familyProfileId}`);
    expect(familyDelete.status).toBeLessThan(400);

    const receiptFileName = receiptPath.slice(receiptPath.lastIndexOf("/") + 1);
    const deliveryProofFileName = deliveryProofPath.slice(
      deliveryProofPath.lastIndexOf("/") + 1,
    );
    let evidenceFilesDeleted = 0;
    const receiptDelete = await browserJsonRequest(
      adminPage,
      "DELETE",
      `/api/order-evidence/receipts/${receiptFileName}`,
    );
    expect(receiptDelete.status).toBeLessThan(400);
    expect(responseRecord(receiptDelete.body).deleted).toBe(true);
    evidenceFilesDeleted += 1;
    const deliveryProofDelete = await browserJsonRequest(
      adminPage,
      "DELETE",
      `/api/order-evidence/deliveries/${deliveryProofFileName}`,
    );
    expect(deliveryProofDelete.status).toBeLessThan(400);
    expect(responseRecord(deliveryProofDelete.body).deleted).toBe(true);
    evidenceFilesDeleted += 1;

    for (const staffProfileId of [staffAId, staffBId]) {
      const staffDelete = await browserJsonRequest(adminPage, "DELETE", `/api/staff/${staffProfileId}`);
      expect(staffDelete.status).toBeLessThan(400);
    }
    for (const applicantId of [state.sponsorAApplicantId, state.sponsorBApplicantId]) {
      const applicantDelete = await browserJsonRequest(adminPage, "DELETE", `/api/applicants/${applicantId}`);
      expect(applicantDelete.status).toBeLessThan(400);
    }

    const encodedRunLabel = encodeURIComponent(runLabel);
    const applicationChecks = await Promise.all([
      browserJsonRequest(
        adminPage,
        "GET",
        `/api/families?search=${encodedRunLabel}&limit=100&offset=0`,
      ),
      browserJsonRequest(
        adminPage,
        "GET",
        `/api/sponsors?search=${encodedRunLabel}&limit=100&offset=0`,
      ),
      browserJsonRequest(
        adminPage,
        "GET",
        `/api/applicants?search=${encodedRunLabel}&limit=100&offset=0`,
      ),
      browserJsonRequest(
        adminPage,
        "GET",
        `/api/staff?search=${encodedRunLabel}&limit=100&offset=0`,
      ),
      browserJsonRequest(
        adminPage,
        "GET",
        `/api/orders?familyProfileId=${state.familyProfileId}&limit=100&offset=0`,
      ),
      browserJsonRequest(
        adminPage,
        "GET",
        `/api/contributions?familyProfileId=${state.familyProfileId}&limit=100&offset=0`,
      ),
    ]);
    expect(
      applicationChecks.every((result) => result.status === 200),
      "All supported cleanup verification queries must succeed",
    ).toBe(true);
    const applicationRowsRetained = applicationChecks.reduce(
      (count, result) => count + responseRows(result.body).length,
      0,
    );
    expect(applicationRowsRetained, "No API-visible runtime application rows may remain").toBe(0);

    const orphanEvidence = await browserJsonRequest(
      adminPage,
      "GET",
      "/api/order-evidence/maintenance/orphans",
    );
    expect(orphanEvidence.status).toBe(200);
    const evidenceFilesRetained = responseRows(orphanEvidence.body).filter(
      (candidate) =>
        candidate.path === receiptPath || candidate.path === deliveryProofPath,
    ).length;
    expect(evidenceFilesRetained, "No runtime order-evidence file may remain").toBe(0);

    const mailboxMessages = (
      await Promise.all([
        findMailboxMessages({ recipient: sponsorAEmail, since: runStartedAt }),
        findMailboxMessages({ recipient: sponsorBEmail, since: runStartedAt }),
      ])
    ).flat();
    const mailboxMessageIds = [...new Set(mailboxMessages.map((message) => message.ID))];
    await deleteMailboxMessages(mailboxMessageIds);
    const mailboxMessagesRetained = (
      await Promise.all([
        findMailboxMessages({ recipient: sponsorAEmail, since: runStartedAt }),
        findMailboxMessages({ recipient: sponsorBEmail, since: runStartedAt }),
      ])
    ).reduce((count, messages) => count + messages.length, 0);
    expect(mailboxMessagesRetained, "No exact-recipient runtime mailbox message may remain").toBe(0);

    cleanupSummary = {
      applicationRowsRetained,
      evidenceFilesRetained,
      mailboxMessagesRetained,
      evidenceFilesDeleted,
      mailboxMessagesDeleted: mailboxMessageIds.length,
      reporting: "counts-only",
      databaseOnlyGuarantees: "NOT VERIFIED",
    };

    await signOut(adminPage);
    await adminPage.close();
  });

  test("remote diagnostics - final context assertions", async () => {
    if (cleanupSummary) {
      expect(cleanupSummary.applicationRowsRetained).toBe(0);
      expect(cleanupSummary.evidenceFilesRetained).toBe(0);
      expect(cleanupSummary.mailboxMessagesRetained).toBe(0);
      expect(cleanupSummary.evidenceFilesDeleted).toBe(2);
      expect(Number.isSafeInteger(cleanupSummary.mailboxMessagesDeleted)).toBe(true);
      expect(cleanupSummary.mailboxMessagesDeleted).toBeGreaterThanOrEqual(0);
      expect(cleanupSummary.reporting).toBe("counts-only");
      expect(cleanupSummary.databaseOnlyGuarantees).toBe("NOT VERIFIED");
    }
    assertDiagnosticsClean("admin", adminDiagnostics);
    assertDiagnosticsClean("family", familyDiagnostics);
    assertDiagnosticsClean("sponsor-a", sponsorADiagnostics);
    assertDiagnosticsClean("sponsor-b", sponsorBDiagnostics);
  });
});
