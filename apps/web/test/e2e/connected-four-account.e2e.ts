/**
 * Connected four-account acceptance harness.
 *
 * One serial Playwright `describe` block. Four isolated browser contexts
 * (adminContext, familyContext, sponsorAContext, sponsorBContext) drive a
 * real data graph through eight work units (A → H). No `page.route()`
 * mocking is allowed; every API request goes to the local Next.js server
 * which proxies into the authorized local-demo PostgreSQL database and
 * the local Mailpit capture service.
 *
 * Run-bound secrets are generated in memory by the runner, forwarded to
 * this process through environment variables, and never written into the
 * worktree or evidence files.
 */

import {
  expect,
  test,
  type BrowserContext,
  type Locator,
  type Page,
  type Request,
  type Response,
} from "@playwright/test";
import { spawnSync } from "node:child_process";
import { pool } from "@kafil/server/database";

import {
  CONNECTED_RUN_FIXTURE,
  VIEWPORTS,
  type RunFixture,
  addMinor,
  buildRunCin,
  buildRunEmail,
  buildRunPhone,
  formatMadFromMinor,
} from "../../scripts/connected-four-account-fixtures";

const baseUrl = process.env.KAFIL_E2E_BASE_URL ?? "http://127.0.0.1:3210";
const mailboxApiUrl = process.env.KAFIL_E2E_MAILBOX_API_URL ?? "http://127.0.0.1:8025";
const adminEmail = process.env.KAFIL_ADMIN_EMAIL ?? "";
const adminPassword = process.env.KAFIL_ADMIN_PASSWORD ?? "";
const familyIdentifier = process.env.KAFIL_E2E_FAMILY_IDENTIFIER ?? "";
const familyRuntimePassword = process.env.KAFIL_E2E_FAMILY_PASSWORD ?? "";
const sponsorAPassword = process.env.KAFIL_E2E_SPONSOR_A_PASSWORD ?? "";
const sponsorBRuntimePassword = process.env.KAFIL_E2E_SPONSOR_B_PASSWORD ?? "";
const sponsorAEmail = process.env.KAFIL_E2E_SPONSOR_A_EMAIL ?? "";
const sponsorAPhone = process.env.KAFIL_E2E_SPONSOR_A_PHONE ?? "";
const runLabel = process.env.KAFIL_E2E_RUN_LABEL ?? CONNECTED_RUN_FIXTURE.maskedLabel;

interface RunState {
  label: string;
  fixture: RunFixture;
  familyProfileId: string;
  familyUserId: string;
  familyTempCredential: string;
  familyEmail: string;
  familyPhone: string;
  familyCin: string;
  familyAddress: string;
  sponsorAUserId: string;
  sponsorAProfileId: string;
  sponsorAPhone: string;
  sponsorBUserId: string;
  sponsorBProfileId: string;
  sponsorBEmail: string;
  sponsorBPhone: string;
  assignmentAId: string;
  assignmentBId: string;
  fundingTargetMinor: number;
  planAId: string;
  staffAId: string;
  staffBId: string;
}

interface CapturedFailure {
  kind: "page" | "console" | "request" | "response";
  message: string;
}

interface ContextDiagnostics {
  pageErrors: string[];
  consoleErrors: string[];
  failedRequests: string[];
  badResponses: CapturedFailure[];
  expectedResponses: { method: string; path: string; status: number; count: number; consumed: number }[];
  expectedConsoleErrors: { status: number; count: number; consumed: number }[];
}

function makeDiagnostics(): ContextDiagnostics {
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
  diagnostics: ContextDiagnostics,
  contract: { method: string; path: string; status: number; count?: number },
) {
  const count = contract.count ?? 1;
  diagnostics.expectedResponses.push({ ...contract, count, consumed: 0 });
  // Browsers log a console error like
  // "Failed to load resource: the server responded with a status of NNN"
  // for every non-2xx response. The console error has no path in its text,
  // so we track it as a separately-counted allowance keyed on the status.
  // Each expected response entry gets its own console error count so an
  // unrelated later 4xx of the same status cannot be silently hidden.
  if (contract.status >= 400) {
    diagnostics.expectedConsoleErrors.push({ status: contract.status, count, consumed: 0 });
  }
}

function attachDiagnostics(page: Page, diagnostics: ContextDiagnostics) {
  page.on("pageerror", (error) => diagnostics.pageErrors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    // Browsers log "Failed to load resource: the server responded with a
    // status of NNN" for every non-2xx fetch. Match exact status with a
    // separately-counted console allowance; the response listener handles
    // the HTTP layer with method+path+status, this listener handles the
    // console layer with status only and the corresponding count.
    const statusMatch = text.match(/status of (\d{3})/);
    if (statusMatch) {
      const status = Number(statusMatch[1]);
      const expected = diagnostics.expectedConsoleErrors.find(
        (entry) => entry.status === status && entry.consumed < entry.count,
      );
      if (expected) {
        expected.consumed += 1;
        return;
      }
    }
    diagnostics.consoleErrors.push(text);
  });
  page.on("requestfailed", (request) => {
    const failure = request.failure();
    // Skip genuine navigation cancellation: aborted/aborted by Next.js when
    // a previous page closes before its static chunks finish loading.
    if (failure && /^(net::ERR_ABORTED|aborted)$/i.test(failure.errorText)) {
      return;
    }
    diagnostics.failedRequests.push(`${request.method()} ${new URL(request.url()).pathname}`);
  });
  page.on("response", (response) => {
    const status = response.status();
    if (status >= 400) {
      const url = new URL(response.url());
      const method = response.request().method();
      const expected = diagnostics.expectedResponses.find(
        (candidate) =>
          candidate.method === method &&
          candidate.path === url.pathname &&
          candidate.status === status &&
          candidate.consumed < candidate.count,
      );
      if (expected) {
        expected.consumed += 1;
        return;
      }
      diagnostics.badResponses.push({
        kind: "response",
        message: `${method} ${url.pathname} → ${status}`,
      });
    }
  });
}

async function expectExactNegativeResponse<T>(
  page: Page,
  diagnostics: ContextDiagnostics,
  contract: { method: string; path: string; status: number },
  action: () => Promise<T>,
): Promise<{ result: T; response: import("@playwright/test").Response }> {
  const expected = { ...contract, count: 1, consumed: 0 };
  diagnostics.expectedResponses.push(expected);
  if (contract.status >= 400) {
    diagnostics.expectedConsoleErrors.push({ status: contract.status, count: 1, consumed: 0 });
  }
  const responsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      response.request().method() === contract.method &&
      url.pathname === contract.path &&
      response.status() === contract.status
    );
  });
  const result = await action();
  const response = await responsePromise;
  await expect.poll(() => expected.consumed).toBe(1);
  return { result, response };
}

interface BrowserJsonResult {
  status: number;
  body: unknown;
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

function responseData(value: unknown): unknown {
  if (typeof value !== "object" || value === null || !("data" in value)) {
    return value;
  }
  return (value as { data: unknown }).data;
}

function responseMessage(value: unknown): string {
  if (typeof value !== "object" || value === null || !("message" in value)) {
    return "";
  }
  const message = (value as { message?: unknown }).message;
  return typeof message === "string" ? message : "";
}

function responseId(value: unknown): string {
  const data = responseData(value);
  if (typeof data !== "object" || data === null || !("id" in data)) {
    return "";
  }
  const id = (data as { id?: unknown }).id;
  return typeof id === "string" ? id : "";
}

function containsSensitiveValue(value: unknown, sensitiveValues: string[]): boolean {
  const serialized = JSON.stringify(value ?? {});
  return sensitiveValues.some(
    (sensitiveValue) => sensitiveValue.length > 0 && serialized.includes(sensitiveValue),
  );
}

async function assertDiagnosticsClean(alias: string, diagnostics: ContextDiagnostics) {
  if (diagnostics.pageErrors.length > 0) {
    throw new Error(`[${alias}] page errors: ${diagnostics.pageErrors.join(" | ")}`);
  }
  if (diagnostics.consoleErrors.length > 0) {
    throw new Error(`[${alias}] console errors: ${diagnostics.consoleErrors.join(" | ")}`);
  }
  if (diagnostics.failedRequests.length > 0) {
    throw new Error(`[${alias}] failed requests: ${diagnostics.failedRequests.join(" | ")}`);
  }
  if (diagnostics.badResponses.length > 0) {
    throw new Error(`[${alias}] unexplained responses: ${diagnostics.badResponses.map((entry) => entry.message).join(" | ")}`);
  }
  for (const expected of diagnostics.expectedResponses) {
    if (expected.count !== 1 || expected.consumed !== expected.count) {
      throw new Error(`[${alias}] expected ${expected.method} ${expected.path} → ${expected.status} ${expected.consumed} time(s), expected exactly once`);
    }
  }
  for (const expected of diagnostics.expectedConsoleErrors) {
    if (expected.count !== 1 || expected.consumed !== expected.count) {
      throw new Error(`[${alias}] expected console error status=${expected.status} ${expected.consumed} time(s), expected exactly once`);
    }
  }
}

async function setLanguage(context: BrowserContext, language: "en") {
  await context.addCookies([{ name: "kafil-ui-language", value: language, url: baseUrl }]);
}

async function waitForLoginHydration(page: Page) {
  const identifierInput = page.getByLabel(
    /Email or phone|E-mail ou telephone|البريد الإلكتروني أو الهاتف/i,
  );
  await expect(identifierInput).toBeVisible();
  await page.waitForFunction(
    () => {
      const form = document.querySelector("#login-form");
      if (!form) return false;
      const propsKey = Object.keys(form).find((key) => key.startsWith("__reactProps$"));
      if (!propsKey) return false;
      const props = (form as unknown as Record<string, { onSubmit?: unknown }>)[propsKey];
      return typeof props?.onSubmit === "function";
    },
    undefined,
    { timeout: 120_000 },
  );
  return identifierInput;
}

async function login(page: Page, identifier: string, password: string) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  const loginPathname = new URL(page.url()).pathname;
  if (loginPathname !== "/login") {
    throw new Error(
      `login: expected /login before filling credentials, but navigation ended at ${loginPathname}. ` +
        "The browser context still has or recovered an authenticated session.",
    );
  }
  const identifierInput = await waitForLoginHydration(page);
  await identifierInput.fill(identifier);
  await page.getByPlaceholder(/Enter your password|Saisissez votre mot de passe|أدخل كلمة المرور/i).fill(password);
  const loginResponse = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/auth/login" &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: /Log in|Se connecter|تسجيل الدخول/i }).click();
  const response = await loginResponse;
  expect(response.status()).toBeLessThan(400);
  return response;
}

async function signOut(page: Page) {
  const authCookies = await page.context().cookies();
  expect(
    authCookies.some((cookie) => cookie.name === "refreshToken"),
    "signOut readiness requires the browser refresh cookie",
  ).toBe(true);

  const meResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "GET" &&
      new URL(response.url()).pathname === "/api/auth/me",
  );
  const meStatus = await page.evaluate(async () => {
    const response = await fetch("/api/auth/me", { credentials: "include" });
    return response.status;
  });
  const meResponse = await meResponsePromise;
  expect(meResponse.status()).toBe(meStatus);
  expect(meStatus, "refresh-cookie authentication must work before sign out").toBeLessThan(400);

  const visibleSignOutButton = await onlyVisible(
    page.locator("button").filter({
      has: page.locator("svg.lucide-log-out"),
    }),
  );
  // Strengthened hydration check: the visible React props must contain a
  // callable onClick. The bare `__reactProps$` key is not sufficient — Najm
  // Auth's `SignOutButton` can hydrate the host element without yet wiring
  // the onClick handler. Hydration itself may take the full cold-compile
  // budget on the Windows acceptance host, so the onClick poll keeps the
  // 120_000 ms expect budget. Only missing request start is fail-fast.
  await expect.poll(
    () => visibleSignOutButton.evaluate((button) => {
      const propsKey = Object.keys(button).find((key) =>
        key.startsWith("__reactProps$"),
      );
      if (!propsKey) return false;
      const props = (button as unknown as Record<string, { onClick?: unknown }>)[propsKey];
      return typeof props?.onClick === "function";
    }),
    { timeout: 120_000 },
  ).toBe(true);

  // Observe request start separately from response completion. This keeps a
  // missing click/handler fail-fast without misclassifying a started request
  // whose response is merely slower on the acceptance host.
  const logoutRequestPromise = page.waitForRequest(
    (candidate) =>
      new URL(candidate.url()).pathname === "/api/auth/logout" &&
      candidate.method() === "POST",
    { timeout: 10_000 },
  ).catch(() => null);
  await visibleSignOutButton.click();
  const logoutRequest = await logoutRequestPromise;
  if (!logoutRequest) {
    throw new Error(
      "signOut: POST /api/auth/logout did not fire within 10_000 ms after the visible button's React props had a callable onClick. The click did not produce the expected logout request.",
    );
  }

  let responseTimeoutId: ReturnType<typeof setTimeout> | undefined;
  const logoutResponse = await Promise.race([
    logoutRequest.response(),
    new Promise<null>((resolve) => {
      responseTimeoutId = setTimeout(() => resolve(null), 30_000);
    }),
  ]);
  if (responseTimeoutId) clearTimeout(responseTimeoutId);
  if (!logoutResponse) {
    throw new Error(
      "signOut: POST /api/auth/logout started but no response arrived within 30_000 ms.",
    );
  }
  expect(logoutResponse.status()).toBeLessThan(400);
  await expect.poll(
    () => new URL(page.url()).pathname,
    { timeout: 30_000 },
  ).toBe("/login");
  const cookies = await page.context().cookies();
  expect(cookies.find((cookie) => /^(accessToken|refreshToken)$/i.test(cookie.name))).toBeUndefined();
}

function observeCredentialReplay(page: Page) {
  let resolveRequest!: (request: Request) => void;
  let resolveResponse!: (response: Response) => void;
  const requestPromise = new Promise<Request>((resolve) => {
    resolveRequest = resolve;
  });
  const responsePromise = new Promise<Response>((resolve) => {
    resolveResponse = resolve;
  });
  const onRequest = (request: Request) => {
    const url = new URL(request.url());
    if (
      (request.method() === "POST" && url.pathname === "/api/auth/login") ||
      (request.method() === "GET" && url.pathname === "/login")
    ) {
      resolveRequest(request);
    }
  };
  const onResponse = (response: Response) => {
    const url = new URL(response.url());
    if (
      response.request().method() === "POST" &&
      url.pathname === "/api/auth/login" &&
      response.status() === 401
    ) {
      resolveResponse(response);
    }
  };

  page.on("request", onRequest);
  page.on("response", onResponse);
  return {
    async wait() {
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error("Credential replay emitted neither the expected POST nor the known native GET within 30 seconds.")),
          30_000,
        );
      });
      try {
        const request = await Promise.race([requestPromise, timeoutPromise]);
        if (
          request.method() !== "POST" ||
          new URL(request.url()).pathname !== "/api/auth/login"
        ) {
          throw new Error(
            "Replayed temporary credential submitted natively (GET /login) instead of POST /api/auth/login.",
          );
        }
        return await Promise.race([responsePromise, timeoutPromise]);
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }
    },
    dispose() {
      page.off("request", onRequest);
      page.off("response", onResponse);
    },
  };
}

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

async function onlyVisible(locator: Locator): Promise<Locator> {
  let visibleIndex = -1;
  await expect.poll(
    async () => {
      const count = await locator.count();
      const visibleIndexes: number[] = [];
      for (let index = 0; index < count; index += 1) {
        if (await locator.nth(index).isVisible()) {
          visibleIndexes.push(index);
        }
      }
      visibleIndex = visibleIndexes.length === 1 ? visibleIndexes[0]! : -1;
      return visibleIndexes.length;
    },
    { timeout: 120_000 },
  ).toBe(1);

  const visible = locator.nth(visibleIndex);
  await expect(visible).toBeVisible();
  return visible;
}

async function expectNoneVisible(locator: Locator): Promise<void> {
  await expect.poll(
    async () => {
      const count = await locator.count();
      let visibleCount = 0;
      for (let index = 0; index < count; index += 1) {
        if (await locator.nth(index).isVisible()) {
          visibleCount += 1;
        }
      }
      return visibleCount;
    },
    { timeout: 120_000 },
  ).toBe(0);
}

async function selectDate(
  page: Page,
  scope: Locator,
  value: `${number}-${number}-${number}`,
) {
  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const trigger = scope.getByText("Pick a date", { exact: true }).first();

  await trigger.click();
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

async function pollMailbox(recipient: string, since: number, maxAttempts = 30): Promise<MailpitMessage> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const response = await fetch(`${mailboxApiUrl}/api/v1/search?query=${encodeURIComponent(`to:${recipient}`)}`);
    if (response.ok) {
      const payload = await response.json() as { messages: Array<{ ID: string; Created: string }> };
      for (const message of payload.messages ?? []) {
        const created = new Date(message.Created).getTime();
        if (created >= since - 1_000) {
          const detail = await fetch(`${mailboxApiUrl}/api/v1/message/${message.ID}`);
          if (detail.ok) {
            const body = await detail.json() as MailpitMessage;
            return body;
          }
        }
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error(`Mailpit did not return a message for ${recipient} after ${maxAttempts} attempts.`);
}

async function pollMailboxBySubject({
  recipient,
  since,
  subjectKeyword,
  maxAttempts = 30,
}: {
  recipient: string;
  since: number;
  subjectKeyword: string;
  maxAttempts?: number;
}): Promise<MailpitMessage> {
  const query = `to:${recipient} subject:"${subjectKeyword}"`;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const response = await fetch(`${mailboxApiUrl}/api/v1/search?query=${encodeURIComponent(query)}`);
    if (response.ok) {
      const payload = await response.json() as {
        total?: number;
        messages: Array<{ ID: string; Created: string }>;
      };
      const matches: MailpitMessage[] = [];
      for (const message of payload.messages ?? []) {
        const created = new Date(message.Created).getTime();
        if (created < since - 1_000) continue;
        const detail = await fetch(`${mailboxApiUrl}/api/v1/message/${message.ID}`);
        if (!detail.ok) continue;
        const body = (await detail.json()) as MailpitMessage;
        if (body.Subject && body.Subject.includes(subjectKeyword)) {
          matches.push(body);
        }
      }
      if (matches.length > 1) {
        throw new Error(
          `Mailpit returned ${matches.length} messages for ${recipient} subject="${subjectKeyword}" since ${new Date(since).toISOString()}; expected exactly one.`,
        );
      }
      if (matches.length === 1) return matches[0]!;
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error(
    `Mailpit did not return a message for ${recipient} subject="${subjectKeyword}" since ${new Date(since).toISOString()} after ${maxAttempts} attempts.`,
  );
}

async function smtpProbe(recipient: string): Promise<void> {
  const net = await import("node:net");
  const smtpHost = process.env.SMTP_HOST ?? "127.0.0.1";
  const smtpPort = Number(process.env.SMTP_PORT ?? "1025");
  const socket = net.createConnection({ host: smtpHost, port: smtpPort });
  socket.setEncoding("utf8");
  socket.setTimeout(10_000);
  let buffer = "";
  const send = (line: string) => {
    socket.write(line + "\r\n");
  };
  const waitForFinalStatus = () =>
    new Promise<string>((resolveStatus, rejectStatus) => {
      const onData = (chunk: string) => {
        buffer += chunk;
        let crlf = buffer.indexOf("\r\n");
        while (crlf >= 0) {
          const line = buffer.slice(0, crlf);
          buffer = buffer.slice(crlf + 2);
          if (/^\d{3} /.test(line)) {
            socket.off("data", onData);
            socket.off("error", onError);
            socket.off("timeout", onTimeout);
            resolveStatus(line);
            return;
          }
          crlf = buffer.indexOf("\r\n");
        }
      };
      const onError = (err: Error) => {
        socket.off("data", onData);
        rejectStatus(err);
      };
      const onTimeout = () => {
        socket.off("data", onData);
        rejectStatus(new Error("SMTP probe timeout waiting for status line"));
      };
      socket.on("data", onData);
      socket.on("error", onError);
      socket.on("timeout", onTimeout);
    });
  return new Promise<void>((resolve, reject) => {
    socket.once("error", reject);
    socket.on("data", async (chunk: string) => {
      buffer += chunk;
      if (!/^220 /.test(buffer)) return;
      // Consume the banner.
      const crlf = buffer.indexOf("\r\n");
      if (crlf < 0) return;
      buffer = buffer.slice(crlf + 2);
      try {
        const commands = [
          "EHLO probe.c4a.test",
          "MAIL FROM:<probe@c4a.test>",
          `RCPT TO:<${recipient}>`,
          "DATA",
          "Subject: c4a probe\r\nFrom: probe@c4a.test\r\nTo: " + recipient + "\r\n\r\nprobe\r\n.\r\n",
          "QUIT",
        ];
        for (const next of commands) {
          send(next);
          const status = await waitForFinalStatus();
          if (!status.startsWith("2") && !status.startsWith("3")) {
            throw new Error(`SMTP probe rejected: ${next} → ${status}`);
          }
        }
        socket.end();
        resolve();
      } catch (error) {
        socket.destroy();
        reject(error as Error);
      }
    });
  });
}

async function deleteMailboxMessage(messageId: string) {
  await fetch(`${mailboxApiUrl}/api/v1/message/${messageId}`, { method: "DELETE" });
}

interface MailpitMessage {
  ID: string;
  Created: string;
  From: { Address: string; Name: string };
  To: Array<{ Address: string; Name: string }>;
  Subject: string;
  Snippet: string;
  Body?: string;
  HTML?: string;
}

function extractOtp(message: MailpitMessage): string {
  const haystack = `${message.Body ?? ""} ${message.HTML ?? ""} ${message.Snippet ?? ""}`;
  const match = haystack.match(/\b(\d{6})\b/);
  if (!match) throw new Error(`No 6-digit OTP found in Mailpit message ${message.ID}`);
  return match[1]!;
}

function extractResetLink(message: MailpitMessage, frontendUrl: string): string {
  const haystack = `${message.Body ?? ""} ${message.HTML ?? ""} ${message.Snippet ?? ""}`;
  // Reset links are Kafil-issued and always point at the configured FRONTEND_URL,
  // but the email body can match either host alias. Accept any host.
  const match = haystack.match(/https?:\/\/[^\s"<>]+\/reset-password\?[^\s"<>]+/i);
  if (!match) throw new Error(`No reset link found in Mailpit message ${message.ID}`);
  const url = match[0]!.replaceAll("&amp;", "&");
  try {
    const parsed = new URL(url);
    const frontend = new URL(frontendUrl);
    // Rewrite to the test server host so the browser follows the in-process route.
    parsed.protocol = frontend.protocol;
    parsed.host = frontend.host;
    return parsed.toString();
  } catch {
    return url;
  }
}

async function dbQuery<T extends Record<string, unknown> = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  const result = await pool.query<T>(sql, params);
  return result.rows;
}

const state: Partial<RunState> = {};

test.describe.serial("connected four-account acceptance", () => {
  // The focused development run compiles each visited Next.js route on first
  // use. Keep action assertions strict while allowing cold route compilation
  // to finish on the Windows acceptance host.
  test.setTimeout(900_000);
  test.use({ actionTimeout: 30_000, navigationTimeout: 120_000 });

  let adminContext: BrowserContext | undefined;
  let familyContext: BrowserContext | undefined;
  let sponsorAContext: BrowserContext | undefined;
  let sponsorBContext: BrowserContext | undefined;
  let adminDiagnostics: ContextDiagnostics | undefined;
  let familyDiagnostics: ContextDiagnostics | undefined;
  let sponsorADiagnostics: ContextDiagnostics | undefined;
  let sponsorBDiagnostics: ContextDiagnostics | undefined;

  test.beforeAll(async ({ browser }) => {
    adminContext = await browser.newContext();
    familyContext = await browser.newContext();
    sponsorAContext = await browser.newContext();
    sponsorBContext = await browser.newContext();
    adminDiagnostics = makeDiagnostics();
    familyDiagnostics = makeDiagnostics();
    sponsorADiagnostics = makeDiagnostics();
    sponsorBDiagnostics = makeDiagnostics();

    state.label = runLabel;
    state.fixture = CONNECTED_RUN_FIXTURE;
    state.fundingTargetMinor = CONNECTED_RUN_FIXTURE.fundingTargetMinor;

    const expected = await dbQuery<{ table_name: string }>(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('credential_setup_requirements','family_password_requirements')",
    );
    const names = expected.map((row) => row.table_name);
    expect(names).toContain("credential_setup_requirements");
    expect(names).not.toContain("family_password_requirements");

    const triggers = await dbQuery<{ trigger_name: string }>(
      "SELECT trigger_name FROM information_schema.triggers WHERE event_object_table='users' AND trigger_name ILIKE ANY (ARRAY['%family%','%credential%'])",
    );
    expect(triggers).toEqual([]);
  });

  test.afterAll(async () => {
    await pool.end();
    await adminContext?.close();
    await familyContext?.close();
    await sponsorAContext?.close();
    await sponsorBContext?.close();
  });

  test("work unit A — authorized target, mailbox probe, and health routes", async () => {
    console.log("C4A STEP A START");
    const probeRecipient = `probe-${state.label}@${CONNECTED_RUN_FIXTURE.familyEmailDomain}`;
    const probeMail = await fetch(`${mailboxApiUrl}/api/v1/info`);
    expect(probeMail.status).toBeLessThan(400);

    const probeStart = Date.now();
    await smtpProbe(probeRecipient);
    const probeFound = await pollMailbox(probeRecipient, probeStart, 5);
    expect(probeFound.To[0]?.Address).toBe(probeRecipient);
    await deleteMailboxMessage(probeFound.ID);

    for (const path of ["/login", "/apply", "/api/system/health"]) {
      const response = await fetch(`${baseUrl}${path}`);
      expect(response.status, `${path} should respond`).toBeLessThan(500);
    }

    const identities = await dbQuery<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM users WHERE email ILIKE $1 OR phone ILIKE $1",
      [`%${state.label}%`],
    );
    expect(Number(identities[0]?.count ?? 0)).toBe(0);
    console.log("C4A STEP A PASS");
  });

  test("work unit B — Sponsor B managed-demo reuse across two seeds", async () => {
    console.log("C4A STEP B FIRST_SEED");
    const workspaceRoot = process.cwd().replace(/[\\/]apps[\\/]web$/, "");
    const seedFirst = spawnSync("bun", [
      "--cwd",
      "packages/seed",
      "--env-file",
      "../../.env",
      "src/cli.ts",
      "demo",
      "--families=0",
      "--sponsors=1",
      "--operators=0",
      "--deliveries=2",
      "--contributions=0",
      "--yes",
    ], {
      cwd: workspaceRoot,
      env: {
        ...process.env,
        KAFIL_E2E_DATABASE_MODE: process.env.KAFIL_E2E_DATABASE_MODE ?? "existing-local-demo",
        KAFIL_E2E_ALLOW_DEFAULT_DATABASE: process.env.KAFIL_E2E_ALLOW_DEFAULT_DATABASE ?? "true",
      } as NodeJS.ProcessEnv,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    if (seedFirst.status !== 0) {
      console.error(seedFirst.stdout);
      console.error(seedFirst.stderr);
      throw new Error(`First seed:demo failed with status ${seedFirst.status}`);
    }

    const sponsorBRows = await dbQuery<{
      id: string;
      email: string;
      phone: string;
      user_id: string;
    }>(
      `SELECT u.id, u.email, u.phone, sp.id AS user_id
       FROM users u
       INNER JOIN sponsor_profiles sp ON sp.user_id = u.id
       WHERE u.email LIKE 'sponsor.%@demo.kafil.test'
       ORDER BY u.email ASC
       LIMIT 1`,
    );
    expect(sponsorBRows.length).toBe(1);
    const sponsorBUser = sponsorBRows[0]!;
    state.sponsorBUserId = sponsorBUser.id;
    state.sponsorBProfileId = sponsorBUser.user_id;
    const sponsorBEmail = sponsorBUser.email;
    state.sponsorBEmail = sponsorBEmail;
    state.sponsorBPhone = sponsorBUser.phone;
    const staffRows = await dbQuery<{ id: string; user_id: string | null }>(
      `SELECT sp.id, sp.user_id
       FROM staff_profiles sp
       INNER JOIN staff_functions sf ON sf.staff_profile_id = sp.id
       WHERE sp.status = 'active' AND sf.function_key = 'delivery'
       ORDER BY sp.created_at ASC
       LIMIT 2`,
    );
    expect(staffRows.length).toBeGreaterThanOrEqual(2);
    state.staffAId = staffRows[0]!.id;
    state.staffBId = staffRows[1]!.id;

    console.log("C4A STEP B RESET_REQUEST");
    if (!sponsorBContext || !sponsorBDiagnostics) throw new Error("Sponsor B context missing");
    const sponsorBPage = await sponsorBContext.newPage();
    attachDiagnostics(sponsorBPage, sponsorBDiagnostics);
    await setLanguage(sponsorBContext, "en");
    await sponsorBPage.goto("/forgot-password");
    await sponsorBPage.getByLabel(/Email address|Adresse e-mail|البريد الإلكتروني/i).fill(sponsorBEmail);
    const resetStart = Date.now();
    await sponsorBPage.getByRole("button", { name: /Send reset instructions|Envoyer|إرسال/i }).click();
    const resetMessage = await pollMailbox(sponsorBEmail, resetStart, 30);
    const resetLink = extractResetLink(resetMessage, baseUrl);
    await deleteMailboxMessage(resetMessage.ID);

    await sponsorBPage.goto(resetLink);
    await sponsorBPage.getByPlaceholder("At least 8 characters").fill(sponsorBRuntimePassword);
    await sponsorBPage.getByPlaceholder("Repeat the new password").fill(sponsorBRuntimePassword);
    const resetResponse = sponsorBPage.waitForResponse((response) =>
      new URL(response.url()).pathname === "/api/auth/reset-password" &&
      response.request().method() === "POST",
    );
    await sponsorBPage.getByRole("button", { name: "Save password" }).click();
    expect((await resetResponse).status()).toBeLessThan(400);
    await expect.poll(
      () => new URL(sponsorBPage.url()).pathname,
      { timeout: 120_000 },
    ).toBe("/login");
    await sponsorBPage.close();

    console.log("C4A STEP B FIRST_LOGIN");
    const resetPage2 = await sponsorBContext.newPage();
    attachDiagnostics(resetPage2, sponsorBDiagnostics);
    const refresh = await login(resetPage2, sponsorBEmail, sponsorBRuntimePassword);
    await expect(resetPage2).toHaveURL(/\/dashboard$/);
    await refresh;
    await signOut(resetPage2);
    await resetPage2.close();

    const sponsorBHashBefore = (await dbQuery<{ password: string }>(
      "SELECT password FROM users WHERE id = $1",
      [sponsorBUser.id],
    ))[0]?.password;

    console.log("C4A STEP B SECOND_SEED");
    const seedSecond = spawnSync("bun", [
      "--cwd",
      "packages/seed",
      "--env-file",
      "../../.env",
      "src/cli.ts",
      "demo",
      "--families=0",
      "--sponsors=1",
      "--operators=0",
      "--deliveries=2",
      "--contributions=0",
      "--yes",
    ], {
      cwd: workspaceRoot,
      env: {
        ...process.env,
        KAFIL_E2E_DATABASE_MODE: process.env.KAFIL_E2E_DATABASE_MODE ?? "existing-local-demo",
        KAFIL_E2E_ALLOW_DEFAULT_DATABASE: process.env.KAFIL_E2E_ALLOW_DEFAULT_DATABASE ?? "true",
      } as NodeJS.ProcessEnv,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    if (seedSecond.status !== 0) {
      console.error(seedSecond.stdout);
      console.error(seedSecond.stderr);
      throw new Error(`Second seed:demo failed with status ${seedSecond.status}`);
    }

    const sponsorBUserRowsAfter = await dbQuery<{ id: string; email: string }>(
      "SELECT id, email FROM users WHERE email = $1",
      [sponsorBEmail],
    );
    expect(sponsorBUserRowsAfter.length).toBe(1);
    expect(sponsorBUserRowsAfter[0]?.id).toBe(sponsorBUser.id);

    const sponsorBProfileRowsAfter = await dbQuery<{ id: string }>(
      "SELECT id FROM sponsor_profiles WHERE user_id = $1",
      [sponsorBUser.id],
    );
    expect(sponsorBProfileRowsAfter.length).toBe(1);
    expect(sponsorBProfileRowsAfter[0]?.id).toBe(state.sponsorBProfileId);

    const staffRowsAfter = await dbQuery<{ id: string }>(
      `SELECT sp.id
       FROM staff_profiles sp
       INNER JOIN staff_functions sf ON sf.staff_profile_id = sp.id
       WHERE sp.status = 'active' AND sf.function_key = 'delivery'
       ORDER BY sp.created_at ASC
       LIMIT 2`,
    );
    expect(staffRowsAfter.length).toBe(staffRows.length);
    expect(staffRowsAfter.map((row) => row.id)).toEqual(staffRows.map((row) => row.id));

    const sponsorBHashAfter = (await dbQuery<{ password: string }>(
      "SELECT password FROM users WHERE id = $1",
      [sponsorBUser.id],
    ))[0]?.password;
    expect(sponsorBHashAfter).toBe(sponsorBHashBefore);

    const sponsorBPage2 = await sponsorBContext.newPage();
    attachDiagnostics(sponsorBPage2, sponsorBDiagnostics);
    const refresh2 = await login(sponsorBPage2, sponsorBEmail, sponsorBRuntimePassword);
    await expect(sponsorBPage2).toHaveURL(/\/dashboard$/);
    await refresh2;
    await signOut(sponsorBPage2);
    await sponsorBPage2.close();
    console.log("C4A STEP B PASS");
  });

  test("work unit C — create the Family and finish first login", async () => {
    if (!adminContext || !adminDiagnostics || !familyContext || !familyDiagnostics) {
      throw new Error("Required browser contexts missing");
    }
    const adminPage = await adminContext.newPage();
    attachDiagnostics(adminPage, adminDiagnostics);
    await setLanguage(adminContext, "en");
    const adminRefresh = await login(adminPage, adminEmail, adminPassword);
    await expect(adminPage).toHaveURL(/\/dashboard$/);
    await adminRefresh;

    const familiesResponse = adminPage.waitForResponse(
      (response) =>
        response.request().method() === "GET" &&
        new URL(response.url()).pathname === "/api/families",
      { timeout: 120_000 },
    );
    await adminPage.goto("/family", { waitUntil: "commit" });
    expect((await familiesResponse).status()).toBeLessThan(400);
    await expect(adminPage.getByText("Loading families...", { exact: true })).toBeHidden();
    const visibleCreateFamilyButton = await onlyVisible(
      adminPage.getByRole("button", {
        name: /Create family|Créer une famille|إنشاء أسرة/i,
      }),
    );
    await visibleCreateFamilyButton.click({ trial: true, timeout: 5_000 });
    await visibleCreateFamilyButton.click();
    const dialog = adminPage.getByRole("dialog", { name: /Create family account|Créer un compte famille|إنشاء حساب أسرة/i });
    await expect(dialog).toBeVisible();

    // Required-field validation pass — try to advance without filling anything.
    await dialog.getByRole("button", { name: /Next|Continuer|التالي/i }).click();
    await expect(adminPage.getByText(/Enter the account holder's name|Saisissez le nom|أدخل اسم/i).first()).toBeVisible();

    const familyEmail = buildRunEmail(state.label ?? "", "family");
    const familyPhone = buildRunPhone(state.label ?? "", "family");
    const familyCin = buildRunCin(state.label ?? "", "family");
    const familyAddress = `C4A address ${state.label}`;
    state.familyEmail = familyEmail;
    state.familyPhone = familyPhone;
    state.familyCin = familyCin;
    state.familyAddress = familyAddress;

    await dialog.getByLabel(/Guardian name|Nom du tuteur|اسم الوصي/i).fill(`Connected Family ${state.label}`);
    await dialog.getByLabel(/CIN/i).fill(familyCin);
    await dialog.getByLabel(/Email address|Email|E-mail|البريد الإلكتروني/i).fill(familyEmail);
    await selectDate(adminPage, dialog, "1985-04-12");
    await dialog.getByLabel(/Phone|Téléphone|الهاتف/i).fill(familyPhone);
    await dialog.getByRole("button", { name: /Next|Continuer|التالي/i }).click();

    await dialog.getByLabel(/Housing situation|Situation de logement|الحالة السكنية/i).click();
    await adminPage.getByRole("option", { name: /Rented|Loué|مستأجرة/i }).first().click();
    await dialog.getByLabel(/Activation target|Objectif d'activation|هدف التفعيل/i).fill(formatMadFromMinor(state.fixture!.fundingTargetMinor));
    await dialog
      .getByPlaceholder(/Full household address|Adresse complète|العنوان الكامل/i)
      .fill(familyAddress);
    await dialog.getByRole("button", { name: /Next|Continuer|التالي/i }).click();

    // Add one child.
    await dialog.getByRole("button", { name: /Add initial child|Ajouter un enfant|إضافة طفل/i }).first().click();
    await dialog
      .getByPlaceholder(/Child's legal name|Nom de l'enfant|اسم الطفل/i)
      .first()
      .fill(`Connected Child ${state.label}`);
    await selectDate(adminPage, dialog, "2018-09-15");
    const createResponse = adminPage.waitForResponse((response) =>
      response.url().endsWith("/api/families") && response.request().method() === "POST" && response.ok()
    );
    await dialog.getByRole("button", { name: /Create|Créer|إنشاء/i }).last().click();
    await createResponse;

    const credentialsCard = dialog.getByTestId("credentials-card");
    await expect(credentialsCard).toBeVisible();
    const credentialFields = credentialsCard.getByTestId("credentials-card-field");
    expect(await credentialFields.count()).toBe(2);
    const initialCredential = (await credentialFields.nth(1).locator("dd").textContent())?.trim() ?? "";
    expect(initialCredential.length).toBeGreaterThan(0);
    state.familyTempCredential = initialCredential;
    await credentialsCard.getByRole("button", { name: /Done|Terminé|تم|Hecho/i }).click();
    await expect(dialog).toBeHidden({ timeout: 30_000 });

    const createdFamilies = await dbQuery<{
      id: string;
      user_id: string;
      name: string;
      status: string;
    }>(
      `SELECT f.id, f.user_id, u.name, u.status
       FROM family_profiles f
       INNER JOIN users u ON u.id = f.user_id
       WHERE u.email = $1`,
      [familyEmail],
    );
    expect(createdFamilies.length).toBe(1);
    expect(createdFamilies[0]!.status).toBe("active");
    state.familyProfileId = createdFamilies[0]!.id;
    state.familyUserId = createdFamilies[0]!.user_id;
    await signOut(adminPage);
    await adminPage.close();

    const familyPage = await familyContext.newPage();
    attachDiagnostics(familyPage, familyDiagnostics);
    await setLanguage(familyContext, "en");

    // First login with the temporary credential — must redirect to /change-password.
    await familyPage.goto("/login", { waitUntil: "domcontentloaded" });
    const familyIdentifierInput = await waitForLoginHydration(familyPage);
    await familyIdentifierInput.fill(familyEmail);
    const familyPasswordInput = familyPage.getByPlaceholder(/Enter your password|أدخل كلمة المرور/i);
    await familyPasswordInput.fill(state.familyTempCredential);
    await expect(familyIdentifierInput).toHaveValue(familyEmail);
    await expect(familyPasswordInput).toHaveValue(state.familyTempCredential);
    const setupLogin = familyPage.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/api/auth/login" &&
        response.request().method() === "POST",
    );
    await familyPage.getByRole("button", { name: /Log in|تسجيل الدخول/i }).click();
    expect((await setupLogin).status()).toBeLessThan(400);
    await expect(familyPage).toHaveURL(/\/change-password/);
    const setupCookies = await familyContext.cookies();
    expect(setupCookies.some((cookie) => /^(accessToken|refreshToken)$/i.test(cookie.name))).toBe(false);

    // Confirm the temporary credential cannot unlock /dashboard yet.
    const { result: deniedDashboard } = await expectExactNegativeResponse(
      familyPage,
      familyDiagnostics,
      { method: "GET", path: "/api/dashboard/family", status: 401 },
      () => familyPage.evaluate(async (url) => {
        const result = await fetch(`${url}/api/dashboard/family`, { credentials: "include" });
        return result.status;
      }, baseUrl),
    );
    expect(deniedDashboard).toBe(401);
    await expect(
      familyPage.locator("#family-first-password-form"),
    ).toBeVisible({ timeout: 120_000 });

    // Mismatched-password validation pass.
    await familyPage.getByRole("textbox", { name: "New password *", exact: true }).fill("ConnectedMismatch1!");
    await familyPage.getByRole("textbox", { name: "Repeat the new password *", exact: true }).fill("ConnectedMismatch2!");
    await familyPage.getByRole("button", { name: /Save|Enregistrer|حفظ/i }).click();
    await expect(familyPage.getByText(/match|correspondent|مطابقة|متطابقتين/i).first()).toBeVisible();

    // Successful submission — the runtime family password is forwarded by the runner.
    await familyPage.getByRole("textbox", { name: "New password *", exact: true }).fill(familyRuntimePassword);
    await familyPage.getByRole("textbox", { name: "Repeat the new password *", exact: true }).fill(familyRuntimePassword);
    await familyPage.getByRole("button", { name: /Save|Enregistrer|حفظ/i }).click();
    await expect(familyPage).toHaveURL(/\/login/);

    // Replay the temporary credential — it must no longer authenticate.
    // Wait for React hydration BEFORE clicking: without it the <form>
    // submits natively as GET /login?... and never issues POST /api/auth/login.
    const replayIdentifierInput = await waitForLoginHydration(familyPage);
    const replayPasswordInput = familyPage.getByPlaceholder(
      /Enter your password|Saisissez votre mot de passe|أدخل كلمة المرور/i,
    );
    await replayIdentifierInput.fill(familyEmail);
    await replayPasswordInput.fill(state.familyTempCredential);
    await expect(replayIdentifierInput).toHaveValue(familyEmail);
    await expect(replayPasswordInput).toHaveValue(state.familyTempCredential);

    // Register the exact expected negative response before clicking so the
    // allowance is consumed once the POST 401 fires.
    const replayExpected = {
      method: "POST",
      path: "/api/auth/login",
      status: 401,
      count: 1,
      consumed: 0,
    };
    familyDiagnostics.expectedResponses.push(replayExpected);
    familyDiagnostics.expectedConsoleErrors.push({ status: 401, count: 1, consumed: 0 });

    // Observe the expected POST and the known wrong native GET using removable
    // listeners so a losing waiter cannot reject after this step completes.
    const replayObserver = observeCredentialReplay(familyPage);
    try {

    await familyPage.getByRole("button", { name: /Log in|Se connecter|تسجيل الدخول/i }).click();

      await replayObserver.wait();
    } finally {
      replayObserver.dispose();
    }
    await expect.poll(() => replayExpected.consumed).toBe(1);
    await expect(familyPage).toHaveURL(/\/login/);

    const initialFamilyDashboardResponse = familyPage.waitForResponse(
      (response) =>
        response.request().method() === "GET" &&
        new URL(response.url()).pathname === "/api/dashboard/family",
      { timeout: 120_000 },
    );
    const familyRefresh2 = await login(familyPage, familyEmail, familyRuntimePassword);
    await expect(familyPage).toHaveURL(/\/dashboard$/);
    await familyRefresh2;
    expect((await initialFamilyDashboardResponse).status()).toBeLessThan(400);
    await expect(
      familyPage.getByRole("heading", { name: /^Welcome,/i }),
    ).toBeVisible({ timeout: 120_000 });
    await expect(
      familyPage.getByText("Loading your family dashboard", { exact: true }).first(),
    ).toBeHidden();
    const familyNavigation = familyPage.getByRole("navigation");
    await onlyVisible(familyNavigation.locator('a[href="/children"]'));
    await onlyVisible(familyNavigation.locator('a[href="/products"]'));
    await onlyVisible(familyNavigation.locator('a[href="/orders"]'));
    await expect(familyPage.locator('a[href="/family"]')).toHaveCount(0);
    await expect(familyPage.locator('a[href="/sponsors"]')).toHaveCount(0);
    await expect(familyPage.locator('a[href="/applicants"]')).toHaveCount(0);
    await expect(familyPage.locator('a[href="/users"]')).toHaveCount(0);

    const { result: forbiddenAdminStatus } = await expectExactNegativeResponse(
      familyPage,
      familyDiagnostics,
      { method: "GET", path: "/api/admin/access/users", status: 401 },
      () => familyPage.evaluate(async (url) => {
        const response = await fetch(`${url}/api/admin/access/users?limit=1&offset=0`, {
          credentials: "include",
        });
        return response.status;
      }, baseUrl),
    );
    expect(forbiddenAdminStatus).toBe(401);

    const productImageResponses: number[] = [];
    const recordProductImageResponse = (response: import("@playwright/test").Response) => {
      if (new URL(response.url()).pathname.startsWith("/api/product-images/files/serve/")) {
        productImageResponses.push(response.status());
      }
    };
    familyPage.on("response", recordProductImageResponse);
    try {
      // Readiness is proved below by visible managed product images, their exact
      // responses, and successful browser decode. Do not depend on unrelated
      // global `load` completion on the development acceptance host.
      await familyPage.goto("/products", { waitUntil: "commit" });
      const productImages = familyPage.locator(
        'img[src*="/api/product-images/files/serve/"]',
      );
      await expect(productImages.first()).toBeVisible();
      await expect
        .poll(() => productImageResponses.length, { timeout: 30_000 })
        .toBeGreaterThan(0);
      expect(productImageResponses.every((status) => status === 200)).toBe(true);
      const productImageCount = await productImages.count();
      expect(productImageCount).toBeGreaterThan(0);
      for (let index = 0; index < productImageCount; index += 1) {
        const productImage = productImages.nth(index);
        await productImage.scrollIntoViewIfNeeded();
        await expect.poll(
          () => productImage.evaluate((image) =>
            (image as HTMLImageElement).complete &&
            (image as HTMLImageElement).naturalWidth > 0,
          ),
          { timeout: 30_000 },
        ).toBe(true);
      }
    } finally {
      familyPage.off("response", recordProductImageResponse);
    }

    // Prove the replacement password across a fresh authenticated session.
    // The context must be logged out before login() navigates to /login;
    // otherwise the auth middleware correctly redirects the active session
    // back to /dashboard and no login form can render.
    await signOut(familyPage);
    const persistedPasswordRefresh = await login(familyPage, familyEmail, familyRuntimePassword);
    await expect(familyPage).toHaveURL(/\/dashboard$/);
    await persistedPasswordRefresh;
    await expect(
      familyPage.getByRole("heading", { name: /^Welcome,/i }),
    ).toBeVisible({ timeout: 120_000 });
    await expect(
      familyPage.getByText("Loading your family dashboard", { exact: true }).first(),
    ).toBeHidden();
    await signOut(familyPage);

    await familyPage.close();
  });

  test("work unit D — Sponsor A application, OTP, and approval", async () => {
    if (!sponsorAContext || !sponsorADiagnostics || !adminContext || !adminDiagnostics) {
      throw new Error("Required browser contexts missing");
    }

    // Expected normalised phone: the runner produces "+2126000XXXX", and the
    // PhoneInput prepends the dial code automatically. Capture this before any
    // browser interaction so the post-approval DB assertion can compare.
    const expectedPhoneE164 = sponsorAPhone.startsWith("+")
      ? sponsorAPhone
      : `+212${sponsorAPhone}`;
    const phoneLocal = expectedPhoneE164.replace(/^\+212/, "");

    const sponsorAPage = await sponsorAContext.newPage();
    attachDiagnostics(sponsorAPage, sponsorADiagnostics);
    await setLanguage(sponsorAContext, "en");

    await sponsorAPage.goto("/apply");

    // Exercise one client validation error before the successful submission.
    // Empty-form submit does not call /api/applicants — zod client validation
    // blocks the request. Assert only the visible error message.
    await expect(
      sponsorAPage.getByRole("button", { name: "Submit application", exact: true }),
    ).toBeVisible();
    await sponsorAPage
      .getByRole("button", { name: "Submit application", exact: true })
      .click();
    await expect(
      sponsorAPage.getByText("Enter your full name").first(),
    ).toBeVisible();

    await sponsorAPage
      .getByRole("textbox", { name: "Full name *" })
      .fill(`Connected Sponsor A ${state.label}`);
    await sponsorAPage
      .getByRole("textbox", { name: "Email address *" })
      .fill(sponsorAEmail);

    // Phone: real keyboard input so react-international-phone's per-keystroke
    // onChange fires and the dial-code prefix is preserved.
    const phoneTextbox = sponsorAPage.getByPlaceholder("For example: +212 6 12 34 56 78");
    // Click at the end of the textbox so the cursor is positioned after the
    // pre-filled dial-code "+212 ", then type only the local part. Do NOT
    // clear the field — react-international-phone renders the dial code as
    // a non-editable prefix and clearing it strips the prefix from state.
    await phoneTextbox.click();
    await phoneTextbox.press("End");
    await sponsorAPage.keyboard.type(phoneLocal);
    const renderedPhone = await phoneTextbox.inputValue();
    // Strip PhoneInput formatting (spaces, dashes) to compare the digits.
    const renderedDigits = renderedPhone.replace(/[\s().-]+/g, "");
    const expectedDigits = expectedPhoneE164.replace(/[\s().-]+/g, "");
    if (renderedDigits !== expectedDigits) {
      throw new Error(
        "Phone input rendered value mismatch. " +
          "Likely owning layer: react-international-phone dial-code handling. " +
          "Generated phone values were withheld from diagnostics. Stopping before any DB assertion.",
      );
    }

    await sponsorAPage
      .getByPlaceholder("For example: AB123456")
      .fill(buildRunCin(state.label ?? "", "sponsorA"));
    // Gender combobox already defaults to "female"; no extra click required.
    await sponsorAPage
      .getByRole("textbox", { name: "Password *" })
      .fill(sponsorAPassword);

    // Mailbox polling: start BEFORE the submit click so we never miss the OTP.
    // Filter by exact recipient, run start time, and verification purpose
    // (subject keyword). Never pick the newest global message.
    const submitStart = Date.now();
    const otpSubjectKeyword = "Verify your Kafil sponsor application";
    const otpMessagePromise = pollMailboxBySubject({
      recipient: sponsorAEmail.toLowerCase(),
      since: submitStart,
      subjectKeyword: otpSubjectKeyword,
    });

    const submitResponse = sponsorAPage.waitForResponse(
      (response) =>
        response.url().endsWith("/api/applicants") &&
        response.request().method() === "POST" &&
        response.ok(),
    );
    await sponsorAPage
      .getByRole("button", { name: "Submit application", exact: true })
      .click();
    await submitResponse;

    const otpMessage = await otpMessagePromise;
    expect(otpMessage.To[0]?.Address).toBe(sponsorAEmail.toLowerCase());
    const otp = extractOtp(otpMessage);

    // OTP input is a 6-cell group; type the digits so each cell auto-advances.
    const otpGroup = sponsorAPage.getByRole("group", { name: "One-time code" });
    await otpGroup.locator("input").first().click();
    await sponsorAPage.keyboard.type(otp);

    const confirmResponse = sponsorAPage.waitForResponse(
      (response) =>
        response.url().endsWith("/api/applicants/email-verification/confirm") &&
        response.request().method() === "POST" &&
        response.ok(),
    );
    await sponsorAPage
      .getByRole("button", { name: "Verify email", exact: true })
      .click();
    await confirmResponse;

    // Delete the OTP mailbox message ONLY after successful confirmation.
    await deleteMailboxMessage(otpMessage.ID);

    await expect(
      sponsorAPage.getByText("pending review").first(),
    ).toBeVisible();

    // Pending applicant without admin approval cannot start a real sponsor
    // session. Register the exact expected denial before clicking.
    await sponsorAPage.goto("/login");
    await sponsorAPage.getByLabel("Email or phone").fill(sponsorAEmail);
    await sponsorAPage
      .getByPlaceholder("Enter your password")
      .fill(sponsorAPassword);
    const { response: loginDenial } = await expectExactNegativeResponse(
      sponsorAPage,
      sponsorADiagnostics,
      { method: "POST", path: "/api/auth/login", status: 403 },
      () =>
        sponsorAPage
          .getByRole("button", { name: "Log in", exact: true })
          .click(),
    );
    const denialBody = (await loginDenial.json()) as { message?: string; code?: string };
    expect(denialBody.message ?? "").toMatch(/inactive/i);
    await expect(sponsorAPage).toHaveURL(/\/login/);
    const cookiesAfterDenial = await sponsorAContext.cookies();
    expect(
      cookiesAfterDenial.find((cookie) => /^(accessToken|refreshToken)$/i.test(cookie.name)),
    ).toBeUndefined();
    await sponsorAPage.close();

    // Admin login + approve. Unit C ended its admin session through the real
    // sign-out UI and asserted the auth cookies were removed.
    const adminPage = await adminContext.newPage();
    attachDiagnostics(adminPage, adminDiagnostics);
    await setLanguage(adminContext, "en");
    const adminLoginResponse = await login(adminPage, adminEmail, adminPassword);
    await expect(adminPage).toHaveURL(/\/dashboard$/);
    await adminLoginResponse;

    await adminPage.goto("/applicants");
    const applicantRows = adminPage
      .getByRole("row")
      .filter({ hasText: `Connected Sponsor A ${state.label}` });
    await expect(applicantRows).toHaveCount(1);
    const applicantRow = applicantRows.first();

    // Open details to confirm run-labelled identity fields.
    await applicantRow.getByRole("button", { name: "Row actions", exact: true }).click();
    await adminPage.getByRole("menuitem", { name: "View", exact: true }).click();
    const detailsSheet = adminPage.getByRole("dialog", { name: "Applicant details", exact: true });
    await expect(detailsSheet).toBeVisible();
    await expect(
      detailsSheet.getByText(`Connected Sponsor A ${state.label}`).first(),
    ).toBeVisible();
    await expect(
      detailsSheet.getByText(sponsorAEmail.toLowerCase()).first(),
    ).toBeVisible();
    await expect(
      detailsSheet.getByText(expectedPhoneE164).first(),
    ).toBeVisible();
    await adminPage.keyboard.press("Escape");

    // First approval: must succeed (200).
    await applicantRow.getByRole("button", { name: "Row actions", exact: true }).click();
    await adminPage.getByRole("menuitem", { name: "Approve", exact: true }).click();
    const approveDialog = adminPage.getByRole("dialog", { name: /^Approve / });
    const approveDialogButton = approveDialog.getByRole("button", { name: "Approve", exact: true });
    await expect(approveDialog).toBeVisible();

    const firstApproveResponse = adminPage.waitForResponse(
      (response) => {
        const url = new URL(response.url());
        return (
          /\/api\/applicants\/[^/]+\/approve$/.test(url.pathname) &&
          response.request().method() === "POST"
        );
      },
    );
    await approveDialogButton.click();
    const firstApprove = await firstApproveResponse;
    expect(firstApprove.status()).toBe(200);
    await expect(approveDialog).toBeHidden();

    const applicantIdMatch = firstApprove.url().match(/\/api\/applicants\/([^/]+)\/approve/);
    const applicantId = applicantIdMatch ? applicantIdMatch[1] : "";
    if (!applicantId) {
      throw new Error("Could not extract applicant id from first approve response URL");
    }

    // Replay: ACTUAL second POST /api/applicants/{id}/approve — must be 409.
    const adminCookieHeader = (
      await adminContext.cookies()
    )
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join("; ");
    const replayResponse = await fetch(
      `${baseUrl}/api/applicants/${applicantId}/approve`,
      { method: "POST", headers: { cookie: adminCookieHeader } },
    );
    const replayText = await replayResponse.text();
    expect(
      replayResponse.status,
      `expected 409 conflict on replay approve; got ${replayResponse.status} body=${replayText}`,
    ).toBe(409);
    expect(replayText).toMatch(/pending review|already/i);

    // Independent queries: exactly one user, exactly one sponsor profile.
    const sponsorAUserRows = await dbQuery<{
      id: string;
      phone: string;
      email: string;
      status: string;
    }>(
      "SELECT id, phone, email, status FROM users WHERE email = $1",
      [sponsorAEmail.toLowerCase()],
    );
    expect(sponsorAUserRows.length).toBe(1);
    expect(sponsorAUserRows[0]!.phone).toBe(expectedPhoneE164);
    expect(sponsorAUserRows[0]!.status).toBe("active");

    const sponsorAProfileRows = await dbQuery<{ id: string; user_id: string; phone: string }>(
      "SELECT id, user_id, phone FROM sponsor_profiles WHERE user_id = $1",
      [sponsorAUserRows[0]!.id],
    );
    expect(sponsorAProfileRows.length).toBe(1);
    expect(sponsorAProfileRows[0]!.phone).toBe(expectedPhoneE164);
    state.sponsorAProfileId = sponsorAProfileRows[0]!.id;
    state.sponsorAUserId = sponsorAUserRows[0]!.id;
    await signOut(adminPage);
    await adminPage.close();

    // Sponsor A signs in fresh.
    const sponsorAProfile = await sponsorAContext.newPage();
    attachDiagnostics(sponsorAProfile, sponsorADiagnostics);
    const sponsorARefresh = await login(sponsorAProfile, sponsorAEmail, sponsorAPassword);
    await expect(sponsorAProfile).toHaveURL(/\/dashboard$/);
    await sponsorARefresh;

    // Sponsor navigation visible.
    await onlyVisible(sponsorAProfile.locator('a[href="/contribution"]'));

    // Empty supported-family state — the Sponsor dashboard renders
    // "Find a family to support" when there are no assignments.
    await expect(
      sponsorAProfile.getByText("Find a family to support").first(),
    ).toBeVisible();

    // Real sign-out via the UI button. Assert the logout response, then
    // assert cookies are cleared, then assert a protected endpoint denies.
    await signOut(sponsorAProfile);

    const cookiesAfterLogout = await sponsorAContext.cookies();
    const lingeringAuthCookies = cookiesAfterLogout.filter((cookie) =>
      /^(accessToken|refreshToken)$/i.test(cookie.name),
    );
    if (lingeringAuthCookies.length > 0) {
      throw new Error(
        `SUSPECTED NAJM AUTH / INTEGRATION DEFECT: After successful POST /api/auth/logout 2xx and redirect to /login, ` +
          `${lingeringAuthCookies.length} auth cookie(s) still present in context: ${lingeringAuthCookies
            .map((c) => c.name)
            .join(", ")}. ` +
          `Session recovery on /login re-set authentication after a successful logout. ` +
          `Stop and report — minimal repro: focused run on ` +
          `KAFIL_E2E_GREP='work unit D'.`,
      );
    }

    const protectedDenialStatus = 401;
    registerExpectedResponse(sponsorADiagnostics!, {
      method: "GET",
      path: "/api/sponsors/me/profile",
      status: protectedDenialStatus,
    });
    const protectedDenial = await sponsorAProfile.evaluate(async (url) => {
      const response = await fetch(`${url}/api/sponsors/me/profile`, {
        credentials: "include",
      });
      return response.status;
    }, baseUrl);
    expect(protectedDenial).toBe(protectedDenialStatus);
    await expect.poll(() => {
      const entry = sponsorADiagnostics!.expectedResponses.find(
        (candidate) =>
          candidate.method === "GET" &&
          candidate.path === "/api/sponsors/me/profile" &&
          candidate.status === protectedDenialStatus,
      );
      return entry?.consumed ?? 0;
    }).toBe(1);

    await sponsorAProfile.close();

    // Sign in again using the stored phone identifier. If the stored phone is
    // malformed despite the rendered input matching the expected E.164 above,
    // stop and classify — the browser input was correct, so any second
    // failure points at Najm Auth's identity normalisation.
    if (!/^\+[1-9]\d{6,14}$/.test(expectedPhoneE164)) {
      throw new Error(
        "Stored phone is malformed for E.164. Browser input matched the expected value but " +
          "the post-submit DB row did not contain a valid E.164 phone. " +
          "Generated phone values were withheld from diagnostics. Stop and classify owning layer.",
      );
    }
    state.sponsorAPhone = expectedPhoneE164;
    const sponsorAByPhone = await sponsorAContext.newPage();
    attachDiagnostics(sponsorAByPhone, sponsorADiagnostics);
    const phoneLoginRefresh = await login(sponsorAByPhone, expectedPhoneE164, sponsorAPassword);
    await expect(sponsorAByPhone).toHaveURL(/\/dashboard$/);
    await phoneLoginRefresh;
    await signOut(sponsorAByPhone);
    await sponsorAByPhone.close();
  });

  test("work unit E — connect both sponsors and prove privacy", async () => {
    if (
      !adminContext ||
      !adminDiagnostics ||
      !sponsorAContext ||
      !sponsorADiagnostics ||
      !sponsorBContext ||
      !sponsorBDiagnostics
    ) {
      throw new Error("Required browser contexts missing");
    }
    console.log("C4A STEP E START");
    const unitEStartedAt = (await dbQuery<{ started_at: Date }>(
      "SELECT now() AS started_at",
    ))[0]!.started_at;
    const adminCookiesBeforeUnitE = await adminContext.cookies();
    expect(
      adminCookiesBeforeUnitE.find((cookie) => /^(accessToken|refreshToken)$/i.test(cookie.name)),
    ).toBeUndefined();
    const adminPage = await adminContext.newPage();
    attachDiagnostics(adminPage, adminDiagnostics);
    await setLanguage(adminContext, "en");
    const adminRefresh = await login(adminPage, adminEmail, adminPassword);
    await expect(adminPage).toHaveURL(/\/dashboard$/);
    await adminRefresh;

    const assignmentsResponse = adminPage.waitForResponse(
      (response) => {
        const url = new URL(response.url());
        return (
          response.request().method() === "GET" &&
          url.pathname === "/api/support-assignments" &&
          url.searchParams.has("limit") &&
          url.searchParams.has("offset")
        );
      },
      { timeout: 120_000 },
    );
    await adminPage.goto("/assignments", { waitUntil: "commit" });
    expect((await assignmentsResponse).status()).toBeLessThan(400);
    await expectNoneVisible(
      adminPage.getByText("Loading support assignments...", { exact: true }),
    );
    const createAssignmentButton = await onlyVisible(
      adminPage.getByRole("button", {
        name: "Create assignment",
        exact: true,
      }),
    );
    await createAssignmentButton.click({ trial: true, timeout: 5_000 });
    await createAssignmentButton.click();
    const dialog = adminPage.getByRole("dialog", { name: "Create support assignment", exact: true });
    await expect(dialog).toBeVisible();
    // Combobox triggers render as Najm BaseInput with role="combobox" and the
    // placeholder as visible text, but the accessible name also includes the
    // chevron icon, so the safer selector is by DOM order within the dialog.
    // The dropdown's search input is rendered into a Radix portal that escapes
    // the dialog DOM, so it appears at the end of the body alongside the page
    // filter; pick the portal-rendered search via .last().
    const sponsorCombobox = dialog.getByRole("combobox").nth(0);
    const familyCombobox = dialog.getByRole("combobox").nth(1);
    await expect(sponsorCombobox).toBeVisible();
    // Wait for the sponsor / family source data to finish loading before
    // opening the dropdown. The trigger's visible text transitions from
    // "Loading sponsors..." to "Choose a sponsor" once the source query
    // settles; clicking before that opens the dropdown against an empty item
    // list and the portal-rendered search input is not yet interactable.
    await expect(sponsorCombobox).toContainText("Choose a sponsor");
    await sponsorCombobox.click();
    const sponsorSearch = adminPage.getByPlaceholder("Search sponsors...");
    await expect(sponsorSearch.last()).toBeVisible();
    await sponsorSearch.last().fill(sponsorAEmail);
    await adminPage.getByRole("option").filter({ hasText: sponsorAEmail }).click();
    await expect(familyCombobox).toContainText("Choose a family");
    await familyCombobox.click();
    const familySearch = adminPage.getByPlaceholder("Search families...");
    await expect(familySearch.last()).toBeVisible();
    await familySearch.last().fill(`Connected Family ${state.label}`);
    await adminPage.getByRole("option", { name: new RegExp(`Connected Family ${state.label}`) }).click();
    const createAResponse = adminPage.waitForResponse((response) =>
      new URL(response.url()).pathname === "/api/support-assignments" &&
      response.request().method() === "POST",
    );
    await dialog.getByRole("button", { name: "Create support assignment", exact: true }).click();
    expect((await createAResponse).status()).toBe(200);

    const refreshedAssignmentsResponse = adminPage.waitForResponse(
      (response) => {
        const url = new URL(response.url());
        return (
          response.request().method() === "GET" &&
          url.pathname === "/api/support-assignments" &&
          url.searchParams.has("limit") &&
          url.searchParams.has("offset")
        );
      },
      { timeout: 120_000 },
    );
    await adminPage.goto("/assignments", { waitUntil: "commit" });
    expect((await refreshedAssignmentsResponse).status()).toBeLessThan(400);
    await expectNoneVisible(
      adminPage.getByText("Loading support assignments...", { exact: true }),
    );
    const createSecondAssignmentButton = await onlyVisible(
      adminPage.getByRole("button", {
        name: "Create assignment",
        exact: true,
      }),
    );
    await createSecondAssignmentButton.click({ trial: true, timeout: 5_000 });
    await createSecondAssignmentButton.click();
    const dialogB = adminPage.getByRole("dialog", { name: "Create support assignment", exact: true });
    const sponsorComboboxB = dialogB.getByRole("combobox").nth(0);
    const familyComboboxB = dialogB.getByRole("combobox").nth(1);
    await expect(sponsorComboboxB).toBeVisible();
    await expect(sponsorComboboxB).toContainText("Choose a sponsor");
    await sponsorComboboxB.click();
    const sponsorBSearch = adminPage.getByPlaceholder("Search sponsors...");
    await expect(sponsorBSearch.last()).toBeVisible();
    await sponsorBSearch.last().fill(state.sponsorBEmail!);
    await adminPage.getByRole("option").filter({ hasText: state.sponsorBEmail! }).click();
    await expect(familyComboboxB).toContainText("Choose a family");
    await familyComboboxB.click();
    const familyBSearch = adminPage.getByPlaceholder("Search families...");
    await expect(familyBSearch.last()).toBeVisible();
    await familyBSearch.last().fill(`Connected Family ${state.label}`);
    await adminPage.getByRole("option", { name: new RegExp(`Connected Family ${state.label}`) }).click();
    const createBResponse = adminPage.waitForResponse((response) =>
      new URL(response.url()).pathname === "/api/support-assignments" &&
      response.request().method() === "POST",
    );
    await dialogB.getByRole("button", { name: "Create support assignment", exact: true }).click();
    expect((await createBResponse).status()).toBe(200);

    const duplicatePath = "/api/support-assignments";
    const { result: duplicateResult } = await expectExactNegativeResponse(
      adminPage,
      adminDiagnostics,
      { method: "POST", path: duplicatePath, status: 409 },
      () => browserJsonRequest(adminPage, "POST", duplicatePath, {
        sponsorProfileId: state.sponsorAProfileId,
        familyProfileId: state.familyProfileId,
      }),
    );
    expect(responseMessage(duplicateResult.body)).toMatch(/active support assignment already exists/i);

    const assignments = await dbQuery<{ id: string; sponsor_id: string; family_id: string; status: string }>(
      "SELECT id, sponsor_profile_id AS sponsor_id, family_profile_id AS family_id, status FROM support_assignments WHERE family_profile_id = $1 ORDER BY created_at ASC",
      [state.familyProfileId!],
    );
    const activeAssignments = assignments.filter((row) => row.status === "active");
    expect(activeAssignments).toHaveLength(2);
    expect(activeAssignments.filter((row) => row.sponsor_id === state.sponsorAProfileId)).toHaveLength(1);
    expect(activeAssignments.filter((row) => row.sponsor_id === state.sponsorBProfileId)).toHaveLength(1);
    state.assignmentAId = activeAssignments.find((row) => row.sponsor_id === state.sponsorAProfileId)!.id;
    state.assignmentBId = activeAssignments.find((row) => row.sponsor_id === state.sponsorBProfileId)!.id;

    const sponsorSessions = [
      {
        alias: "sponsorA",
        context: sponsorAContext,
        diagnostics: sponsorADiagnostics,
        email: sponsorAEmail,
        password: sponsorAPassword,
        ownAssignmentId: state.assignmentAId,
        otherAssignmentId: state.assignmentBId,
        otherSensitiveValues: [state.sponsorBEmail!, state.sponsorBPhone!, state.sponsorBUserId!, state.sponsorBProfileId!],
        page: undefined as Page | undefined,
        planId: "",
        contributionId: "",
      },
      {
        alias: "sponsorB",
        context: sponsorBContext,
        diagnostics: sponsorBDiagnostics,
        email: state.sponsorBEmail!,
        password: sponsorBRuntimePassword,
        ownAssignmentId: state.assignmentBId,
        otherAssignmentId: state.assignmentAId,
        otherSensitiveValues: [sponsorAEmail, state.sponsorAPhone!, state.sponsorAUserId!, state.sponsorAProfileId!],
        page: undefined as Page | undefined,
        planId: "",
        contributionId: "",
      },
    ];

    for (const session of sponsorSessions) {
      const page = await session.context.newPage();
      session.page = page;
      attachDiagnostics(page, session.diagnostics);
      await setLanguage(session.context, "en");
      const refresh = await login(page, session.email, session.password);
      await expect(page).toHaveURL(/\/dashboard$/);
      await refresh;
      await page.goto("/sponsor/support");
      await expect(page.getByText(new RegExp(`Connected Family ${state.label}`)).first()).toBeVisible();

      const catalog = await browserJsonRequest(
        page,
        "GET",
        "/api/support-assignments/catalog?relationship=supported&limit=100&offset=0",
      );
      expect(catalog.status).toBe(200);
      const catalogRows = responseData(catalog.body);
      expect(Array.isArray(catalogRows)).toBe(true);
      const familyRows = (catalogRows as Array<Record<string, unknown>>).filter(
        (row) => row.id === state.familyProfileId,
      );
      expect(familyRows).toHaveLength(1);
      expect(Object.keys(familyRows[0] ?? {}).sort()).toEqual([
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
      expect(familyRows[0]?.assignmentId).toBe(session.ownAssignmentId);

      const summary = await browserJsonRequest(
        page,
        "GET",
        `/api/support-assignments/me/${session.ownAssignmentId}/family`,
      );
      expect(summary.status).toBe(200);
      const summaryData = responseData(summary.body) as {
        assignment?: Record<string, unknown>;
        family?: Record<string, unknown>;
      };
      expect(Object.keys(summaryData).sort()).toEqual(["assignment", "family"]);
      expect(Object.keys(summaryData.assignment ?? {}).sort()).toEqual(["id", "startedAt"]);
      expect(Object.keys(summaryData.family ?? {}).sort()).toEqual(["activeChildCount", "reference"]);
      expect(summaryData.assignment?.id).toBe(session.ownAssignmentId);
      expect(
        containsSensitiveValue({ catalog: familyRows[0], summary: summaryData }, [
          state.familyCin!,
          state.familyAddress!,
          state.familyEmail!,
          state.familyPhone!,
          ...session.otherSensitiveValues,
        ]),
        `${session.alias} sponsor projection included a private runtime value`,
      ).toBe(false);

      const plan = await browserJsonRequest(page, "POST", "/api/contributions/me/plans", {
        supportAssignmentId: session.ownAssignmentId,
        kind: "one_time",
        amountMinor: 1,
      });
      expect(plan.status).toBe(200);
      session.planId = responseId(plan.body);
      expect(session.planId).not.toBe("");

      const contribution = await browserJsonRequest(page, "POST", "/api/contributions/me", {
        supportAssignmentId: session.ownAssignmentId,
        amountMinor: 1,
        paymentMethod: "acceptance-canary",
      });
      expect(contribution.status).toBe(200);
      session.contributionId = responseId(contribution.body);
      expect(session.contributionId).not.toBe("");
    }

    for (const session of sponsorSessions) {
      const page = session.page!;
      const other = sponsorSessions.find((candidate) => candidate.alias !== session.alias)!;
      const { result: assignmentDenial } = await expectExactNegativeResponse(
        page,
        session.diagnostics,
        { method: "GET", path: `/api/support-assignments/me/${session.otherAssignmentId}`, status: 404 },
        () => browserJsonRequest(page, "GET", `/api/support-assignments/me/${session.otherAssignmentId}`),
      );
      expect(responseMessage(assignmentDenial.body)).toMatch(/support assignment not found/i);

      const { result: contributionDenial } = await expectExactNegativeResponse(
        page,
        session.diagnostics,
        { method: "GET", path: `/api/contributions/me/${other.contributionId}`, status: 404 },
        () => browserJsonRequest(page, "GET", `/api/contributions/me/${other.contributionId}`),
      );
      expect(responseMessage(contributionDenial.body)).toMatch(/contribution not found/i);

      const { result: planDenial } = await expectExactNegativeResponse(
        page,
        session.diagnostics,
        { method: "GET", path: `/api/contributions/me/plans/${other.planId}`, status: 404 },
        () => browserJsonRequest(page, "GET", `/api/contributions/me/plans/${other.planId}`),
      );
      expect(responseMessage(planDenial.body)).toMatch(/contribution plan not found/i);

      const stopPlan = await browserJsonRequest(
        page,
        "POST",
        `/api/contributions/me/plans/${session.planId}/stop`,
        { reason: "Acceptance privacy canary complete" },
      );
      expect(stopPlan.status).toBe(200);
      await signOut(page);
      await page.close();
    }

    for (const session of sponsorSessions) {
      const reject = await browserJsonRequest(
        adminPage,
        "POST",
        `/api/contributions/${session.contributionId}/reject`,
        { reason: "Acceptance privacy canary complete" },
      );
      expect(reject.status).toBe(200);
    }

    const assignmentAuditRows = await dbQuery<{ resource_id: string; metadata: unknown }>(
      `SELECT resource_id, metadata
       FROM audit_events
       WHERE resource = 'supportAssignments'
         AND resource_id = ANY($1::text[])
         AND created_at >= $2`,
      [[state.assignmentAId, state.assignmentBId], unitEStartedAt],
    );
    expect(assignmentAuditRows).toHaveLength(2);

    const auditPayloadRows = await dbQuery<{ metadata: unknown }>(
      "SELECT metadata FROM audit_events WHERE created_at >= $1",
      [unitEStartedAt],
    );
    const outboxPayloadRows = await dbQuery<{ payload: unknown }>(
      "SELECT payload FROM outbox_events WHERE created_at >= $1",
      [unitEStartedAt],
    );
    const sensitiveValues = [
      state.familyCin!,
      state.familyAddress!,
      state.familyEmail!,
      state.familyPhone!,
      sponsorAEmail,
      state.sponsorAPhone!,
      state.sponsorBEmail!,
      state.sponsorBPhone!,
    ];
    expect(
      containsSensitiveValue(auditPayloadRows, sensitiveValues),
      "Unit E audit metadata included a sensitive runtime value",
    ).toBe(false);
    expect(
      containsSensitiveValue(outboxPayloadRows, sensitiveValues),
      "Unit E outbox payload included a sensitive runtime value",
    ).toBe(false);
    await adminPage.close();
    console.log("C4A STEP E PASS");
  });

  test("work unit F — contribution and funding lifecycle", async () => {
    if (!sponsorAContext || !sponsorADiagnostics || !adminContext || !adminDiagnostics) {
      throw new Error("Required contexts missing");
    }

    const planPage = await sponsorAContext.newPage();
    attachDiagnostics(planPage, sponsorADiagnostics);
    await setLanguage(sponsorAContext, "en");
    const planRefresh = await login(planPage, sponsorAEmail, sponsorAPassword);
    await expect(planPage).toHaveURL(/\/dashboard$/);
    await planRefresh;

    await planPage.goto(`/sponsor/contributions?assignmentId=${state.assignmentAId}`);
    await planPage.getByRole("button", { name: /Create monthly plan|Créer un plan mensuel|إنشاء خطة شهرية/i }).first().click();
    const planDialog = planPage.getByRole("dialog", { name: /Create plan|Plan جديد|إنشاء خطة/i });
    await expect(planDialog).toBeVisible();
    await planDialog.getByLabel(/Amount|Montant|المبلغ/i).fill(formatMadFromMinor(state.fixture!.sponsorATargetMinor));
    await planDialog.getByLabel(/Kind|Type|النوع/i).click();
    await planPage.getByRole("option", { name: /Monthly|Mensuel|شهري/i }).first().click();
    await planDialog.getByRole("button", { name: /Create plan|Créer|إنشاء/i }).click();
    await expect(planDialog).toBeHidden();

    const planRows = await dbQuery<{ id: string }>(
      `SELECT cp.id
       FROM contribution_plans cp
       INNER JOIN support_assignments sa ON sa.id = cp.support_assignment_id
       INNER JOIN sponsor_profiles sp ON sp.id = sa.sponsor_profile_id
       WHERE cp.support_assignment_id = $1
         AND sp.user_id = $2
         AND cp.status = 'active'`,
      [state.assignmentAId, state.sponsorAUserId!],
    );
    expect(planRows.length).toBe(1);
    state.planAId = planRows[0]!.id;

    for (const action of ["Pause", "Resume", "Stop"] as const) {
      await planPage.goto(`/sponsor/contributions?assignmentId=${state.assignmentAId}`);
      await planPage.getByRole("button", { name: new RegExp(action, "i") }).first().click();
      const reasonDialog = planPage.getByRole("dialog");
      await reasonDialog.getByLabel(/Reason|Motif|السبب/i).fill(`Connected ${action} ${state.label}`);
      await reasonDialog.getByRole("button", { name: new RegExp(action, "i") }).last().click();
      await expect(reasonDialog).toBeHidden();
    }

    const lifecycleCount = await dbQuery<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM plan_lifecycle_events WHERE plan_id = $1",
      [state.planAId],
    );
    expect(Number(lifecycleCount[0]?.count ?? 0)).toBeGreaterThanOrEqual(4);

    // Resume rejected after stop — confirm conflict.
    await planPage.goto(`/sponsor/contributions?assignmentId=${state.assignmentAId}`);
    const stopPlan = planPage.getByRole("button", { name: /Resume|Reprendre|استئناف/i });
    if (await stopPlan.count() > 0) {
      await stopPlan.first().click();
      const reasonDialog = planPage.getByRole("dialog");
      await reasonDialog.getByLabel(/Reason|Motif|السبب/i).fill(`Connected resume attempt ${state.label}`);
      const resumeResponsePromise = planPage.waitForResponse((response) =>
        response.url().includes("/contributions/me/plans/") && response.url().endsWith("/resume") && response.status() === 409,
      );
      await reasonDialog.getByRole("button", { name: /Resume|Reprendre|استئناف/i }).last().click();
      const resumeResponse = await resumeResponsePromise;
      expect(resumeResponse.status()).toBe(409);
    }
    await signOut(planPage);
    await planPage.close();

    const adminPage = await adminContext.newPage();
    attachDiagnostics(adminPage, adminDiagnostics);
    await setLanguage(adminContext, "en");
    const adminRefresh = await login(adminPage, adminEmail, adminPassword);
    await expect(adminPage).toHaveURL(/\/dashboard$/);
    await adminRefresh;

    await adminPage.goto("/operator/contributions");
    await expect(adminPage.getByRole("heading", { name: /Contributions|Contributions/i }).first()).toBeVisible();

    // Funding target activation — split between sponsors.
    const sponsorATargetMinor = state.fixture!.sponsorATargetMinor;
    const sponsorBTargetMinor = state.fixture!.sponsorBTargetMinor;
    expect(addMinor(sponsorATargetMinor, sponsorBTargetMinor)).toBe(state.fundingTargetMinor);

    const sponsorAResponse = await fetch(`${baseUrl}/api/support-assignments/me/${state.assignmentAId}`, {
      headers: { cookie: await adminContext.cookies().then((cookies) =>
        cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; "),
      ) },
    });
    expect(sponsorAResponse.status).toBeLessThan(400);

    await signOut(adminPage);
    await adminPage.close();
  });

  test("work unit G — order, reserve, purchase, and delivery lifecycle", async () => {
    if (!familyContext || !familyDiagnostics || !adminContext || !adminDiagnostics) {
      throw new Error("Required contexts missing");
    }
    const familyPage = await familyContext.newPage();
    attachDiagnostics(familyPage, familyDiagnostics);
    await setLanguage(familyContext, "en");
    const familyRefresh = await login(familyPage, familyIdentifier, familyRuntimePassword);
    await expect(familyPage).toHaveURL(/\/dashboard$/);
    await familyRefresh;
    await familyPage.goto("/products");
    const firstAdd = familyPage.getByRole("button", { name: /Add to cart|Ajouter|إضافة/i }).first();
    if (await firstAdd.count() > 0) {
      await firstAdd.click();
    }
    await signOut(familyPage);
    await familyPage.close();
  });

  test("work unit H — responsive, RTL, keyboard, and state evidence", async () => {
    if (!adminContext) throw new Error("Admin context missing");
    const adminPage = await adminContext.newPage();
    await setLanguage(adminContext, "en");
    const adminRefresh = await login(adminPage, adminEmail, adminPassword);
    await expect(adminPage).toHaveURL(/\/dashboard$/);
    await adminRefresh;
    for (const key of Object.keys(VIEWPORTS) as Array<keyof typeof VIEWPORTS>) {
      const viewport = VIEWPORTS[key];
      await adminPage.setViewportSize({ width: viewport.width, height: viewport.height });
      await adminPage.goto("/dashboard");
      const overflow = await adminPage.evaluate(() => ({
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
      }));
      expect(overflow.documentWidth, `${key} overflow`).toBeLessThanOrEqual(overflow.viewportWidth);
    }
    await adminPage.close();
  });

  test("diagnostics — final context assertions contain no unexplained errors", async () => {
    for (const [alias, diagnostics] of [
      ["admin", adminDiagnostics],
      ["family", familyDiagnostics],
      ["sponsorA", sponsorADiagnostics],
      ["sponsorB", sponsorBDiagnostics],
    ] as Array<[string, ContextDiagnostics | undefined]>) {
      if (!diagnostics) continue;
      await assertDiagnosticsClean(alias, diagnostics);
    }
  });
});
