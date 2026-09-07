import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type Locator,
  type Page,
} from "@playwright/test";

import {
  buildRunCin,
  buildRunEmail,
  buildRunPhone,
} from "../../scripts/connected-four-account-fixtures";
import {
  handleConcurrentPromise,
  retryReadAfterConnectionReset,
} from "../../scripts/connected-four-account-remote-runtime";

const baseUrl = process.env.KAFIL_E2E_BASE_URL ?? "";
const adminEmail = process.env.KAFIL_ADMIN_EMAIL ?? "";
const adminPassword = process.env.KAFIL_ADMIN_PASSWORD ?? "";
const mailboxApiUrl = process.env.KAFIL_E2E_MAILBOX_API_URL ?? "";
const mailboxApiToken = process.env.KAFIL_E2E_MAILBOX_TOKEN ?? "";

const NOTIFICATION_POLL_DEADLINE_MS = 30_000;
const NOTIFICATION_POLL_INTERVAL_MS = 500;
const MAILBOX_POLL_ATTEMPTS = 120;
const MAILBOX_POLL_INTERVAL_MS = 500;

if (baseUrl !== "https://kafala360.ma") {
  throw new Error("Remote notification acceptance requires the guarded demo origin.");
}
if (!mailboxApiUrl || !mailboxApiToken) {
  throw new Error("Remote notification acceptance requires the guarded mail-test gateway.");
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

interface NotificationRow {
  id: string;
  topic: string;
  aggregateType: string;
  aggregateId: string;
  locale: string;
  payload: Record<string, string | number | boolean | null>;
  readAt: string | null;
  createdAt: string;
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
  Headers?: unknown;
}

interface CleanupSummary {
  applicationRowsRetained: number;
  mailboxMessagesRetained: number;
  mailboxMessagesDeleted: number;
  pushSubscriptionsRetained: number;
  reporting: "counts-only";
  databaseOnlyGuarantees: "NOT VERIFIED";
}

interface RemoteState {
  familyProfileId: string;
  sponsorAProfileId: string;
  sponsorBProfileId: string;
  assignmentAId: string;
  validatedContributionId: string;
  laterContributionId: string;
  sponsorAValidatedNotificationId: string;
  sponsorALaterNotificationId: string;
  applicantId: string;
  applicantProfileId: string;
}

const runStartedAt = Date.now();
const runLabel = `notifications-${runStartedAt.toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
const familyName = `Notifications Family ${runLabel}`;
const familyEmail = buildRunEmail(runLabel, "family");
const familyPhone = buildRunPhone(runLabel, "family");
const familyCin = buildRunCin(runLabel, "family");
const familyPassword = `Nf${crypto.randomUUID().replaceAll("-", "").slice(0, 20)}9`;
const sponsorAName = `Notifications Sponsor A ${runLabel}`;
const sponsorAEmail = buildRunEmail(runLabel, "sponsorA");
const sponsorAPhone = buildRunPhone(runLabel, "sponsorA");
const sponsorACin = buildRunCin(runLabel, "sponsorA");
const sponsorAPassword = `Na${crypto.randomUUID().replaceAll("-", "").slice(0, 20)}7`;
const sponsorBName = `Notifications Sponsor B ${runLabel}`;
const sponsorBEmail = buildRunEmail(runLabel, "sponsorB");
const sponsorBPhone = buildRunPhone(runLabel, "sponsorB");
const sponsorBCin = buildRunCin(runLabel, "sponsorB");
const sponsorBPassword = `Nb${crypto.randomUUID().replaceAll("-", "").slice(0, 20)}8`;
const applicantName = `Notification <Proof> ${runLabel}`;
const applicantEmail = buildRunEmail(`${runLabel}-decision`, "sponsorA");
const applicantPhone = buildRunPhone(`${runLabel}-decision`, "sponsorA");
const applicantCin = buildRunCin(`${runLabel}-decision`, "sponsorA");
const applicantPassword = `Nc${crypto.randomUUID().replaceAll("-", "").slice(0, 20)}6`;

const state: RemoteState = {
  familyProfileId: "",
  sponsorAProfileId: "",
  sponsorBProfileId: "",
  assignmentAId: "",
  validatedContributionId: "",
  laterContributionId: "",
  sponsorAValidatedNotificationId: "",
  sponsorALaterNotificationId: "",
  applicantId: "",
  applicantProfileId: "",
};

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

function valueFreePath(path: string): string {
  return path.replace(
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi,
    ":id",
  );
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
    captured.failedRequests.push(
      `${request.method()} ${valueFreePath(new URL(request.url()).pathname)}`,
    );
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
    captured.badResponses.push(
      `${method} ${valueFreePath(path)} ${response.status()}`,
    );
  });
}

function assertDiagnosticsClean(alias: string, captured: Diagnostics): void {
  expect(captured.pageErrors, `${alias} page errors`).toEqual([]);
  expect(captured.consoleErrors, `${alias} console errors`).toEqual([]);
  expect(captured.failedRequests, `${alias} failed requests`).toEqual([]);
  expect(captured.badResponses, `${alias} unexplained HTTP errors`).toEqual([]);
  for (const expected of captured.expectedResponses) {
    if (expected.required) {
      expect(expected.consumed, `${alias} exact response count`).toBe(1);
    } else {
      expect(expected.consumed, `${alias} optional response count`).toBeLessThanOrEqual(1);
    }
  }
  for (const expected of captured.expectedConsoleErrors) {
    expect(expected.consumed, `${alias} console allowance count`).toBeLessThanOrEqual(1);
  }
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

async function waitForFormHydration(page: Page, formId: string): Promise<Locator> {
  const form = page.locator(`#${formId}`);
  await expect(form).toBeVisible();
  await expect.poll(() => form.evaluate((element) => {
    const propsKey = Object.keys(element).find((key) => key.startsWith("__reactProps$"));
    if (!propsKey) return false;
    const props = (element as unknown as Record<string, { onSubmit?: unknown }>)[propsKey];
    return typeof props?.onSubmit === "function";
  })).toBe(true);
  return form;
}

async function waitForLoginHydration(page: Page): Promise<Locator> {
  await waitForFormHydration(page, "login-form");
  const identifier = page.getByLabel(/Email or phone/i);
  await expect(identifier).toBeVisible();
  return identifier;
}

async function login(page: Page, identifier: string, password: string): Promise<void> {
  await page.goto("/login", { waitUntil: "commit" });
  expect(new URL(page.url()).pathname).toBe("/login");
  await (await waitForLoginHydration(page)).fill(identifier);
  await page.getByPlaceholder(/Enter your password/i).fill(password);
  const loginResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname === "/api/auth/login",
  );
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  expect((await loginResponse).status()).toBeLessThan(400);
  await expect.poll(() => new URL(page.url()).pathname).toBe("/dashboard");
}

async function assertNoAuthCookies(context: BrowserContext): Promise<void> {
  const names = (await context.cookies())
    .map((cookie) => cookie.name)
    .filter((name) => ["accessToken", "refreshToken", "najm.session"].includes(name));
  expect(names).toEqual([]);
}

async function browserJsonRequest(
  page: Page,
  method: "DELETE" | "GET" | "PATCH" | "POST" | "PUT",
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

function responseData(value: unknown): unknown {
  if (typeof value !== "object" || value === null || !("data" in value)) return value;
  return (value as { data: unknown }).data;
}

function responseRecord(value: unknown): Record<string, unknown> {
  const data = responseData(value);
  return typeof data === "object" && data !== null && !Array.isArray(data)
    ? (data as Record<string, unknown>)
    : {};
}

function responseRows(value: unknown): Array<Record<string, unknown>> {
  const data = responseData(value);
  if (!Array.isArray(data)) return [];
  return data.filter(
    (row): row is Record<string, unknown> => typeof row === "object" && row !== null,
  );
}

function responseId(value: unknown): string {
  const record = responseRecord(value);
  return typeof record.id === "string" ? record.id : "";
}

async function expectExactNegativeResponse(
  page: Page,
  captured: Diagnostics,
  contract: { method: "DELETE" | "GET" | "PATCH" | "POST"; path: string; status: number },
  action: () => Promise<BrowserJsonResult>,
): Promise<BrowserJsonResult> {
  const expected = registerExpectedResponse(captured, contract);
  const responsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === contract.method &&
      new URL(response.url()).pathname === contract.path,
  );
  const resultPromise = action();
  const [result, response] = await Promise.all([resultPromise, responsePromise]);
  expect(response.status()).toBe(contract.status);
  expect(result.status).toBe(contract.status);
  await expect.poll(() => expected.consumed).toBe(1);
  return result;
}

async function signOutAndDeny(
  page: Page,
  captured: Diagnostics,
  protectedPath: string,
): Promise<void> {
  const signOutButton = await onlyVisible(
    page.locator("button").filter({ has: page.locator("svg.lucide-log-out") }),
  );
  await signOutButton.click({ trial: true, timeout: 5_000 });
  const logoutResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname === "/api/auth/logout",
  );
  await signOutButton.click();
  expect((await logoutResponse).status()).toBeLessThan(400);
  await expect.poll(() => new URL(page.url()).pathname).toBe("/login");
  await assertNoAuthCookies(page.context());
  await expectExactNegativeResponse(
    page,
    captured,
    { method: "GET", path: protectedPath, status: 401 },
    () => browserJsonRequest(page, "GET", protectedPath),
  );
}

async function readNotifications(page: Page, query = ""): Promise<NotificationRow[]> {
  const result = await browserJsonRequest(page, "GET", `/api/notifications${query}`);
  expect(result.status).toBe(200);
  const rows = responseRecord(result.body).rows;
  if (!Array.isArray(rows)) return [];
  return rows.filter(
    (row): row is NotificationRow =>
      typeof row === "object" &&
      row !== null &&
      typeof (row as { id?: unknown }).id === "string",
  );
}

async function readUnreadCount(page: Page): Promise<number> {
  const result = await browserJsonRequest(
    page,
    "GET",
    "/api/notifications/unread-count",
  );
  expect(result.status).toBe(200);
  const count = Number(responseRecord(result.body).count);
  expect(Number.isSafeInteger(count)).toBe(true);
  return count;
}

async function pollNotificationState<T>(read: () => Promise<T>, accept: (value: T) => boolean): Promise<T> {
  const deadline = Date.now() + NOTIFICATION_POLL_DEADLINE_MS;
  let last = await read();
  while (!accept(last) && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, NOTIFICATION_POLL_INTERVAL_MS));
    last = await read();
  }
  expect(accept(last), "notification worker state must converge within 30 seconds").toBe(true);
  return last;
}

function mailboxFetch(path: string, init: RequestInit = {}): Promise<globalThis.Response> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${mailboxApiToken}`);
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

async function pollExactlyOneMailboxMessage(input: {
  recipient: string;
  since: number;
  subjectKeyword: string;
  signal: AbortSignal;
}): Promise<MailpitMessage> {
  for (let attempt = 0; attempt < MAILBOX_POLL_ATTEMPTS; attempt += 1) {
    if (input.signal.aborted) throw new Error("Mailbox polling was cancelled.");
    const matches = await findMailboxMessages(input);
    if (matches.length > 1) {
      throw new Error("Mailpit returned more than one exact matching message.");
    }
    if (matches.length === 1) return matches[0]!;
    await new Promise((resolve) => setTimeout(resolve, MAILBOX_POLL_INTERVAL_MS));
  }
  throw new Error("Mailpit did not return exactly one matching message in time.");
}

function extractOtp(message: MailpitMessage): string {
  const content = `${message.Body ?? ""} ${message.HTML ?? ""} ${message.Snippet ?? ""}`;
  const match = content.match(/\b(\d{6})\b/);
  if (!match) throw new Error("The exact Mailpit message did not contain a six-digit OTP.");
  return match[1]!;
}

function extractResetLink(message: MailpitMessage): string {
  const content = `${message.Body ?? ""} ${message.HTML ?? ""} ${message.Snippet ?? ""}`;
  const match = content.match(/https?:\/\/[^\s"<>]+\/reset-password\?[^\s"<>]+/i);
  if (!match) throw new Error("The exact invitation message did not contain a reset link.");
  const parsed = new URL(match[0]!.replaceAll("&amp;", "&"));
  expect(parsed.origin).toBe(baseUrl);
  expect(parsed.pathname).toBe("/reset-password");
  return parsed.toString();
}

async function deleteMailboxMessages(messageIds: string[]): Promise<void> {
  if (messageIds.length === 0) return;
  const response = await mailboxFetch("/api/v1/messages", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ IDs: [...new Set(messageIds)] }),
  });
  expect(response.ok, "Exact Mailpit message deletion must succeed").toBe(true);
}

async function acceptSponsorInvitation(
  page: Page,
  email: string,
  password: string,
  invitation: MailpitMessage,
): Promise<void> {
  await page.goto(extractResetLink(invitation), { waitUntil: "commit" });
  await waitForFormHydration(page, "reset-password-form");
  await page.getByPlaceholder("At least 8 characters", { exact: true }).fill(password);
  await page.getByPlaceholder("Repeat the new password", { exact: true }).fill(password);
  const resetOutcomePromise = page.waitForResponse(
    (response) => {
      const requestPath = new URL(response.url()).pathname;
      return (
        (response.request().method() === "POST" &&
          requestPath === "/api/auth/reset-password") ||
        (response.request().isNavigationRequest() &&
          response.request().method() === "GET" &&
          requestPath === "/reset-password")
      );
    },
    { timeout: 15_000 },
  );
  const savePassword = page.getByRole("button", { name: "Save password", exact: true });
  await savePassword.click({ trial: true, timeout: 5_000 });
  await savePassword.click();
  const resetOutcome = await resetOutcomePromise;
  const resetRequest = resetOutcome.request();
  expect(resetRequest.method()).toBe("POST");
  expect(new URL(resetOutcome.url()).pathname).toBe("/api/auth/reset-password");
  expect(resetOutcome.status()).toBeLessThan(400);
  await expect.poll(() => new URL(page.url()).pathname).toBe("/login");
  await login(page, email, password);
}

function assertRunOwnedRecord(
  record: Record<string, unknown>,
  expected: { email: string; name: string },
): void {
  expect(record.email === expected.email, "run-owned email must match").toBe(true);
  expect(record.name === expected.name, "run-owned name must match").toBe(true);
  expect(
    typeof record.name === "string" && record.name.includes(runLabel),
    "run-owned name must carry the private run marker",
  ).toBe(true);
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  await expect.poll(() => page.evaluate(() =>
    Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
  )).toBeLessThanOrEqual(1);
}

async function expectWithinViewport(page: Page, locator: Locator): Promise<void> {
  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  if (!viewport || !box) return;
  expect(box.x).toBeGreaterThanOrEqual(-1);
  expect(box.y).toBeGreaterThanOrEqual(-1);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
}

test.describe.serial("remote notification system acceptance", () => {
  let pushTransferContext: BrowserContext | undefined;
  let adminPage: Page;
  let familyPage: Page;
  let sponsorAPage: Page;
  let sponsorBPage: Page;
  let applicantPage: Page | undefined;
  const contexts: BrowserContext[] = [];
  const diagnostics = new Map<string, Diagnostics>();
  let cleanupSummary: CleanupSummary | undefined;

  async function trackedPage(
    browser: Browser,
    alias: string,
    context?: BrowserContext,
  ): Promise<{ context: BrowserContext; page: Page; captured: Diagnostics }> {
    const ownedContext = context ?? await browser.newContext();
    if (!context) contexts.push(ownedContext);
    const page = await ownedContext.newPage();
    const captured = makeDiagnostics();
    diagnostics.set(alias, captured);
    attachDiagnostics(page, captured);
    return { context: ownedContext, page, captured };
  }

  test.beforeAll(async ({ browser }) => {
    expect(adminEmail && adminPassword, "remote admin credentials must be present").toBeTruthy();
    const admin = await trackedPage(browser, "admin");
    const family = await trackedPage(browser, "family");
    const sponsorA = await trackedPage(browser, "sponsor-a");
    const sponsorB = await trackedPage(browser, "sponsor-b");
    adminPage = admin.page;
    familyPage = family.page;
    sponsorAPage = sponsorA.page;
    sponsorBPage = sponsorB.page;
  });

  test.afterAll(async () => {
    await Promise.allSettled(contexts.map((context) => context.close()));
  });

  test("remote notifications 01 - four-account setup and empty inbox ownership", async () => {
    await login(adminPage, adminEmail, adminPassword);
    const identity = await browserJsonRequest(adminPage, "GET", "/api/auth/me");
    expect(identity.status).toBe(200);
    expect(responseRecord(identity.body).role).toBe("admin");

    const family = await browserJsonRequest(adminPage, "POST", "/api/families", {
      name: familyName,
      email: familyEmail,
      guardianCin: familyCin,
      guardianDateOfBirth: "1985-04-12",
      exactAddress: `Notification acceptance address ${runLabel}`,
      housingSituation: "rented",
      registrationDate: new Date().toISOString().slice(0, 10),
      supportPriority: "normal",
      phone: familyPhone,
      fundingTargetMinor: 10_000,
      maxOrdersPerMonth: 5,
      monthlyBudgetMinor: 10_000,
      initialChildren: [],
    });
    expect(family.status).toBeLessThan(400);
    const createdFamily = responseRecord(family.body);
    assertRunOwnedRecord(createdFamily, { email: familyEmail, name: familyName });
    state.familyProfileId = responseId(family.body);
    const temporaryCredential = String(createdFamily.initialPassword ?? "");
    expect(state.familyProfileId).not.toBe("");
    expect(temporaryCredential).not.toBe("");

    await familyPage.goto("/login", { waitUntil: "commit" });
    await (await waitForLoginHydration(familyPage)).fill(familyEmail);
    await familyPage.getByPlaceholder(/Enter your password/i).fill(temporaryCredential);
    const firstLoginResponse = familyPage.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === "/api/auth/login",
    );
    await familyPage.getByRole("button", { name: "Log in", exact: true }).click();
    expect((await firstLoginResponse).status()).toBeLessThan(400);
    await expect.poll(() => new URL(familyPage.url()).pathname).toBe("/change-password");
    await familyPage.getByRole("textbox", { name: "New password *", exact: true }).fill(familyPassword);
    await familyPage
      .getByRole("textbox", { name: "Repeat the new password *", exact: true })
      .fill(familyPassword);
    const passwordResponse = familyPage.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === "/api/auth/credential-setup/change",
    );
    await familyPage.getByRole("button", { name: "Save my password", exact: true }).click();
    expect((await passwordResponse).status()).toBeLessThan(400);
    await expect.poll(() => new URL(familyPage.url()).pathname).toBe("/login");
    await login(familyPage, familyEmail, familyPassword);

    const sponsorFixtures = [
      {
        alias: "a",
        page: sponsorAPage,
        name: sponsorAName,
        email: sponsorAEmail,
        phone: sponsorAPhone,
        cin: sponsorACin,
        password: sponsorAPassword,
      },
      {
        alias: "b",
        page: sponsorBPage,
        name: sponsorBName,
        email: sponsorBEmail,
        phone: sponsorBPhone,
        cin: sponsorBCin,
        password: sponsorBPassword,
      },
    ] as const;

    for (const sponsor of sponsorFixtures) {
      const invitationStartedAt = Date.now();
      const abort = new AbortController();
      const invitationPromise = handleConcurrentPromise(
        pollExactlyOneMailboxMessage({
          recipient: sponsor.email,
          since: invitationStartedAt,
          subjectKeyword: "activate your sponsor account",
          signal: abort.signal,
        }),
      );
      let invitation: MailpitMessage;
      try {
        const created = await browserJsonRequest(adminPage, "POST", "/api/sponsors", {
          name: sponsor.name,
          email: sponsor.email,
          phone: sponsor.phone,
          cin: sponsor.cin,
          gender: "F",
          address: `Notification sponsor address ${runLabel}`,
          dateOfBirth: "1988-10-12",
        });
        expect(created.status).toBeLessThan(400);
        expect(responseRecord(created.body).emailSent).toBe(true);
        assertRunOwnedRecord(responseRecord(created.body), sponsor);
        if (sponsor.alias === "a") state.sponsorAProfileId = responseId(created.body);
        else state.sponsorBProfileId = responseId(created.body);
        invitation = await invitationPromise;
      } catch (error) {
        abort.abort();
        await invitationPromise.catch(() => undefined);
        throw error;
      }
      await acceptSponsorInvitation(sponsor.page, sponsor.email, sponsor.password, invitation);
    }

    expect(Boolean(state.sponsorAProfileId && state.sponsorBProfileId)).toBe(true);

    for (const principal of [
      { alias: "admin", page: adminPage },
      { alias: "family", page: familyPage },
      { alias: "sponsor-a", page: sponsorAPage },
      { alias: "sponsor-b", page: sponsorBPage },
    ]) {
      expect(await readUnreadCount(principal.page), `${principal.alias} empty unread count`).toBe(0);
      expect(await readNotifications(principal.page, "?limit=100"), `${principal.alias} empty inbox`).toEqual([]);
      await principal.page.goto("/notifications", { waitUntil: "commit" });
      await expect.poll(() => new URL(principal.page.url()).pathname).toBe("/notifications");
      await expect(principal.page.getByText("Notifications", { exact: true }).first()).toBeVisible();
      await principal.page.goto("/dashboard", { waitUntil: "commit" });
      const bell = principal.page.getByRole("button", {
        name: "Open notifications",
        exact: true,
      });
      await expect(bell).toHaveCount(1);
      await expect(bell.locator('[aria-live="polite"]')).toHaveText("");
      await expect(
        bell.locator("xpath=ancestor::*[@data-slot='indicator'][1]"),
      ).toHaveCount(0);
      await expect(principal.page.locator('a[href="/notifications"]')).toHaveCount(1);
    }
  });

  test("remote notifications 02 - contribution fan-out, polling, and read persistence", async () => {
    const baselines = {
      admin: await readUnreadCount(adminPage),
      family: await readUnreadCount(familyPage),
      sponsorA: await readUnreadCount(sponsorAPage),
      sponsorB: await readUnreadCount(sponsorBPage),
    };

    const assignment = await browserJsonRequest(
      adminPage,
      "POST",
      "/api/support-assignments",
      {
        sponsorProfileId: state.sponsorAProfileId,
        familyProfileId: state.familyProfileId,
        notes: `Notification acceptance ${runLabel}`,
      },
    );
    expect(assignment.status).toBeLessThan(400);
    state.assignmentAId = responseId(assignment.body);
    expect(state.assignmentAId).not.toBe("");

    const contribution = await browserJsonRequest(
      sponsorAPage,
      "POST",
      "/api/contributions/me",
      {
        supportAssignmentId: state.assignmentAId,
        amountMinor: 100,
        paymentMethod: "notification-acceptance",
      },
    );
    expect(contribution.status).toBeLessThan(400);
    state.validatedContributionId = responseId(contribution.body);
    expect(state.validatedContributionId).not.toBe("");

    const validation = await browserJsonRequest(
      adminPage,
      "POST",
      `/api/contributions/${state.validatedContributionId}/validate`,
    );
    expect(validation.status).toBeLessThan(400);

    await pollNotificationState(
      () => Promise.all([readUnreadCount(familyPage), readUnreadCount(sponsorAPage)]),
      ([family, sponsor]) => family > baselines.family && sponsor > baselines.sponsorA,
    );
    expect(await readUnreadCount(adminPage)).toBe(baselines.admin);
    expect(await readUnreadCount(sponsorBPage)).toBe(baselines.sponsorB);

    const familyRows = await pollNotificationState(
      () => readNotifications(familyPage, "?limit=100&topic=contribution.validated"),
      (rows) => rows.some((row) => row.aggregateId === state.validatedContributionId),
    );
    const sponsorRows = await pollNotificationState(
      () => readNotifications(sponsorAPage, "?limit=100&topic=contribution.validated"),
      (rows) => rows.some((row) => row.aggregateId === state.validatedContributionId),
    );
    const familyNotification = familyRows.filter(
      (row) => row.aggregateId === state.validatedContributionId,
    );
    const sponsorNotification = sponsorRows.filter(
      (row) => row.aggregateId === state.validatedContributionId,
    );
    expect(familyNotification).toHaveLength(1);
    expect(sponsorNotification).toHaveLength(1);
    state.sponsorAValidatedNotificationId = sponsorNotification[0]!.id;

    for (const row of [familyNotification[0]!, sponsorNotification[0]!]) {
      expect(row.topic).toBe("contribution.validated");
      expect(row.aggregateType).toBe("contribution");
      expect(Object.keys(row.payload)).toEqual(["amountMinor"]);
      expect(row.payload.amountMinor).toBe(100);
      const projection = JSON.stringify(row).toLowerCase();
      for (const forbidden of [
        familyEmail,
        familyPhone,
        familyCin,
        sponsorAEmail,
        sponsorAPhone,
        sponsorACin,
        "http://",
        "https://",
      ]) {
        expect(
          !projection.includes(forbidden.toLowerCase()),
          "notification projection must omit private and external-link content",
        ).toBe(true);
      }
    }

    await sponsorAPage.goto("/dashboard", { waitUntil: "commit" });
    const bell = sponsorAPage.getByRole("button", {
      name: "Open notifications",
      exact: true,
    });
    await bell.click();
    const card = sponsorAPage.locator(
      `[data-notification-id="${state.sponsorAValidatedNotificationId}"]`,
    );
    await expect(card).toBeVisible();
    await expect(card.getByText("Unread", { exact: true })).toBeVisible();
    await sponsorAPage.keyboard.press("Escape");
    await expect(bell).toBeFocused();
    const beforeOpen = await readNotifications(
      sponsorAPage,
      "?limit=100&topic=contribution.validated",
    );
    expect(beforeOpen.find((row) => row.id === state.sponsorAValidatedNotificationId)?.readAt).toBeNull();

    await bell.click();
    const markResponse = sponsorAPage.waitForResponse(
      (response) =>
        response.request().method() === "PATCH" &&
        new URL(response.url()).pathname ===
          `/api/notifications/${state.sponsorAValidatedNotificationId}/read`,
    );
    await card.getByRole("link", { name: "View", exact: true }).click();
    expect((await markResponse).status()).toBe(200);
    const persisted = await pollNotificationState(
      () => readNotifications(sponsorAPage, "?limit=100"),
      (rows) => rows.find((row) => row.id === state.sponsorAValidatedNotificationId)?.readAt !== null,
    );
    expect(persisted.find((row) => row.id === state.sponsorAValidatedNotificationId)?.readAt).not.toBeNull();
    expect(persisted.some((row) => row.id !== state.sponsorAValidatedNotificationId && row.readAt === null)).toBe(true);
    await sponsorAPage.reload({ waitUntil: "commit" });
    expect(
      (await readNotifications(sponsorAPage, "?limit=100"))
        .find((row) => row.id === state.sponsorAValidatedNotificationId)?.readAt,
    ).not.toBeNull();
  });

  test("remote notifications 03 - mark-all boundary and later unread event", async () => {
    const before = await pollNotificationState(
      () => readNotifications(familyPage, "?limit=100&unread=true"),
      (rows) => rows.length >= 2,
    );
    const earlierIds = new Set(before.map((row) => row.id));
    const markAll = await browserJsonRequest(
      familyPage,
      "PATCH",
      "/api/notifications/read-all",
    );
    expect(markAll.status).toBe(200);
    expect(responseRecord(markAll.body).read).toBe(before.length);
    expect(await readUnreadCount(familyPage)).toBe(0);

    const later = await browserJsonRequest(
      sponsorAPage,
      "POST",
      "/api/contributions/me",
      {
        supportAssignmentId: state.assignmentAId,
        amountMinor: 200,
        paymentMethod: "notification-boundary",
      },
    );
    expect(later.status).toBeLessThan(400);
    state.laterContributionId = responseId(later.body);
    expect(state.laterContributionId).not.toBe("");

    const familyRows = await pollNotificationState(
      () => readNotifications(familyPage, "?limit=100"),
      (rows) => rows.some(
        (row) =>
          row.aggregateId === state.laterContributionId &&
          row.topic === "contribution.submitted" &&
          row.readAt === null,
      ),
    );
    const laterFamily = familyRows.find(
      (row) => row.aggregateId === state.laterContributionId,
    );
    expect(laterFamily?.readAt).toBeNull();
    expect(
      familyRows.filter((row) => earlierIds.has(row.id)).every((row) => row.readAt !== null),
    ).toBe(true);
    await familyPage.reload({ waitUntil: "commit" });
    const persistedFamilyRows = await readNotifications(familyPage, "?limit=100");
    expect(
      persistedFamilyRows.find((row) => row.aggregateId === state.laterContributionId)?.readAt,
    ).toBeNull();
    expect(
      persistedFamilyRows
        .filter((row) => earlierIds.has(row.id))
        .every((row) => row.readAt !== null),
    ).toBe(true);

    const sponsorRows = await pollNotificationState(
      () => readNotifications(sponsorAPage, "?limit=100"),
      (rows) => rows.some(
        (row) =>
          row.aggregateId === state.laterContributionId &&
          row.topic === "contribution.submitted",
      ),
    );
    state.sponsorALaterNotificationId = sponsorRows.find(
      (row) => row.aggregateId === state.laterContributionId,
    )?.id ?? "";
    expect(state.sponsorALaterNotificationId).not.toBe("");
  });

  test("remote notifications 04 - applicant inbox and single Mailpit decision email", async ({ browser }) => {
    const applicant = await trackedPage(browser, "applicant");
    applicantPage = applicant.page;

    const otpStartedAt = Date.now();
    const otpAbort = new AbortController();
    const otpPromise = handleConcurrentPromise(
      pollExactlyOneMailboxMessage({
        recipient: applicantEmail,
        since: otpStartedAt,
        subjectKeyword: "Verify your Kafil sponsor application",
        signal: otpAbort.signal,
      }),
    );
    let otpMessage: MailpitMessage;
    try {
      const submission = await browserJsonRequest(
        applicantPage,
        "POST",
        "/api/applicants",
        {
          name: applicantName,
          email: applicantEmail,
          phone: applicantPhone,
          cin: applicantCin,
          gender: "F",
          password: applicantPassword,
          locale: "en",
        },
      );
      expect(submission.status).toBeLessThan(400);
      otpMessage = await otpPromise;
    } catch (error) {
      otpAbort.abort();
      await otpPromise.catch(() => undefined);
      throw error;
    }
    const confirmation = await browserJsonRequest(
      applicantPage,
      "POST",
      "/api/applicants/email-verification/confirm",
      { code: extractOtp(otpMessage) },
    );
    expect(confirmation.status).toBeLessThan(400);
    await deleteMailboxMessages([otpMessage.ID]);

    const applicants = await browserJsonRequest(
      adminPage,
      "GET",
      `/api/applicants?search=${encodeURIComponent(runLabel)}&limit=100&offset=0`,
    );
    expect(applicants.status).toBe(200);
    const matches = responseRows(applicants.body).filter((row) => row.email === applicantEmail);
    expect(matches).toHaveLength(1);
    state.applicantId = String(matches[0]!.id ?? "");
    expect(state.applicantId).not.toBe("");

    const decisionStartedAt = Date.now();
    const decisionAbort = new AbortController();
    const decisionPromise = handleConcurrentPromise(
      pollExactlyOneMailboxMessage({
        recipient: applicantEmail,
        since: decisionStartedAt,
        subjectKeyword: "Sponsor application approved",
        signal: decisionAbort.signal,
      }),
    );
    let decisionMessage: MailpitMessage;
    try {
      const approval = await browserJsonRequest(
        adminPage,
        "POST",
        `/api/applicants/${state.applicantId}/approve`,
      );
      expect(approval.status).toBe(200);
      const approved = responseRecord(approval.body);
      state.applicantProfileId = String(approved.sponsorProfileId ?? "");
      expect(state.applicantProfileId).not.toBe("");
      decisionMessage = await decisionPromise;
    } catch (error) {
      decisionAbort.abort();
      await decisionPromise.catch(() => undefined);
      throw error;
    }

    expect(decisionMessage.Subject).toBe("Sponsor application approved");
    expect(
      decisionMessage.Body?.includes(applicantName) === true,
      "decision text must contain the exact recipient name",
    ).toBe(true);
    expect(
      decisionMessage.HTML?.includes("&lt;Proof&gt;") === true,
      "decision HTML must escape the recipient name",
    ).toBe(true);
    expect(
      decisionMessage.HTML?.includes("Notification <Proof>") !== true,
      "decision HTML must not contain the raw recipient name",
    ).toBe(true);
    expect(
      decisionMessage.HTML?.includes('dir="ltr"') === true,
      "decision HTML must carry the expected direction",
    ).toBe(true);
    expect(
      /X-Kafil-Delivery-Id/i.test(JSON.stringify(decisionMessage.Headers ?? {})),
      "decision email must carry a delivery id header",
    ).toBe(true);
    const decisionMatches = await findMailboxMessages({
      recipient: applicantEmail,
      since: decisionStartedAt,
      subjectKeyword: "Sponsor application approved",
    });
    expect(decisionMatches).toHaveLength(1);

    await login(applicantPage, applicantEmail, applicantPassword);
    const applicantNotifications = await pollNotificationState(
      () => readNotifications(applicantPage!, "?limit=100&topic=applicant.approved"),
      (rows) => rows.some((row) => row.aggregateId === state.applicantId),
    );
    const approvalRows = applicantNotifications.filter(
      (row) => row.aggregateId === state.applicantId,
    );
    expect(approvalRows).toHaveLength(1);
    expect(
      approvalRows[0]!.payload.applicantId === state.applicantId,
      "approval notification must reference the run-owned applicant",
    ).toBe(true);
    expect(approvalRows[0]!.payload.transition).toBe("approved");
    await deleteMailboxMessages([decisionMessage.ID]);
    expect(await findMailboxMessages({
      recipient: applicantEmail,
      since: decisionStartedAt,
      subjectKeyword: "Sponsor application approved",
    })).toHaveLength(0);
  });

  test("remote notifications 05 - cross-user inbox isolation and exact 404", async () => {
    expect(state.sponsorAValidatedNotificationId).not.toBe("");
    const sponsorBRows = await readNotifications(sponsorBPage, "?limit=100");
    const adminRows = await readNotifications(adminPage, "?limit=100");
    expect(sponsorBRows.some((row) => row.id === state.sponsorAValidatedNotificationId)).toBe(false);
    expect(adminRows.some((row) => row.id === state.sponsorAValidatedNotificationId)).toBe(false);

    const id = state.sponsorAValidatedNotificationId;
    await expectExactNegativeResponse(
      sponsorBPage,
      diagnostics.get("sponsor-b")!,
      { method: "PATCH", path: `/api/notifications/${id}/read`, status: 404 },
      () => browserJsonRequest(sponsorBPage, "PATCH", `/api/notifications/${id}/read`),
    );
    await expectExactNegativeResponse(
      adminPage,
      diagnostics.get("admin")!,
      { method: "PATCH", path: `/api/notifications/${id}/read`, status: 404 },
      () => browserJsonRequest(adminPage, "PATCH", `/api/notifications/${id}/read`),
    );
  });

  test("remote notifications 06 - push subscription persistence and account transfer", async ({ browser }) => {
    const transfer = await trackedPage(browser, "push-transfer");
    pushTransferContext = transfer.context;
    const page = transfer.page;
    await pushTransferContext.grantPermissions(["notifications"], { origin: baseUrl });
    await login(page, sponsorAEmail, sponsorAPassword);
    await page.goto("/notifications", { waitUntil: "commit" });
    const enable = page.getByRole("button", { name: "Enable push", exact: true });
    await expect(enable).toBeVisible();
    const subscribeResponse = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === "/api/notifications/push-subscriptions",
    );
    await enable.click();
    expect((await subscribeResponse).status()).toBeLessThan(400);
    await expect(page.getByText("Push is on for this device.", { exact: true })).toBeVisible();

    const subscription = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      const current = await registration.pushManager.getSubscription();
      if (!current) throw new Error("Push subscription was not persisted in the browser.");
      const json = current.toJSON();
      return {
        endpoint: json.endpoint ?? "",
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? "",
      };
    });
    expect(Boolean(subscription.endpoint && subscription.p256dh && subscription.auth)).toBe(true);
    await page.reload({ waitUntil: "commit" });
    await expect(page.getByRole("button", { name: "Turn off", exact: true })).toBeVisible();

    await signOutAndDeny(
      page,
      diagnostics.get("push-transfer")!,
      "/api/sponsors/me/profile",
    );
    await login(page, sponsorBEmail, sponsorBPassword);
    const transferResult = await browserJsonRequest(
      page,
      "POST",
      "/api/notifications/push-subscriptions",
      subscription,
    );
    expect(transferResult.status).toBeLessThan(400);

    await expectExactNegativeResponse(
      sponsorAPage,
      diagnostics.get("sponsor-a")!,
      { method: "DELETE", path: "/api/notifications/push-subscriptions", status: 404 },
      () => browserJsonRequest(
        sponsorAPage,
        "DELETE",
        "/api/notifications/push-subscriptions",
        { endpoint: subscription.endpoint },
      ),
    );
    const removal = await browserJsonRequest(
      page,
      "DELETE",
      "/api/notifications/push-subscriptions",
      { endpoint: subscription.endpoint },
    );
    expect(removal.status).toBe(200);
    expect(responseRecord(removal.body).removed).toBe(true);
    expect(await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      const current = await registration.pushManager.getSubscription();
      return current ? current.unsubscribe() : true;
    })).toBe(true);
    await signOutAndDeny(
      page,
      diagnostics.get("push-transfer")!,
      "/api/sponsors/me/profile",
    );
    await pushTransferContext.close();
  });

  test("remote notifications 07 - Arabic phone RTL, keyboard, and focus restoration", async () => {
    expect(state.sponsorALaterNotificationId).not.toBe("");
    await sponsorAPage.goto("/notifications", { waitUntil: "commit" });
    const language = await onlyVisible(
      sponsorAPage.getByRole("button", { name: "Language", exact: true }),
    );
    await language.click();
    const settingsResponse = sponsorAPage.waitForResponse(
      (response) =>
        response.request().method() === "PUT" &&
        new URL(response.url()).pathname === "/api/notifications/settings",
    );
    await sponsorAPage.getByRole("menuitem").filter({ hasText: "Arabic" }).click();
    expect((await settingsResponse).status()).toBe(200);
    await expect(sponsorAPage.locator("html")).toHaveAttribute("dir", "rtl");
    const settings = await browserJsonRequest(
      sponsorAPage,
      "GET",
      "/api/notifications/settings",
    );
    expect(responseRecord(settings.body).locale).toBe("ar");

    await sponsorAPage.setViewportSize({ width: 390, height: 844 });
    await sponsorAPage.goto("/notifications", { waitUntil: "commit" });
    await expect(sponsorAPage.locator("html")).toHaveAttribute("dir", "rtl");
    await expectNoHorizontalOverflow(sponsorAPage);
    const bell = sponsorAPage.getByRole("button", {
      name: "فتح الإشعارات",
      exact: true,
    });
    await expect(bell).toHaveCount(1);
    await expect(bell.locator('[aria-live="polite"]')).toContainText("إشعار");
    await bell.focus();
    await sponsorAPage.keyboard.press("Enter");
    await expect(sponsorAPage.getByText("الإشعارات", { exact: true }).first()).toBeVisible();
    const card = sponsorAPage.locator(
      `[data-notification-id="${state.sponsorALaterNotificationId}"]`,
    );
    await expect(card).toBeVisible();
    await expectWithinViewport(
      sponsorAPage,
      card.locator("xpath=ancestor::*[@data-radix-popper-content-wrapper][1]"),
    );
    await expectWithinViewport(sponsorAPage, card);
    expect(await card.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    const markRead = card.getByRole("button", {
      name: "تعيين كمقروء",
      exact: true,
    });
    await markRead.focus();
    const markResponse = sponsorAPage.waitForResponse(
      (response) =>
        response.request().method() === "PATCH" &&
        new URL(response.url()).pathname ===
          `/api/notifications/${state.sponsorALaterNotificationId}/read`,
    );
    await sponsorAPage.keyboard.press("Enter");
    expect((await markResponse).status()).toBe(200);
    await expect(bell).toBeFocused();
    await sponsorAPage.keyboard.press("Enter");
    await expect(sponsorAPage.getByText("الإشعارات", { exact: true }).first()).toBeVisible();
    await sponsorAPage.keyboard.press("Escape");
    await expect(bell).toBeFocused();
    await expectNoHorizontalOverflow(sponsorAPage);
  });

  test("remote notifications 08 - supported cleanup, logout, and closure", async () => {
    await familyPage.setViewportSize({ width: 1280, height: 900 });
    await sponsorAPage.setViewportSize({ width: 1280, height: 900 });
    await sponsorBPage.setViewportSize({ width: 1280, height: 900 });
    await applicantPage!.setViewportSize({ width: 1280, height: 900 });

    await signOutAndDeny(
      familyPage,
      diagnostics.get("family")!,
      "/api/families/me",
    );
    await signOutAndDeny(
      sponsorAPage,
      diagnostics.get("sponsor-a")!,
      "/api/sponsors/me/profile",
    );
    await signOutAndDeny(
      sponsorBPage,
      diagnostics.get("sponsor-b")!,
      "/api/sponsors/me/profile",
    );
    await signOutAndDeny(
      applicantPage!,
      diagnostics.get("applicant")!,
      "/api/sponsors/me/profile",
    );
    await Promise.all([
      familyPage.close(),
      sponsorAPage.close(),
      sponsorBPage.close(),
      applicantPage!.close(),
    ]);

    const ownedRecords = await Promise.all([
      browserJsonRequest(adminPage, "GET", `/api/families/${state.familyProfileId}`),
      browserJsonRequest(adminPage, "GET", `/api/sponsors/${state.sponsorAProfileId}`),
      browserJsonRequest(adminPage, "GET", `/api/sponsors/${state.sponsorBProfileId}`),
      browserJsonRequest(adminPage, "GET", `/api/applicants/${state.applicantId}`),
    ]);
    expect(ownedRecords.every((result) => result.status === 200)).toBe(true);
    assertRunOwnedRecord(responseRecord(ownedRecords[0]!.body), {
      email: familyEmail,
      name: familyName,
    });
    assertRunOwnedRecord(responseRecord(ownedRecords[1]!.body), {
      email: sponsorAEmail,
      name: sponsorAName,
    });
    assertRunOwnedRecord(responseRecord(ownedRecords[2]!.body), {
      email: sponsorBEmail,
      name: sponsorBName,
    });
    assertRunOwnedRecord(responseRecord(ownedRecords[3]!.body), {
      email: applicantEmail,
      name: applicantName,
    });

    for (const [path, id] of [
      ["/api/families", state.familyProfileId],
      ["/api/sponsors", state.sponsorAProfileId],
      ["/api/sponsors", state.sponsorBProfileId],
      ["/api/applicants", state.applicantId],
    ] as const) {
      const removal = await browserJsonRequest(adminPage, "DELETE", `${path}/${id}`);
      expect(removal.status).toBeLessThan(400);
    }

    const encodedRunLabel = encodeURIComponent(runLabel);
    const applicationChecks = await Promise.all([
      browserJsonRequest(adminPage, "GET", `/api/families?search=${encodedRunLabel}&limit=100&offset=0`),
      browserJsonRequest(adminPage, "GET", `/api/sponsors?search=${encodedRunLabel}&limit=100&offset=0`),
      browserJsonRequest(adminPage, "GET", `/api/applicants?search=${encodedRunLabel}&limit=100&offset=0`),
      browserJsonRequest(adminPage, "GET", `/api/contributions?familyProfileId=${state.familyProfileId}&limit=100&offset=0`),
    ]);
    expect(applicationChecks.every((result) => result.status === 200)).toBe(true);
    const applicationRowsRetained = applicationChecks.reduce(
      (count, result) => count + responseRows(result.body).length,
      0,
    );
    expect(applicationRowsRetained).toBe(0);

    const mailboxMessages = (
      await Promise.all(
        [familyEmail, sponsorAEmail, sponsorBEmail, applicantEmail].map((recipient) =>
          findMailboxMessages({ recipient, since: runStartedAt }),
        ),
      )
    ).flat();
    const mailboxMessageIds = [...new Set(mailboxMessages.map((message) => message.ID))];
    await deleteMailboxMessages(mailboxMessageIds);
    const mailboxMessagesRetained = (
      await Promise.all(
        [familyEmail, sponsorAEmail, sponsorBEmail, applicantEmail].map((recipient) =>
          findMailboxMessages({ recipient, since: runStartedAt }),
        ),
      )
    ).reduce((count, messages) => count + messages.length, 0);
    expect(mailboxMessagesRetained).toBe(0);

    cleanupSummary = {
      applicationRowsRetained,
      mailboxMessagesRetained,
      mailboxMessagesDeleted: mailboxMessageIds.length,
      pushSubscriptionsRetained: 0,
      reporting: "counts-only",
      databaseOnlyGuarantees: "NOT VERIFIED",
    };

    await signOutAndDeny(
      adminPage,
      diagnostics.get("admin")!,
      "/api/auth/me",
    );
    await adminPage.close();
    await Promise.all(contexts.map((context) => context.close()));
    expect(contexts.every((context) => context.pages().length === 0)).toBe(true);
  });

  test("remote notifications diagnostics - final contexts and delivery assertions", async () => {
    if (cleanupSummary) {
      expect(cleanupSummary.applicationRowsRetained).toBe(0);
      expect(cleanupSummary.mailboxMessagesRetained).toBe(0);
      expect(cleanupSummary.pushSubscriptionsRetained).toBe(0);
      expect(Number.isSafeInteger(cleanupSummary.mailboxMessagesDeleted)).toBe(true);
      expect(cleanupSummary.mailboxMessagesDeleted).toBeGreaterThanOrEqual(0);
      expect(cleanupSummary.reporting).toBe("counts-only");
      expect(cleanupSummary.databaseOnlyGuarantees).toBe("NOT VERIFIED");
    }
    for (const [alias, captured] of diagnostics) {
      assertDiagnosticsClean(alias, captured);
    }
  });
});
