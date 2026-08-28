import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type Locator,
  type Page,
  type Response,
} from "@playwright/test";

import {
  CONNECTED_RUN_FIXTURE,
  buildRunCin,
  buildRunEmail,
  buildRunPhone,
  formatMadFromMinor,
} from "../../scripts/connected-four-account-fixtures";
import {
  handleConcurrentPromise,
  retryReadAfterConnectionReset,
} from "../../scripts/connected-four-account-remote-runtime";
import {
  describeRecognizedAuthCookies,
  recordAuthCookieWriters,
  type AuthCookieWriterEvent,
} from "./authCookieDiagnostics";

const baseUrl = process.env.KAFIL_E2E_BASE_URL ?? "";
const adminEmail = process.env.KAFIL_ADMIN_EMAIL ?? "";
const adminPassword = process.env.KAFIL_ADMIN_PASSWORD ?? "";
const mailboxApiUrl = process.env.KAFIL_E2E_MAILBOX_API_URL ?? "";
const mailboxApiUser = process.env.KAFIL_E2E_MAILBOX_USER ?? "";
const mailboxApiPassword = process.env.KAFIL_E2E_MAILBOX_PASSWORD ?? "";

if (baseUrl !== "https://kafala360.ma") {
  throw new Error("Remote auth acceptance requires the exact guarded demo origin.");
}
if (!mailboxApiUrl || !mailboxApiUser || !mailboxApiPassword) {
  throw new Error("Remote auth acceptance requires guarded Mailpit configuration.");
}

interface ExpectedResponse {
  method: string;
  path: string;
  status: number;
  consumed: number;
  required: boolean;
}

interface Diagnostics {
  pageErrors: string[];
  consoleErrors: string[];
  failedRequests: string[];
  badResponses: string[];
  expectedResponses: ExpectedResponse[];
  expectedConsoleErrors: Array<{ path: string; status: number; consumed: number }>;
}

interface BrowserJsonResult {
  status: number;
  body: unknown;
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

interface AuthState {
  familyProfileId: string;
  familyTemporaryCredential: string;
  sponsorApplicantId: string;
}

interface LogoutEvidence {
  alias: string;
  finalPath: string;
  protectedStatus: number;
  cookieWriters: AuthCookieWriterEvent[];
}

interface CleanupSummary {
  applicationRowsRetained: number;
  mailboxMessagesRetained: number;
  mailboxMessagesDeleted: number;
  reporting: "counts-only";
  databaseOnlyGuarantees: "NOT VERIFIED";
}

const runStartedAt = Date.now();
const runLabel = `auth-${runStartedAt.toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
const familyEmail = buildRunEmail(runLabel, "family");
const familyPhone = buildRunPhone(runLabel, "family");
const familyCin = buildRunCin(runLabel, "family");
const familyName = `Auth Family ${runLabel}`;
const familyAddress = `Auth acceptance address ${runLabel}`;
const familyPassword = `Kf${crypto.randomUUID().replaceAll("-", "").slice(0, 20)}9`;
const sponsorEmail = buildRunEmail(runLabel, "sponsorA");
const sponsorPhone = buildRunPhone(runLabel, "sponsorA");
const sponsorCin = buildRunCin(runLabel, "sponsorA");
const sponsorName = `Auth Sponsor ${runLabel}`;
const sponsorPassword = `Ks${crypto.randomUUID().replaceAll("-", "").slice(0, 20)}7`;
const state: AuthState = {
  familyProfileId: "",
  familyTemporaryCredential: "",
  sponsorApplicantId: "",
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
  return locator.nth(visibleIndex);
}

async function setEnglish(context: BrowserContext): Promise<void> {
  await context.addCookies([{ name: "kafil-ui-language", value: "en", url: baseUrl }]);
}

async function newContext(browser: Browser): Promise<BrowserContext> {
  const context = await browser.newContext();
  await setEnglish(context);
  return context;
}

async function expectNoAuthCookies(context: BrowserContext): Promise<void> {
  const cookies = await context.cookies();
  expect(describeRecognizedAuthCookies(cookies)).toEqual([]);
}

async function waitForLoginHydration(page: Page): Promise<Locator> {
  const identifier = page.getByLabel(/Email or phone/i);
  await expect(identifier).toBeVisible();
  await expect.poll(() =>
    page.locator("#login-form").evaluate((form) => {
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

async function submitLogin(
  page: Page,
  diagnostics?: Diagnostics,
  expectedStatus?: number,
): Promise<Response> {
  const expected =
    diagnostics && expectedStatus !== undefined && expectedStatus >= 400
      ? registerExpectedResponse(diagnostics, {
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
  const responsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname === "/api/auth/login",
  );
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  expect((await observedRequest).method(), "login must use hydrated Najm submit").toBe("POST");
  const response = await responsePromise;
  if (expectedStatus === undefined) expect(response.status()).toBeLessThan(400);
  else expect(response.status()).toBe(expectedStatus);
  if (expected) await expect.poll(() => expected.consumed).toBe(1);
  return response;
}

async function login(
  page: Page,
  identifier: string,
  password: string,
  expectedDashboardPath = "/dashboard",
): Promise<void> {
  await expectNoAuthCookies(page.context());
  await prepareLogin(page, identifier, password);
  await submitLogin(page);
  await expect.poll(() => new URL(page.url()).pathname).toBe(expectedDashboardPath);
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

async function expectProtectedDenied(
  page: Page,
  diagnostics: Diagnostics,
  path: string,
): Promise<number> {
  const expected = registerExpectedResponse(diagnostics, {
    method: "GET",
    path,
    status: 401,
  });
  const result = await browserJsonRequest(page, "GET", path);
  expect(result.status).toBe(401);
  await expect.poll(() => expected.consumed).toBe(1);
  return result.status;
}

async function logoutAndDeny(input: {
  alias: string;
  page: Page;
  diagnostics: Diagnostics;
  protectedPath: string;
  observedPages?: Page[];
  beforeClick?: () => Promise<(() => Promise<void>) | void>;
}): Promise<LogoutEvidence> {
  const {
    alias,
    page,
    diagnostics,
    protectedPath,
    observedPages = [],
    beforeClick,
  } = input;
  const signOutButton = await onlyVisible(
    page.locator("button").filter({ has: page.locator("svg.lucide-log-out") }),
  );
  await expect.poll(() =>
    signOutButton.evaluate((button) => {
      const propsKey = Object.keys(button).find((key) => key.startsWith("__reactProps$"));
      if (!propsKey) return false;
      const props = (button as unknown as Record<string, { onClick?: unknown }>)[propsKey];
      return typeof props?.onClick === "function";
    }),
  ).toBe(true);
  await signOutButton.click({ trial: true, timeout: 5_000 });

  const cookieWriterRecorder = recordAuthCookieWriters(page, ...observedPages);
  let stopped = false;
  try {
    const afterLogout = await beforeClick?.();
    const logoutResponse = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === "/api/auth/logout",
    );
    await signOutButton.click();
    expect((await logoutResponse).status()).toBe(200);
    await expect.poll(() => new URL(page.url()).pathname).toBe("/login");
    if (afterLogout) await afterLogout();
    const protectedStatus = await expectProtectedDenied(page, diagnostics, protectedPath);
    const cookieWriters = await cookieWriterRecorder.stop();
    stopped = true;
    const cookies = await page.context().cookies();
    const scopes = describeRecognizedAuthCookies(cookies);
    expect(
      scopes,
      `auth cookies remained; alias=${alias}; finalPath=/login; protectedStatus=${protectedStatus}; cookieWriters=${JSON.stringify(cookieWriters)}; scopes=${JSON.stringify(scopes)}`,
    ).toEqual([]);
    return { alias, finalPath: "/login", protectedStatus, cookieWriters };
  } finally {
    if (!stopped) await cookieWriterRecorder.stop();
  }
}

function responseRows(value: unknown): Array<Record<string, unknown>> {
  const record = responseRecord(value);
  const data = record.data;
  if (Array.isArray(data)) return data as Array<Record<string, unknown>>;
  if (data && typeof data === "object" && Array.isArray((data as { data?: unknown }).data)) {
    return (data as { data: Array<Record<string, unknown>> }).data;
  }
  return [];
}

function responseRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") return {};
  const record = value as Record<string, unknown>;
  return record.data && typeof record.data === "object"
    ? (record.data as Record<string, unknown>)
    : record;
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
}

function mailboxFetch(path: string, init: RequestInit = {}): Promise<globalThis.Response> {
  const headers = new Headers(init.headers);
  headers.set(
    "Authorization",
    `Basic ${Buffer.from(`${mailboxApiUser}:${mailboxApiPassword}`).toString("base64")}`,
  );
  const read = () => fetch(new URL(path, mailboxApiUrl), { ...init, headers });
  return (init.method ?? "GET").toUpperCase() === "GET"
    ? retryReadAfterConnectionReset(read)
    : read();
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
  const search = await mailboxFetch(`/api/v1/search?query=${encodeURIComponent(query)}`, {
    signal: input.signal,
  });
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

async function pollExactlyOneOtpMessage(input: {
  recipient: string;
  since: number;
  subjectKeyword: string;
  signal: AbortSignal;
}): Promise<MailpitMessage> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (input.signal.aborted) throw new Error("Mailpit OTP polling was cancelled.");
    const matches = await findMailboxMessages(input);
    if (matches.length > 1) throw new Error("Mailpit returned multiple matching OTP messages.");
    if (matches.length === 1) return matches[0]!;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Mailpit did not return exactly one matching OTP message in time.");
}

function extractOtp(message: MailpitMessage): string {
  const content = `${message.Body ?? ""} ${message.HTML ?? ""} ${message.Snippet ?? ""}`;
  const match = content.match(/\b(\d{6})\b/);
  if (!match) throw new Error("Matching Mailpit message did not contain a six-digit OTP.");
  return match[1]!;
}

async function deleteMailboxMessages(messageIds: string[]): Promise<void> {
  if (messageIds.length === 0) return;
  const response = await mailboxFetch("/api/v1/messages", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ IDs: messageIds }),
  });
  expect(response.ok).toBe(true);
}

function assertDiagnosticsClean(alias: string, diagnostics: Diagnostics): void {
  expect(diagnostics.pageErrors, `${alias} page errors`).toEqual([]);
  expect(diagnostics.consoleErrors, `${alias} console errors`).toEqual([]);
  expect(diagnostics.failedRequests, `${alias} failed requests`).toEqual([]);
  expect(diagnostics.badResponses, `${alias} unexplained responses`).toEqual([]);
  for (const expected of diagnostics.expectedResponses) {
    if (expected.required) expect(expected.consumed, `${alias} expected response`).toBe(1);
  }
  for (const expected of diagnostics.expectedConsoleErrors) {
    expect(expected.consumed, `${alias} expected console response`).toBeLessThanOrEqual(1);
  }
}

test.describe.serial("remote auth lifecycle", () => {
  let adminContext: BrowserContext;
  let adminPage: Page;
  const contexts: BrowserContext[] = [];
  const diagnostics = new Map<string, Diagnostics>();
  const logoutEvidence: LogoutEvidence[] = [];
  let cleanupSummary: CleanupSummary | undefined;

  const trackedPage = async (
    browser: Browser,
    alias: string,
  ): Promise<{ context: BrowserContext; page: Page; captured: Diagnostics }> => {
    const context = await newContext(browser);
    contexts.push(context);
    const page = await context.newPage();
    const captured = makeDiagnostics();
    diagnostics.set(alias, captured);
    attachDiagnostics(page, captured);
    return { context, page, captured };
  };

  test.beforeAll(async ({ browser }) => {
    expect(adminEmail && adminPassword, "remote admin credentials must be present").toBeTruthy();
    const admin = await trackedPage(browser, "admin");
    adminContext = admin.context;
    adminPage = admin.page;
  });

  test.afterAll(async () => {
    await Promise.allSettled(contexts.map((context) => context.close()));
  });

  test("remote auth 01 - guarded setup and Admin lifecycle", async () => {
    await login(adminPage, adminEmail, adminPassword);
    const identity = await browserJsonRequest(adminPage, "GET", "/api/auth/me");
    expect(identity.status).toBe(200);
    expect(responseRecord(identity.body).role).toBe("admin");
    logoutEvidence.push(
      await logoutAndDeny({
        alias: "admin",
        page: adminPage,
        diagnostics: diagnostics.get("admin")!,
        protectedPath: "/api/auth/me",
      }),
    );
    await login(adminPage, adminEmail, adminPassword);
    expect((await browserJsonRequest(adminPage, "GET", "/api/auth/me")).status).toBe(200);
  });

  test("remote auth 02 - Family first-login and lifecycle", async ({ browser }) => {
    const familiesResponse = adminPage.waitForResponse((response) => {
      const url = new URL(response.url());
      return response.request().method() === "GET" && url.pathname === "/api/families";
    });
    await adminPage.goto("/family", { waitUntil: "commit" });
    expect((await familiesResponse).status()).toBeLessThan(400);
    const createFamily = await onlyVisible(
      adminPage.getByRole("button", { name: "Create family", exact: true }),
    );
    await createFamily.click({ trial: true, timeout: 5_000 });
    await createFamily.click();
    const dialog = adminPage.getByRole("dialog", { name: "Create family account", exact: true });
    await dialog.getByLabel(/^Guardian name\s*\*?$/).fill(familyName);
    await dialog.getByLabel(/CIN/i).fill(familyCin);
    await dialog.getByLabel(/^Email\s*\*?$/).fill(familyEmail);
    await selectDate(adminPage, dialog, "1985-04-12");
    await dialog.getByLabel(/^Household phone\s*\*?$/).fill(familyPhone);
    await dialog.getByRole("button", { name: "Next", exact: true }).click();
    await dialog
      .getByRole("combobox", { name: "Choose a housing situation", exact: true })
      .click();
    await adminPage.getByRole("option", { name: "Rented", exact: true }).click();
    await dialog
      .getByLabel(/^Activation target \(MAD\)\s*\*?$/)
      .fill(formatMadFromMinor(CONNECTED_RUN_FIXTURE.fundingTargetMinor));
    await dialog.getByPlaceholder("Full household address", { exact: true }).fill(familyAddress);
    await dialog.getByRole("button", { name: "Next", exact: true }).click();
    const createResponse = adminPage.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === "/api/families",
    );
    await dialog.getByRole("button", { name: "Create family account", exact: true }).click();
    expect((await createResponse).status()).toBeLessThan(400);
    const credentials = dialog.getByTestId("credentials-card-field");
    state.familyTemporaryCredential =
      (await credentials.nth(1).locator("dd").textContent())?.trim() ?? "";
    expect(state.familyTemporaryCredential.length).toBeGreaterThan(0);
    await dialog.getByRole("button", { name: "Done", exact: true }).click();

    const familyList = await browserJsonRequest(
      adminPage,
      "GET",
      `/api/families?search=${encodeURIComponent(familyEmail)}&limit=10&offset=0`,
    );
    const matches = responseRows(familyList.body).filter((row) => row.email === familyEmail);
    expect(matches).toHaveLength(1);
    state.familyProfileId = typeof matches[0]?.id === "string" ? matches[0].id : "";
    expect(state.familyProfileId).not.toBe("");

    const family = await trackedPage(browser, "family");
    await expectNoAuthCookies(family.context);
    await prepareLogin(family.page, familyEmail, state.familyTemporaryCredential);
    await submitLogin(family.page);
    await expect.poll(() => new URL(family.page.url()).pathname).toBe("/change-password");
    await expectNoAuthCookies(family.context);
    await family.page.getByRole("textbox", { name: "New password *", exact: true }).fill(familyPassword);
    await family.page
      .getByRole("textbox", { name: "Repeat the new password *", exact: true })
      .fill(familyPassword);
    const passwordResponse = family.page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === "/api/auth/credential-setup/change",
    );
    await family.page.getByRole("button", { name: "Save my password", exact: true }).click();
    expect((await passwordResponse).status()).toBeLessThan(400);
    await expect.poll(() => new URL(family.page.url()).pathname).toBe("/login");
    await prepareLogin(family.page, familyEmail, state.familyTemporaryCredential);
    await submitLogin(family.page, family.captured, 401);
    await expectNoAuthCookies(family.context);
    await login(family.page, familyEmail, familyPassword);
    expect((await browserJsonRequest(family.page, "GET", "/api/families/me")).status).toBe(200);
    logoutEvidence.push(
      await logoutAndDeny({
        alias: "family",
        page: family.page,
        diagnostics: family.captured,
        protectedPath: "/api/families/me",
      }),
    );
    await login(family.page, familyEmail, familyPassword);
    expect((await browserJsonRequest(family.page, "GET", "/api/families/me")).status).toBe(200);
    await family.context.close();
  });

  test("remote auth 03 - Sponsor email lifecycle", async ({ browser }) => {
    const sponsorSetup = await trackedPage(browser, "sponsor-setup-email");
    await expectNoAuthCookies(sponsorSetup.context);
    await sponsorSetup.page.goto("/apply", { waitUntil: "commit" });
    const form = sponsorSetup.page.locator("#applicant-application-form");
    await expect(form).toBeVisible();
    await expect.poll(() =>
      form.evaluate((element) => {
        const propsKey = Object.keys(element).find((key) => key.startsWith("__reactProps$"));
        if (!propsKey) return false;
        const props = (element as unknown as Record<string, { onSubmit?: unknown }>)[propsKey];
        return typeof props?.onSubmit === "function";
      }),
    ).toBe(true);
    await sponsorSetup.page.getByRole("textbox", { name: "Full name *" }).fill(sponsorName);
    await sponsorSetup.page.getByRole("textbox", { name: "Email address *" }).fill(sponsorEmail);
    const phone = sponsorSetup.page.getByPlaceholder("For example: +212 6 12 34 56 78", {
      exact: true,
    });
    await phone.click();
    await phone.press("End");
    await sponsorSetup.page.keyboard.type(sponsorPhone.replace(/^\+212/, ""));
    await sponsorSetup.page.getByPlaceholder("For example: AB123456", { exact: true }).fill(sponsorCin);
    await sponsorSetup.page.getByRole("textbox", { name: "Password *" }).fill(sponsorPassword);

    const otpStartedAt = Date.now();
    const otpSubject = "Verify your Kafil sponsor application";
    const otpAbort = new AbortController();
    const otpPromise = handleConcurrentPromise(
      pollExactlyOneOtpMessage({
        recipient: sponsorEmail,
        since: otpStartedAt,
        subjectKeyword: otpSubject,
        signal: otpAbort.signal,
      }),
    );
    let otpMessage: MailpitMessage;
    try {
      const submitResponse = sponsorSetup.page.waitForResponse(
        (response) =>
          response.request().method() === "POST" &&
          new URL(response.url()).pathname === "/api/applicants",
      );
      await sponsorSetup.page.getByRole("button", { name: "Submit application", exact: true }).click();
      expect((await submitResponse).status()).toBeLessThan(400);
      otpMessage = await otpPromise;
    } catch (error) {
      otpAbort.abort();
      await otpPromise.catch(() => undefined);
      throw error;
    }
    const otpGroup = sponsorSetup.page.getByRole("group", { name: "One-time code" });
    await otpGroup.locator("input").first().click();
    await sponsorSetup.page.keyboard.type(extractOtp(otpMessage));
    const confirmResponse = sponsorSetup.page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === "/api/applicants/email-verification/confirm",
    );
    await sponsorSetup.page.getByRole("button", { name: "Verify email", exact: true }).click();
    expect((await confirmResponse).status()).toBeLessThan(400);
    await deleteMailboxMessages([otpMessage.ID]);

    await prepareLogin(sponsorSetup.page, sponsorEmail, sponsorPassword);
    await submitLogin(sponsorSetup.page, sponsorSetup.captured, 403);
    await expectNoAuthCookies(sponsorSetup.context);

    const applicants = await browserJsonRequest(
      adminPage,
      "GET",
      `/api/applicants?search=${encodeURIComponent(sponsorName)}&limit=10&offset=0`,
    );
    const applicantMatches = responseRows(applicants.body).filter(
      (row) => row.email === sponsorEmail,
    );
    expect(applicantMatches).toHaveLength(1);
    state.sponsorApplicantId =
      typeof applicantMatches[0]?.id === "string" ? applicantMatches[0].id : "";
    expect(state.sponsorApplicantId).not.toBe("");
    const approval = await browserJsonRequest(
      adminPage,
      "POST",
      `/api/applicants/${state.sponsorApplicantId}/approve`,
    );
    expect(approval.status).toBe(200);
    const replayExpected = registerExpectedResponse(diagnostics.get("admin")!, {
      method: "POST",
      path: `/api/applicants/${state.sponsorApplicantId}/approve`,
      status: 409,
    });
    const replay = await browserJsonRequest(
      adminPage,
      "POST",
      `/api/applicants/${state.sponsorApplicantId}/approve`,
    );
    expect(replay.status).toBe(409);
    await expect.poll(() => replayExpected.consumed).toBe(1);

    await login(sponsorSetup.page, sponsorEmail, sponsorPassword);
    expect(
      (await browserJsonRequest(sponsorSetup.page, "GET", "/api/sponsors/me/profile")).status,
    ).toBe(200);
    logoutEvidence.push(
      await logoutAndDeny({
        alias: "sponsor-email",
        page: sponsorSetup.page,
        diagnostics: sponsorSetup.captured,
        protectedPath: "/api/sponsors/me/profile",
      }),
    );
    await sponsorSetup.context.close();
  });

  test("remote auth 04 - Sponsor phone lifecycle", async ({ browser }) => {
    const sponsor = await trackedPage(browser, "sponsor-phone");
    await login(sponsor.page, sponsorPhone, sponsorPassword);
    expect((await browserJsonRequest(sponsor.page, "GET", "/api/sponsors/me/profile")).status).toBe(200);
    logoutEvidence.push(
      await logoutAndDeny({
        alias: "sponsor-phone",
        page: sponsor.page,
        diagnostics: sponsor.captured,
        protectedPath: "/api/sponsors/me/profile",
      }),
    );
    await sponsor.context.close();
  });

  test("remote auth 05 - Sponsor same-context email-phone sequence", async ({ browser }) => {
    const sponsor = await trackedPage(browser, "sponsor-same-context");
    await login(sponsor.page, sponsorEmail, sponsorPassword);
    logoutEvidence.push(
      await logoutAndDeny({
        alias: "sponsor-sequence-email",
        page: sponsor.page,
        diagnostics: sponsor.captured,
        protectedPath: "/api/sponsors/me/profile",
      }),
    );
    await login(sponsor.page, sponsorPhone, sponsorPassword);
    logoutEvidence.push(
      await logoutAndDeny({
        alias: "sponsor-sequence-phone",
        page: sponsor.page,
        diagnostics: sponsor.captured,
        protectedPath: "/api/sponsors/me/profile",
      }),
    );
    await sponsor.context.close();
  });

  test("remote auth 06 - cross-tab logout propagation", async ({ browser }) => {
    const sponsor = await trackedPage(browser, "sponsor-cross-tab");
    await login(sponsor.page, sponsorEmail, sponsorPassword);
    const secondPage = await sponsor.context.newPage();
    attachDiagnostics(secondPage, sponsor.captured);
    await secondPage.goto("/dashboard", { waitUntil: "commit" });
    await expect.poll(() => new URL(secondPage.url()).pathname).toBe("/dashboard");
    expect((await browserJsonRequest(secondPage, "GET", "/api/sponsors/me/profile")).status).toBe(200);
    logoutEvidence.push(
      await logoutAndDeny({
        alias: "sponsor-cross-tab",
        page: sponsor.page,
        diagnostics: sponsor.captured,
        protectedPath: "/api/sponsors/me/profile",
      }),
    );
    await expect.poll(() => new URL(secondPage.url()).pathname).toBe("/login");
    await expectProtectedDenied(secondPage, sponsor.captured, "/api/sponsors/me/profile");
    await expectNoAuthCookies(sponsor.context);
    await sponsor.context.close();
  });

  test("remote auth 07 - in-flight protected response logout overlap", async ({ browser }) => {
    const sponsor = await trackedPage(browser, "sponsor-overlap");
    await login(sponsor.page, sponsorEmail, sponsorPassword);
    const protectedPage = await sponsor.context.newPage();
    attachDiagnostics(protectedPage, sponsor.captured);
    await protectedPage.goto("/dashboard", { waitUntil: "commit" });
    await expect.poll(() => new URL(protectedPage.url()).pathname).toBe("/dashboard");
    const evidence = await logoutAndDeny({
      alias: "sponsor-overlap",
      page: sponsor.page,
      diagnostics: sponsor.captured,
      protectedPath: "/api/sponsors/me/profile",
      observedPages: [protectedPage],
      beforeClick: async () => {
        const requestStarted = protectedPage.waitForRequest(
          (request) =>
            request.method() === "GET" && new URL(request.url()).pathname === "/sponsor",
        );
        const protectedFetch = handleConcurrentPromise(
          protectedPage.evaluate(async (rootUrl) => {
            const response = await fetch(`${rootUrl}/sponsor`, { credentials: "include" });
            await response.text();
          }, baseUrl),
        );
        await requestStarted;
        return async () => {
          await protectedFetch;
        };
      },
    });
    const deletionOrder = evidence.cookieWriters.find(
      (event) => event.sessionAction === "delete" && event.path === "/api/auth/logout",
    )?.order;
    expect(deletionOrder).toBeDefined();
    expect(
      evidence.cookieWriters.some(
        (event) =>
          event.sessionAction === "set" &&
          deletionOrder !== undefined &&
          event.order > deletionOrder,
      ),
    ).toBe(false);
    logoutEvidence.push(evidence);
    await sponsor.context.close();
  });

  test("remote auth 08 - stale session without refresh is denied and cleared", async ({ browser }) => {
    const sponsor = await trackedPage(browser, "sponsor-stale-boundary");
    await login(sponsor.page, sponsorEmail, sponsorPassword);
    logoutEvidence.push(
      await logoutAndDeny({
        alias: "sponsor-stale-boundary",
        page: sponsor.page,
        diagnostics: sponsor.captured,
        protectedPath: "/api/sponsors/me/profile",
      }),
    );
    await sponsor.page.goto("/sponsor", { waitUntil: "commit" });
    await expect.poll(() => new URL(sponsor.page.url()).pathname).toBe("/login");
    await expectNoAuthCookies(sponsor.context);
    await sponsor.context.close();
  });

  test("remote auth 09 - supported cleanup and closure", async () => {
    const familyDelete = await browserJsonRequest(
      adminPage,
      "DELETE",
      `/api/families/${state.familyProfileId}`,
    );
    expect(familyDelete.status).toBeLessThan(400);
    const applicantDelete = await browserJsonRequest(
      adminPage,
      "DELETE",
      `/api/applicants/${state.sponsorApplicantId}`,
    );
    expect(applicantDelete.status).toBeLessThan(400);

    const encodedRunLabel = encodeURIComponent(runLabel);
    const applicationChecks = await Promise.all([
      browserJsonRequest(adminPage, "GET", `/api/families?search=${encodedRunLabel}&limit=10&offset=0`),
      browserJsonRequest(adminPage, "GET", `/api/sponsors?search=${encodedRunLabel}&limit=10&offset=0`),
      browserJsonRequest(adminPage, "GET", `/api/applicants?search=${encodedRunLabel}&limit=10&offset=0`),
    ]);
    expect(applicationChecks.every((result) => result.status === 200)).toBe(true);
    const applicationRowsRetained = applicationChecks.reduce(
      (count, result) => count + responseRows(result.body).length,
      0,
    );
    expect(applicationRowsRetained).toBe(0);

    const messages = await findMailboxMessages({ recipient: sponsorEmail, since: runStartedAt });
    const messageIds = [...new Set(messages.map((message) => message.ID))];
    await deleteMailboxMessages(messageIds);
    const mailboxMessagesRetained = (
      await findMailboxMessages({ recipient: sponsorEmail, since: runStartedAt })
    ).length;
    expect(mailboxMessagesRetained).toBe(0);
    cleanupSummary = {
      applicationRowsRetained,
      mailboxMessagesRetained,
      mailboxMessagesDeleted: messageIds.length,
      reporting: "counts-only",
      databaseOnlyGuarantees: "NOT VERIFIED",
    };

    logoutEvidence.push(
      await logoutAndDeny({
        alias: "admin-cleanup",
        page: adminPage,
        diagnostics: diagnostics.get("admin")!,
        protectedPath: "/api/auth/me",
      }),
    );
    await adminContext.close();
  });

  test("remote auth diagnostics - final context and cookie-writer assertions", async () => {
    expect(cleanupSummary).toBeDefined();
    expect(cleanupSummary?.applicationRowsRetained).toBe(0);
    expect(cleanupSummary?.mailboxMessagesRetained).toBe(0);
    expect(Number.isSafeInteger(cleanupSummary?.mailboxMessagesDeleted)).toBe(true);
    expect(cleanupSummary?.reporting).toBe("counts-only");
    expect(cleanupSummary?.databaseOnlyGuarantees).toBe("NOT VERIFIED");
    expect(logoutEvidence.length).toBeGreaterThanOrEqual(9);
    for (const evidence of logoutEvidence) {
      expect(evidence.finalPath).toBe("/login");
      expect(evidence.protectedStatus).toBe(401);
      const deletionOrder = evidence.cookieWriters.find(
        (event) => event.path === "/api/auth/logout" && event.sessionAction === "delete",
      )?.order;
      expect(deletionOrder, `${evidence.alias} logout must delete the session cookie`).toBeDefined();
      expect(
        evidence.cookieWriters.some(
          (event) =>
            event.sessionAction === "set" &&
            deletionOrder !== undefined &&
            event.order > deletionOrder,
        ),
        `${evidence.alias} must have no late session writer`,
      ).toBe(false);
    }
    for (const [alias, captured] of diagnostics) assertDiagnosticsClean(alias, captured);
  });
});
