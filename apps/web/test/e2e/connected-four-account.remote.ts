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

const runLabel = `vps-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
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

async function setEnglish(context: BrowserContext): Promise<void> {
  await context.addCookies([
    { name: "kafil-ui-language", value: "en", url: baseUrl },
  ]);
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
  const signOutButton = await onlyVisible(
    page.locator("button").filter({ has: page.locator("svg.lucide-log-out") }),
  );
  await expect.poll(
    () => signOutButton.evaluate((button) => {
      const propsKey = Object.keys(button).find((key) => key.startsWith("__reactProps$"));
      if (!propsKey) return false;
      const props = (button as unknown as Record<string, { onClick?: unknown }>)[propsKey];
      return typeof props?.onClick === "function";
    }),
  ).toBe(true);
  const logoutResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname === "/api/auth/logout",
  );
  await signOutButton.click();
  expect((await logoutResponse).status()).toBeLessThan(400);
  await expect.poll(() => new URL(page.url()).pathname).toBe("/login");
  await assertNoAuthCookies(page.context());
}

async function assertNoAuthCookies(context: BrowserContext): Promise<void> {
  const cookies = await context.cookies();
  expect(
    cookies.find((cookie) => /^(accessToken|refreshToken|najm\.session)$/i.test(cookie.name)),
  ).toBeUndefined();
}

async function browserJsonRequest(
  page: Page,
  method: "GET" | "POST",
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

async function expectExactNegativeResponse(
  page: Page,
  captured: Diagnostics,
  contract: { method: "GET" | "POST"; path: string; status: number },
  action: () => Promise<BrowserJsonResult>,
): Promise<BrowserJsonResult> {
  const expected = registerExpectedResponse(captured, contract);
  const responsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === contract.method &&
      new URL(response.url()).pathname === contract.path &&
      response.status() === contract.status,
  );
  const result = await action();
  await responsePromise;
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

async function findOtpMailboxMessages(input: {
  recipient: string;
  since: number;
  subjectKeyword: string;
  signal?: AbortSignal;
}): Promise<MailpitMessage[]> {
  const query = `to:${input.recipient} subject:"${input.subjectKeyword}"`;
  const search = await mailboxFetch(
    `/api/v1/search?query=${encodeURIComponent(query)}`,
    { signal: input.signal },
  );
  if (!search.ok) throw new Error("Authenticated Mailpit OTP search failed.");
  const payload = (await search.json()) as { messages?: MailpitMessageSummary[] };
  const matches: MailpitMessage[] = [];
  for (const summary of payload.messages ?? []) {
    if (new Date(summary.Created).getTime() < input.since - 1_000) continue;
    const detail = await mailboxFetch(`/api/v1/message/${summary.ID}`, {
      signal: input.signal,
    });
    if (!detail.ok) throw new Error("Authenticated Mailpit OTP detail read failed.");
    const message = (await detail.json()) as MailpitMessage;
    const exactRecipient = message.To.some(
      (destination) => destination.Address.toLowerCase() === input.recipient.toLowerCase(),
    );
    if (exactRecipient && message.Subject.includes(input.subjectKeyword)) matches.push(message);
  }
  return matches;
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

async function deleteMailboxMessage(messageId: string): Promise<void> {
  const response = await mailboxFetch("/api/v1/messages", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ IDs: [messageId] }),
  });
  expect(response.ok, "Mailpit batch delete must succeed").toBe(true);
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

  test("remote unit A - guarded admin smoke", async () => {
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

  test("remote unit B - Family creation and first login", async () => {
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

  test("remote unit C - Sponsor A application and approval", async () => {
    const expectedPhoneE164 = sponsorAPhone;
    const phoneLocal = expectedPhoneE164.replace(/^\+212/, "");
    const sponsorPage = await sponsorAContext.newPage();
    attachDiagnostics(sponsorPage, sponsorADiagnostics);

    // Prove the configured account has Unit C's exact admin capability before
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

  test("remote unit D - Sponsor B application and approval", async () => {
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

  test("remote unit E - assignments and sponsor privacy", async () => {
    expect(
      Boolean(
        state.familyProfileId &&
          state.sponsorAProfileId &&
          state.sponsorBProfileId,
      ),
      "remote Unit E requires the in-process identifiers produced by Units B-D",
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

    // Preserve the authenticated Admin context for dependent Unit F. The
    // combined journey otherwise consumes one login-rate-limit slot per unit
    // and the sixth short-window login is correctly rejected with 429.
    await adminPage.close();
  });

  test("remote unit F - contributions and exact funding", async () => {
    expect(
      Boolean(
        state.familyProfileId &&
          state.assignmentAId &&
          state.assignmentBId,
      ),
      "remote Unit F requires the in-process Family and assignment identifiers from Units B-E",
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
        name: "Next",
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

  test("remote diagnostics - final context assertions", async () => {
    assertDiagnosticsClean("admin", adminDiagnostics);
    assertDiagnosticsClean("family", familyDiagnostics);
    assertDiagnosticsClean("sponsor-a", sponsorADiagnostics);
    assertDiagnosticsClean("sponsor-b", sponsorBDiagnostics);
  });
});
