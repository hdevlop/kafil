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
const state: RemoteState = {
  familyProfileId: "",
  familyUserId: "",
  familyTemporaryCredential: "",
  sponsorAApplicantId: "",
  sponsorAProfileId: "",
  sponsorAUserId: "",
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
): Promise<BrowserJsonResult> {
  return page.evaluate(
    async ({ requestMethod, requestPath, rootUrl }) => {
      const response = await fetch(`${rootUrl}${requestPath}`, {
        method: requestMethod,
        credentials: "include",
      });
      return {
        status: response.status,
        body: await response.json().catch(() => null),
      };
    },
    { requestMethod: method, requestPath: path, rootUrl: baseUrl },
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
  const adminDiagnostics = makeDiagnostics();
  const familyDiagnostics = makeDiagnostics();
  const sponsorADiagnostics = makeDiagnostics();

  test.beforeAll(async ({ browser }) => {
    expect(adminEmail && adminPassword, "remote admin credentials must be present").toBeTruthy();
    adminContext = await newIsolatedContext(browser);
    familyContext = await newIsolatedContext(browser);
    sponsorAContext = await newIsolatedContext(browser);
  });

  test.afterAll(async () => {
    await Promise.allSettled([
      adminContext?.close(),
      familyContext?.close(),
      sponsorAContext?.close(),
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
    await adminPage
      .getByPlaceholder("Search applicant name...", { exact: true })
      .fill(sponsorAName);
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

  test("remote diagnostics - final context assertions", async () => {
    assertDiagnosticsClean("admin", adminDiagnostics);
    assertDiagnosticsClean("family", familyDiagnostics);
    assertDiagnosticsClean("sponsor-a", sponsorADiagnostics);
  });
});
