import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import {
  REMOTE_GREP_MAX_LENGTH,
  buildRemoteAuthPlaywrightArgs,
  buildRemotePlaywrightArgs,
  handleConcurrentPromise,
  retryReadAfterConnectionReset,
  readRemoteAcceptanceConfig,
  readRemoteGrep,
  remoteAcceptanceChecks,
} from "../scripts/connected-four-account-remote-runtime";
import {
  buildRunEmail,
  buildRunPhone,
} from "../scripts/connected-four-account-fixtures";

const validEnvironment: Record<string, string> = {
  KAFIL_E2E_REMOTE_URL: "https://kafala360.ma",
  KAFIL_E2E_ALLOW_REMOTE_DESTRUCTIVE: "true",
  KAFIL_ADMIN_EMAIL: "admin@example.test",
  KAFIL_ADMIN_PASSWORD: "not-a-runtime-secret",
  KAFIL_E2E_MAILBOX_API_HOST: "mail-api.example.test",
  KAFIL_E2E_MAILBOX_API_URL: "https://mail-api.example.test",
  KAFIL_E2E_MAILBOX_TOKEN: "not-a-runtime-secret-but-at-least-32-characters",
};

const runnerSource = readFileSync(
  new URL("../scripts/run-connected-four-account-remote-e2e.ts", import.meta.url),
  "utf8",
);
const sharedRunnerSource = readFileSync(
  new URL("../scripts/remote-acceptance-runner.ts", import.meta.url),
  "utf8",
);
const configSource = readFileSync(
  new URL("../playwright.remote.config.ts", import.meta.url),
  "utf8",
);
const specSource = readFileSync(
  new URL("e2e/connected-four-account.remote.ts", import.meta.url),
  "utf8",
);
const rootEnvExample = readFileSync(
  new URL("../../../.env.example", import.meta.url),
  "utf8",
);
const mailTestHubVpsHelper = readFileSync(
  new URL("../../../scripts/configureMailTestHubVps.sh", import.meta.url),
  "utf8",
);
const mailTestHubCompose = readFileSync(
  new URL("../../../deploy/mail-test-hub/compose.yml", import.meta.url),
  "utf8",
);
const mailTestHubCaddy = readFileSync(
  new URL("../../../deploy/mail-test-hub/Caddyfile.host.example", import.meta.url),
  "utf8",
);
const mailTestHubDokployCompose = readFileSync(
  new URL("../../../deploy/mail-test-hub/compose.dokploy.yml", import.meta.url),
  "utf8",
);
const mailTestHubTraefik = readFileSync(
  new URL("../../../deploy/mail-test-hub/traefik.dynamic.example.yml", import.meta.url),
  "utf8",
);

describe("connected four-account remote runner", () => {
  test("retries only one connection-reset read and handles concurrent rejection immediately", async () => {
    let resetReadCount = 0;
    const recovered = await retryReadAfterConnectionReset(async () => {
      resetReadCount += 1;
      if (resetReadCount === 1) {
        throw Object.assign(new TypeError("fetch failed"), {
          cause: Object.assign(new Error("read reset"), { code: "ECONNRESET" }),
        });
      }
      return "recovered";
    });
    expect(recovered).toBe("recovered");
    expect(resetReadCount).toBe(2);

    let refusedReadCount = 0;
    await expect(
      retryReadAfterConnectionReset(async () => {
        refusedReadCount += 1;
        throw Object.assign(new Error("connection refused"), { code: "ECONNREFUSED" });
      }),
    ).rejects.toThrow("connection refused");
    expect(refusedReadCount).toBe(1);

    const rejection = Promise.reject(new Error("mailbox transport failed"));
    const handled = handleConcurrentPromise(rejection);
    expect(handled).toBe(rejection);
    await expect(handled).rejects.toThrow("mailbox transport failed");
  });

  test("accepts only the exact authorized origin and HTTPS mail-test API", () => {
    expect(remoteAcceptanceChecks(validEnvironment).every((check) => check.ok)).toBe(true);
    expect(() =>
      readRemoteAcceptanceConfig({
        ...validEnvironment,
        KAFIL_E2E_REMOTE_URL: "https://example.test",
      }),
    ).toThrow();
    expect(() =>
      readRemoteAcceptanceConfig({
        ...validEnvironment,
        KAFIL_E2E_MAILBOX_API_URL: "http://mail-api.example.test",
      }),
    ).toThrow();
    expect(() =>
      readRemoteAcceptanceConfig({
        ...validEnvironment,
        KAFIL_E2E_MAILBOX_API_HOST: "other.example.test",
      }),
    ).toThrow();
    expect(() =>
      readRemoteAcceptanceConfig({
        ...validEnvironment,
        KAFIL_E2E_TAILSCALE_DISCONNECT_AFTER: "false",
      }),
    ).toThrow();
    expect(() =>
      readRemoteAcceptanceConfig({
        ...validEnvironment,
        KAFIL_E2E_MAILBOX_TOKEN: "weak",
      }),
    ).toThrow();
  });

  test("owns no SSH, Tailscale, or local forwarding lifecycle", () => {
    expect(sharedRunnerSource).not.toContain('["ssh"');
    expect(sharedRunnerSource).not.toContain('["tailscale"');
    expect(sharedRunnerSource).not.toContain("disconnectPrivateNetwork");
    expect(sharedRunnerSource).not.toContain("forwarding port");
    expect(sharedRunnerSource).toContain("NO MANAGED MAILBOX TRANSPORT");
    expect(sharedRunnerSource).toContain(
      "KAFIL_E2E_MAILBOX_TOKEN: config.mailboxToken",
    );
    expect(sharedRunnerSource).not.toContain("KAFIL_E2E_MAILBOX_PASSWORD");
    expect(specSource).toContain(
      'headers.set("Authorization", `Bearer ${mailboxApiToken}`)',
    );
  });

  test("pins the reusable Mailpit dashboard and app-scoped gateway boundaries", () => {
    expect(rootEnvExample).toContain(
      "KAFIL_E2E_MAILBOX_API_HOST=mail-api.example.invalid",
    );
    expect(rootEnvExample).toContain(
      "KAFIL_E2E_MAILBOX_TOKEN=replace-with-the-kafil-gateway-token",
    );
    expect(mailTestHubCompose).toContain(
      "image: axllent/mailpit:v1.30.0",
    );
    expect(mailTestHubCompose).toContain(
      "127.0.0.1:${MAIL_TEST_DASHBOARD_LOOPBACK_PORT:-59025}:8025",
    );
    expect(mailTestHubCompose).toContain(
      "127.0.0.1:${MAIL_TEST_GATEWAY_LOOPBACK_PORT:-59026}:8080",
    );
    expect(mailTestHubCompose).toContain("internal: true");
    expect(mailTestHubCaddy).toContain("reverse_proxy 127.0.0.1:59025");
    expect(mailTestHubCaddy).toContain("reverse_proxy 127.0.0.1:59026");
    expect(mailTestHubDokployCompose).toContain(
      "name: ${MAIL_TEST_EDGE_NETWORK:-dokploy-network}",
    );
    expect(mailTestHubDokployCompose).toContain("najmstack-mailpit");
    expect(mailTestHubDokployCompose).toContain("najmstack-mail-gateway");
    expect(mailTestHubTraefik).toContain(
      "Host(`MAIL_TEST_DASHBOARD_HOSTNAME`)",
    );
    expect(mailTestHubTraefik).toContain("Host(`MAIL_TEST_API_HOSTNAME`)");
    expect(mailTestHubTraefik).toContain("certResolver: letsencrypt");
    expect(mailTestHubVpsHelper).toContain(
      "MAIL_TEST_HUB_COMPOSE_OVERRIDE_FILE",
    );
    expect(mailTestHubVpsHelper).toContain('[[ "${dashboard_status}" != "401"');
    expect(mailTestHubVpsHelper).toContain('"${gateway_status}" != "401"');
  });

  test("validates and forwards one optional remote grep argument", () => {
    const grep = "remote step 0[12]|remote diagnostics";
    expect(readRemoteGrep({ KAFIL_E2E_REMOTE_GREP: `  ${grep}  ` })).toBe(grep);
    expect(readRemoteAcceptanceConfig({
      ...validEnvironment,
      KAFIL_E2E_REMOTE_GREP: grep,
    }).grep).toBe(grep);
    expect(buildRemotePlaywrightArgs(grep).slice(-2)).toEqual(["--grep", grep]);
    expect(buildRemotePlaywrightArgs()).not.toContain("--grep");
    expect(buildRemoteAuthPlaywrightArgs()).toContain(
      "test/e2e/auth-lifecycle.remote.ts",
    );
    expect(() => readRemoteGrep({ KAFIL_E2E_REMOTE_GREP: "step 01\n--help" })).toThrow();
    expect(() => readRemoteGrep({
      KAFIL_E2E_REMOTE_GREP: "a".repeat(REMOTE_GREP_MAX_LENGTH + 1),
    })).toThrow();
  });

  test("generates lowercase remote email identities before submission normalization", () => {
    const sponsorAEmail = buildRunEmail("VPS-Mixed-Case", "sponsorA");
    const sponsorBEmail = buildRunEmail("VPS-Mixed-Case", "sponsorB");

    expect(sponsorAEmail).toBe(sponsorAEmail.toLowerCase());
    expect(sponsorBEmail).toBe(sponsorBEmail.toLowerCase());
    expect(sponsorAEmail).toContain("-sponsora@");
    expect(sponsorBEmail).toContain("-sponsorb@");
  });

  test("generates deterministic Moroccan phones from a broad run namespace", () => {
    const phones = new Set(
      Array.from({ length: 10_000 }, (_, index) =>
        buildRunPhone(`vps-fixture-${index}`, "sponsorB"),
      ),
    );

    expect(buildRunPhone("vps-repeatable", "sponsorA")).toBe(
      buildRunPhone("vps-repeatable", "sponsorA"),
    );
    expect(buildRunPhone("vps-repeatable", "sponsorA")).not.toBe(
      buildRunPhone("vps-repeatable", "sponsorB"),
    );
    expect([...phones].every((phone) => /^\+212[67]\d{8}$/.test(phone))).toBe(
      true,
    );
    expect(phones.size).toBeGreaterThan(9_500);
  });

  test("keeps preflight ahead of filtered Playwright and never starts Next.js", () => {
    expect(runnerSource).not.toContain("next dev");
    expect(runnerSource).not.toContain("next start");
    expect(runnerSource).toContain("buildRemotePlaywrightArgs(readRemoteGrep(Bun.env))");
    expect(sharedRunnerSource).toContain('"--preflight-only"');
    expect(sharedRunnerSource.indexOf("await waitForMailbox")).toBeLessThan(
      sharedRunnerSource.indexOf("options.buildPlaywrightArgs()"),
    );
    expect(configSource).toContain('baseURL !== "https://kafala360.ma"');
    expect(configSource).toContain("timeout: 180_000");
    expect(configSource).toContain("ignoreHTTPSErrors: false");
    expect(configSource).toContain('preserveOutput: "never"');
    expect(configSource).toContain('trace: "off"');
  });

  test("defines 16 numbered serial remote steps, one state-neutral responsive unit, and passive diagnostics", () => {
    const step01 = specSource.slice(
      specSource.indexOf('test("remote step 01 - guarded admin smoke"'),
      specSource.indexOf('test("remote step 02 - Family provisioning and first login"'),
    );
    expect(specSource).toContain('test.describe.serial("connected VPS acceptance"');
    for (const title of [
      "remote step 01 - guarded admin smoke",
      "remote step 02 - Family provisioning and first login",
      "remote step 03 - Sponsor A application and approval",
      "remote step 04 - Sponsor B application and approval",
      "remote step 05 - assignments and sponsor privacy",
      "remote step 06 - contributions and exact funding",
      "remote step 07 - delivery staff and reversible orders",
      "remote step 08 - purchase and delivery lifecycle",
      "remote step 09 - Family order projection",
      "remote step 10 - Sponsor A order privacy",
      "remote step 11 - Sponsor B order privacy",
      "remote step 12 - Admin order projection",
      "remote step 13 - Family delivery assignment denial",
      "remote step 14 - Sponsor A approval denial",
      "remote step 15 - Sponsor B delivery confirmation denial",
      "remote step 16 - supported cleanup, role logout, and closure",
    ]) {
      expect(specSource).toContain(`test("${title}"`);
    }
    expect(specSource).not.toContain('test("remote unit ');
    expect(specSource).toContain(
      'test("remote responsive - phone, tablet, RTL, keyboard, and protected images"',
    );
    expect(specSource).toContain('test("remote diagnostics - final context assertions"');
    expect(specSource.match(/test\("remote step /g)).toHaveLength(16);
    expect(specSource).toContain("browser.newContext()");
    expect(step01).toContain('"/api/dashboard/operator"');
    expect(step01).toContain('"Operator dashboard"');
    expect(step01).not.toContain("/^Welcome,/i");
  });

  test("keeps focused diagnostics passive while retaining complete-run cleanup assertions", () => {
    const diagnostics = specSource.slice(
      specSource.indexOf('test("remote diagnostics - final context assertions"'),
    );

    expect(diagnostics).toContain("if (cleanupSummary) {");
    expect(diagnostics).not.toContain(
      'throw new Error("Counts-only cleanup summary was not recorded")',
    );
    expect(diagnostics).toContain("cleanupSummary.applicationRowsRetained");
    expect(diagnostics).toContain("cleanupSummary.evidenceFilesRetained");
    expect(diagnostics).toContain("cleanupSummary.mailboxMessagesRetained");
    expect(diagnostics.indexOf("if (cleanupSummary) {")).toBeLessThan(
      diagnostics.indexOf('assertDiagnosticsClean("admin"'),
    );
  });

  test("observes the exact negative request and any response before awaiting the action", () => {
    const helper = specSource.slice(
      specSource.indexOf("async function expectExactNegativeResponse("),
      specSource.indexOf("function responseData("),
    );
    expect(helper).toContain("const requestPromise = page.waitForRequest(");
    expect(helper).toContain("const responsePromise = page.waitForResponse(");
    expect(helper).toContain("const actionPromise = action();");
    expect(helper.indexOf("const requestPromise")).toBeLessThan(
      helper.indexOf("const actionPromise"),
    );
    expect(helper.indexOf("const responsePromise")).toBeLessThan(
      helper.indexOf("const actionPromise"),
    );
    expect(helper).toContain("await Promise.race([");
    expect(helper).toContain("requestPromise,");
    expect(helper).toContain("actionPromise.then(");
    expect(helper).toContain("await Promise.all([actionPromise, responsePromise])");
    expect(helper).toContain("expect(response.status()).toBe(contract.status)");
    expect(helper).not.toContain("response.status() === contract.status");
    expect(helper).not.toContain("const result = await action();");
  });

  test("pins Family creation, credential setup, replay denial, and role boundaries", () => {
    const step02 = specSource.slice(
      specSource.indexOf('test("remote step 02 - Family provisioning and first login"'),
      specSource.indexOf('test("remote step 03 - Sponsor A application and approval"'),
    );
    for (const contract of [
      '"/api/families"',
      '"/api/auth/credential-setup/change"',
      '"/api/dashboard/family"',
      '"/api/families/me"',
      '"/api/admin/access/users"',
    ]) {
      expect(specSource).toContain(contract);
    }
    expect(specSource).toContain("await createFamilyButton.click({ trial: true, timeout: 5_000 })");
    expect(step02).toContain('adminPage.getByText("Loading…", { exact: true })');
    expect(step02).toContain('name: "Operator dashboard", exact: true');
    expect(step02).toContain("expect(createFamilyRequestCount).toBe(0)");
    expect(step02).toContain("expect(createFamilyRequestCount).toBe(1)");
    expect(specSource).toContain(
      'poll(() => new URL(familyPage.url()).pathname, { timeout: 5_000 })',
    );
    expect(specSource).toContain('.toBe("/change-password")');
    expect(specSource).toContain(
      'familyPage.locator("#family-first-password-form")).toBeVisible({',
    );
    expect(specSource).not.toContain("responseNextStep");
    expect(specSource).not.toContain("setupLogin.json()");
    expect(specSource).not.toContain("page.route(");
    expect(specSource).not.toContain("clearCookies(");
    expect(specSource).not.toContain("force: true");
  });

  test("pins Sponsor A OTP, approval replay, identifiers, and logout boundaries", () => {
    const step03 = specSource.slice(
      specSource.indexOf('test("remote step 03 - Sponsor A application and approval"'),
      specSource.indexOf('test("remote step 04 - Sponsor B application and approval"'),
    );
    for (const contract of [
      '"/api/applicants"',
      '"/api/applicants/email-verification/confirm"',
      '"/api/dashboard/sponsor"',
      '"/api/sponsors/me/profile"',
      '"Application pending review"',
      '"Find a family to support"',
    ]) {
      expect(step03).toContain(contract);
    }
    expect(step03).toContain("expect(applicationRequestCount).toBe(0)");
    expect(step03).toContain("expect(applicationRequestCount).toBe(1)");
    expect(step03).toContain('browserJsonRequest(adminPage, "GET", "/api/auth/me")');
    expect(step03).toContain('expect(responseRecord(adminIdentity.body).role).toBe("admin")');
    expect(step03).toContain('"/api/applicants?limit=1&offset=0"');
    expect(step03.indexOf("const applicantsCapability")).toBeLessThan(
      step03.indexOf("let applicationRequestCount"),
    );
    expect(step03).toContain('{ method: "GET", path: "/api/applicants", status: 401 }');
    expect(step03).toContain("transientStatus: 401");
    expect(step03).toContain("pollExactlyOneOtpMessage({");
    expect(step03).toContain("handleConcurrentPromise(\n      pollExactlyOneOtpMessage({");
    expect(step03).toContain("subjectKeyword: otpSubjectKeyword");
    expect(step03).toContain("expect(confirmedOtpMessages).toHaveLength(1)");
    expect(step03.indexOf("const confirmResponse")).toBeLessThan(
      step03.indexOf("await deleteMailboxMessage(otpMessage.ID)"),
    );
    expect(step03).toContain(
      "await submitPreparedLogin(sponsorPage, sponsorADiagnostics, 403)",
    );
    expect(step03).toContain("expect(applicantMatches).toHaveLength(1)");
    expect(step03).toContain(
      'const applicantSearch = await onlyVisible(\n      adminPage.getByPlaceholder("Search applicant name...", { exact: true }),\n    )',
    );
    expect(step03).toContain("await applicantSearch.fill(sponsorAName)");
    expect(step03).not.toContain(
      'adminPage\n      .getByPlaceholder("Search applicant name...", { exact: true })\n      .fill(sponsorAName)',
    );
    expect(step03).toContain("expect(approval.status()).toBe(200)");
    expect(step03).toContain("status: 409");
    expect(step03).toContain("prepareLogin(sponsorPage, expectedPhoneE164, sponsorAPassword)");
    expect(specSource).toContain("sponsorAContext = await newIsolatedContext(browser)");
    expect(specSource).toContain('assertDiagnosticsClean("sponsor-a", sponsorADiagnostics)');
    expect(specSource).not.toContain("@kafil/server/database");
    expect(specSource).not.toContain("dbQuery(");
    expect(specSource).not.toContain("console.log");
    expect(specSource).toContain("describeRecognizedAuthCookies(cookies)");
    expect(specSource).toContain("recordAuthCookieWriters(page)");
    expect(specSource).toContain("auth-boundary-responses=");
    expect(specSource).toContain("cookie-writers=");
    expect(specSource).not.toContain("cookie.value");
    expect(specSource).not.toContain("cookies.find((cookie) =>");
  });

  test("fails applicants collection navigation with value-free bounded diagnostics", () => {
    const helper = specSource.slice(
      specSource.indexOf("async function navigateToCollectionReadiness("),
      specSource.indexOf("async function expectExactNegativeResponse("),
    );
    const step03 = specSource.slice(
      specSource.indexOf('test("remote step 03 - Sponsor A application and approval"'),
      specSource.indexOf('test("remote step 04 - Sponsor B application and approval"'),
    );
    const step04 = specSource.slice(
      specSource.indexOf('test("remote step 04 - Sponsor B application and approval"'),
      specSource.indexOf('test("remote step 05 - assignments and sponsor privacy"'),
    );

    expect(helper).toContain("observedStatuses: number[] = []");
    expect(helper).toContain("transientStatusCount === 0");
    expect(helper).toContain("transientStatusCount += 1");
    expect(helper).toContain("{ timeout: 30_000 }");
    expect(helper).toContain("method=GET path=${path} status=${response.status()}");
    expect(helper).toContain('statuses=${observedStatuses.join(",") || "none"}');
    expect(helper).toContain("handleConcurrentPromise(");
    expect(helper).toContain('waitUntil: "commit"');
    expect(helper).toContain("await Promise.all([responsePromise, navigationPromise])");
    expect(helper).not.toContain("response.body(");
    expect(helper).not.toContain("response.json(");

    for (const step of [step03, step04]) {
      expect(step).toContain("await navigateToCollectionReadiness(");
      expect(step).toContain('path: "/api/applicants"');
      expect(step).toContain('routePath: "/applicants"');
      expect(step).toContain('requiredSearchParams: ["limit", "offset"]');
      expect(step).not.toContain("const applicantsResponse = adminPage.waitForResponse(");
    }
  });

  test("pins independent Sponsor B OTP, approval replay, and logout boundaries", () => {
    const step04 = specSource.slice(
      specSource.indexOf('test("remote step 04 - Sponsor B application and approval"'),
      specSource.indexOf('test("remote step 05 - assignments and sponsor privacy"'),
    );
    for (const contract of [
      "sponsorBContext.newPage()",
      "recipient: sponsorBEmail",
      "expect(applicationRequestCount).toBe(0)",
      "expect(applicationRequestCount).toBe(1)",
      "expect(confirmedOtpMessages).toHaveLength(1)",
      "submitPreparedLogin(sponsorPage, sponsorBDiagnostics, 403)",
      "expect(applicantMatches).toHaveLength(1)",
      "expect(approval.status()).toBe(200)",
      "status: 409",
      '"/api/dashboard/sponsor"',
      '"/api/sponsors/me/profile"',
    ]) {
      expect(step04).toContain(contract);
    }
    expect(step04).toContain("handleConcurrentPromise(\n      pollExactlyOneOtpMessage({");
    expect(specSource).toContain("sponsorBContext = await newIsolatedContext(browser)");
    expect(specSource).toContain('assertDiagnosticsClean("sponsor-b", sponsorBDiagnostics)');
    expect(step04).toContain("await deleteMailboxMessage(otpMessage.ID)");
    expect(step04).toContain("await signOut(sponsorPage)");
    expect(step04).not.toContain("sponsorAEmail");
    expect(step04).not.toContain("sponsorAPassword");
    expect(step04).not.toContain("sponsorAApplicantId");
  });

  test("pins step 05 assignment, privacy, canary, and cleanup contracts", () => {
    const assignmentHelper = specSource.slice(
      specSource.indexOf("async function openComboboxSearch("),
      specSource.indexOf('test.describe.serial("connected VPS acceptance"'),
    );
    const step05 = specSource.slice(
      specSource.indexOf('test("remote step 05 - assignments and sponsor privacy"'),
      specSource.indexOf('test("remote step 06 - contributions and exact funding"'),
    );
    expect(step05).toContain("await createAssignmentThroughUi(adminPage, sponsorAEmail)");
    expect(step05).toContain("await createAssignmentThroughUi(adminPage, sponsorBEmail)");
    expect(step05).toContain('{ method: "POST", path: duplicatePath, status: 409 }');
    expect(step05).toContain("expect(activeAssignments).toHaveLength(2)");
    expect(step05).toContain('"&status=active&limit=100&offset=0"');
    expect(step05).toContain('await page.goto("/sponsor/support", { waitUntil: "commit" })');
    expect(step05).toContain('toBe("/family")');
    expect(step05).toContain(
      '"/api/support-assignments/catalog?relationship=supported&limit=100&offset=0"',
    );
    expect(step05).toContain("expect(familyRows).toHaveLength(1)");
    expect(step05).toContain("containsForbiddenProjectionKey(sponsorProjection)");
    expect(step05).toContain("containsSensitiveValue(sponsorProjection");
    expect(step05).toContain('"/api/contributions/me/plans"');
    expect(step05).toContain('"/api/contributions/me"');
    expect(step05.match(/status: 404/g)).toHaveLength(3);
    expect(step05).toContain("Acceptance privacy canary complete");
    expect(step05).toContain('toBe("stopped")');
    expect(step05).toContain('toBe("rejected")');
    expect(step05).not.toContain("dbQuery(");
    expect(step05).not.toContain("console.log");
    expect(assignmentHelper).toContain('toHaveAttribute("aria-expanded", "true")');
    expect(assignmentHelper).toContain('getAttribute("aria-controls")');
    expect(assignmentHelper).toContain('[data-slot="popover-content"]');
    expect(assignmentHelper).toContain('toHaveAttribute("data-state", "open")');
    expect(assignmentHelper).toContain(
      'openComboboxSearch(\n    page,\n    sponsorCombobox,\n    "Search sponsors...",',
    );
    expect(assignmentHelper).toContain(
      'openComboboxSearch(\n    page,\n    familyCombobox,\n    "Search families...",',
    );
    expect(assignmentHelper).not.toContain(
      'onlyVisible(\n    page.getByPlaceholder("Search sponsors..."',
    );
    expect(assignmentHelper).not.toContain(
      'onlyVisible(\n    page.getByPlaceholder("Search families..."',
    );
  });

  test("pins step 06 plan ownership, idempotent commands, and exact funding", () => {
    const step06 = specSource.slice(
      specSource.indexOf('test("remote step 06 - contributions and exact funding"'),
      specSource.indexOf('test("remote step 07 - delivery staff and reversible orders"'),
    );
    expect(step06).toContain("readFamilyFundingFromSponsorCatalog(");
    expect(step06).toContain('await adminPage.goto("/dashboard", { waitUntil: "commit" })');
    expect(step06).not.toContain("prepareLogin(adminPage");
    expect(step06).not.toContain("submitPreparedLogin(adminPage");
    expect(step06).toContain('kind: "monthly"');
    expect(step06).toContain('/pause`');
    expect(step06).toContain('/resume`');
    expect(step06).toContain('/stop`');
    expect(step06).toContain("Acceptance resume-after-stop proof");
    expect(step06).toContain("sponsorBDiagnostics");
    expect(step06.match(/status: 404/g)).toHaveLength(2);
    expect(step06.match(/status: 409/g)).toHaveLength(1);
    expect(step06).toContain("acceptance-funding-reject");
    expect(step06).toContain("acceptance-funding-refund");
    expect(step06).toContain("validationReplay.status");
    expect(step06).toContain("refundReplay.status");
    expect(step06).toContain("sponsorATargetMinor + sponsorBTargetMinor");
    expect(step06).toContain('expect(funding.status).toBe("pending_funding")');
    expect(step06).toContain('expect(funding.status).toBe("active")');
    expect(step06).toContain('expect(funding.capacityStatus).toBe("funded")');
    expect(step06).toContain("const fundedFamilyRows = sponsorAPage.locator(");
    expect(step06).toContain(
      "has: sponsorAPage.getByText(familyName, { exact: true })",
    );
    expect(step06).toContain(
      'getByRole("navigation", {\n      name: "Pagination",\n      exact: true,',
    );
    expect(step06).toContain(
      'getByRole("button", {\n        name: "Next page",\n        exact: true,',
    );
    expect(step06).not.toContain(
      'getByRole("button", {\n        name: "Next",\n        exact: true,',
    );
    expect(step06).toContain('locator(\'[aria-current="page"]\')');
    expect(step06).toContain('const fundedProgress = await onlyVisible(');
    expect(step06).toContain('fundedFamilyRow.getByRole("progressbar"');
    expect(step06).not.toContain('locator(\'[data-slot="card"]\')');
    expect(step06).not.toContain('sponsorAPage.getByRole("progressbar")');
    expect(step06).toContain('expect(fundedProgress).toHaveAttribute(\n      "aria-valuenow",');
    expect(step06).toContain("expect(sponsorATargetRows).toHaveLength(1)");
    expect(step06).toContain("expect(sponsorBTargetRows).toHaveLength(1)");
    expect(step06).toContain("expect(adminTargetRows).toHaveLength(2)");
    expect(step06).not.toContain("dbQuery(");
    expect(step06).not.toContain("console.log");
  });

  test("pins numbered order steps, typed phase guards, privacy, denials, and logout", () => {
    const signOutHelper = specSource.slice(
      specSource.indexOf("async function signOut(page: Page)"),
      specSource.indexOf("async function assertNoAuthCookies("),
    );
    const deliveryStaffHelper = specSource.slice(
      specSource.indexOf("async function createDeliveryStaffThroughUi"),
      specSource.indexOf("async function readFamilyFundingFromSponsorCatalog"),
    );
    const orderSubmissionHelper = specSource.slice(
      specSource.indexOf("async function submitFamilyOrder("),
      specSource.indexOf("async function openStaffDirectory("),
    );
    const orderSteps = specSource.slice(
      specSource.indexOf('test("remote step 07 - delivery staff and reversible orders"'),
      specSource.indexOf('test("remote diagnostics - final context assertions"'),
    );
    const step07 = orderSteps.slice(
      orderSteps.indexOf('test("remote step 07 - delivery staff and reversible orders"'),
      orderSteps.indexOf('test("remote step 08 - purchase and delivery lifecycle"'),
    );
    const step08 = orderSteps.slice(
      orderSteps.indexOf('test("remote step 08 - purchase and delivery lifecycle"'),
      orderSteps.indexOf('test("remote step 09 - Family order projection"'),
    );
    const step09 = orderSteps.slice(
      orderSteps.indexOf('test("remote step 09 - Family order projection"'),
      orderSteps.indexOf('test("remote step 10 - Sponsor A order privacy"'),
    );
    const step10 = orderSteps.slice(
      orderSteps.indexOf('test("remote step 10 - Sponsor A order privacy"'),
      orderSteps.indexOf('test("remote step 11 - Sponsor B order privacy"'),
    );
    const step11 = orderSteps.slice(
      orderSteps.indexOf('test("remote step 11 - Sponsor B order privacy"'),
      orderSteps.indexOf('test("remote step 12 - Admin order projection"'),
    );
    const step12 = orderSteps.slice(
      orderSteps.indexOf('test("remote step 12 - Admin order projection"'),
      orderSteps.indexOf('test("remote step 13 - Family delivery assignment denial"'),
    );
    const step13 = orderSteps.slice(
      orderSteps.indexOf('test("remote step 13 - Family delivery assignment denial"'),
      orderSteps.indexOf('test("remote step 14 - Sponsor A approval denial"'),
    );
    const step14 = orderSteps.slice(
      orderSteps.indexOf('test("remote step 14 - Sponsor A approval denial"'),
      orderSteps.indexOf('test("remote step 15 - Sponsor B delivery confirmation denial"'),
    );
    const step15 = orderSteps.slice(
      orderSteps.indexOf('test("remote step 15 - Sponsor B delivery confirmation denial"'),
      orderSteps.indexOf(
        'test("remote responsive - phone, tablet, RTL, keyboard, and protected images"',
      ),
    );
    const responsive = orderSteps.slice(
      orderSteps.indexOf(
        'test("remote responsive - phone, tablet, RTL, keyboard, and protected images"',
      ),
      orderSteps.indexOf(
        'test("remote step 16 - supported cleanup, role logout, and closure"',
      ),
    );
    const step16 = orderSteps.slice(
      orderSteps.indexOf(
        'test("remote step 16 - supported cleanup, role logout, and closure"',
      ),
    );
    const familyOrdersReadiness = orderSteps.slice(
      orderSteps.indexOf("const familyOrdersResponse"),
      orderSteps.indexOf("const order1Cell"),
    );
    for (const contract of [
      '"/api/catalog/browse/products?limit=100&offset=0"',
      '"/api/staff/options/delivery"',
      "/purchase`",
      "/delivery/assign`",
      "/delivery/start`",
      "/delivery/fail`",
      "/delivery/confirm`",
    ]) {
      expect(orderSteps).toContain(contract);
    }
    expect(orderSubmissionHelper).toContain('"/api/orders/cart/items"');
    expect(orderSubmissionHelper).toContain('"/api/orders/submit"');
    expect(orderSubmissionHelper).toContain(
      '"/api/orders/supported?limit=100&offset=0"',
    );
    expect(orderSteps.match(/submitFamilyOrder\(/g)).toHaveLength(3);
    expect(specSource).toContain('page.goto("/staff", { waitUntil: "commit" })');
    expect(specSource).toContain('new URL(response.url()).pathname === "/api/staff"');
    expect(specSource).toContain('expect(created.functions).toEqual(["delivery"])');
    expect(specSource).toContain("expect(created.userId).toBeNull()");
    expect(specSource).toContain("expect(created.hasOperatorAccess).toBe(false)");
    expect(specSource).toContain("expect(created.initialPassword).toBeNull()");
    expect(deliveryStaffHelper).toContain(
      "await expect(form).toBeVisible({ timeout: 5_000 })",
    );
    for (const accessibleLabel of [
      "/^Full name\\s*\\*?$/",
      "/^CIN\\s*\\*?$/",
      "/^Phone\\s*\\*?$/",
      "/^Email\\s*\\*?$/",
      "/^Job title\\s*\\*?$/",
      "/^Address\\s*\\*?$/",
      "/^Internal notes\\s*\\*?$/",
    ]) {
      expect(deliveryStaffHelper).toContain(accessibleLabel);
    }
    expect(deliveryStaffHelper).not.toMatch(
      /locator\(['"](?:input|textarea)\[name=/,
    );
    // Date of birth is a calendar popover, not a text field, and the schema only
    // requires it for operator staff. Typing into it is what timed out the first
    // The delivery-staff attempt's successor; it must not come back as a filled field.
    expect(deliveryStaffHelper).not.toMatch(/getByLabel\(\/\^Date of birth/);
    // The capabilities portal is resolved through the trigger, never by a global
    // open-popover match — the selector defect that stopped the first A-E attempt.
    expect(deliveryStaffHelper).toContain(
      'toHaveAttribute("aria-expanded", "true")',
    );
    expect(deliveryStaffHelper).toContain(
      'capabilities.getAttribute("aria-controls")',
    );
    expect(deliveryStaffHelper).toContain(
      'toHaveAttribute("aria-expanded", "false")',
    );
    expect(deliveryStaffHelper).not.toContain(
      '[data-slot="popover-content"][data-state="open"]',
    );
    expect(specSource).toContain('type OrderJourneyState =');
    expect(specSource).toContain('phase: "not-started"');
    expect(specSource).toContain('phase: "reversible-orders-complete"');
    expect(specSource).toContain('phase: "delivery-complete"');
    expect(specSource).toContain('phase: "family-projection-complete"');
    expect(specSource).toContain('phase: "sponsor-a-projection-complete"');
    expect(specSource).toContain('phase: "sponsor-b-projection-complete"');
    expect(specSource).toContain('phase: "admin-projection-complete"');
    expect(specSource).toContain('phase: "family-denial-complete"');
    expect(specSource).toContain('phase: "sponsor-a-denial-complete"');
    expect(specSource).toContain('phase: "denials-complete"');
    expect(specSource).toContain('function requireReversibleOrdersComplete(');
    expect(specSource).toContain('function requireDeliveredOrderPhase(');
    expect(orderSteps).not.toContain("test.setTimeout(");
    expect(step07).toContain("createDeliveryStaffThroughUi(adminPage, fixture)");
    expect(step07).toContain("expect(deliveryStaff).toHaveLength(2)");
    expect(step07).toContain("expect(staffA.id).toBe(createdDeliveryStaff[0]!.id)");
    expect(step07).toContain("expect(staffB.id).toBe(createdDeliveryStaff[1]!.id)");
    expect(step07).toContain('phase: "reversible-orders-complete"');
    expect(step08).toContain("requireReversibleOrdersComplete(orderJourneyState)");
    expect(step08).toContain("uploadGeneratedPdfEvidence(adminPage, \"receipts\")");
    expect(step08).toContain('phase: "delivery-complete"');
    expect(step09).toContain('requireDeliveredOrderPhase(\n      orderJourneyState,\n      "delivery-complete"');
    expect(step09).toContain('phase: "family-projection-complete"');
    expect(step10).toContain('"family-projection-complete"');
    expect(step10).toContain("familyProjection.pages.sponsorAPage");
    expect(step10).toContain('phase: "sponsor-a-projection-complete"');
    expect(step11).toContain('"sponsor-a-projection-complete"');
    expect(step11).toContain("sponsorAProjection.pages.sponsorBPage");
    expect(step11).toContain('phase: "sponsor-b-projection-complete"');
    expect(step12).toContain('"sponsor-b-projection-complete"');
    expect(step12).not.toContain("status: 403");
    expect(step12).toContain('phase: "admin-projection-complete"');
    expect(step13).toContain('"admin-projection-complete"');
    expect(step13.match(/status: 401/g)).toHaveLength(1);
    expect(step13).not.toContain("status: 403");
    expect(step13).toContain("/delivery/assign`");
    expect(step13).toContain('phase: "family-denial-complete"');
    expect(step14).toContain('"family-denial-complete"');
    expect(step14.match(/status: 401/g)).toHaveLength(1);
    expect(step14).not.toContain("status: 403");
    expect(step14).toContain("/approve`");
    expect(step14).toContain('phase: "sponsor-a-denial-complete"');
    expect(step15).toContain('"sponsor-a-denial-complete"');
    expect(step15.match(/status: 401/g)).toHaveLength(1);
    expect(step15).not.toContain("status: 403");
    expect(step15).toContain("/delivery/confirm`");
    expect(step15).toContain('phase: "denials-complete"');
    expect(responsive).toContain('"denials-complete"');
    expect(responsive).toContain("setViewportSize({ width: 768, height: 900 })");
    expect(responsive).toContain("setViewportSize({ width: 390, height: 844 })");
    expect(responsive).toContain("setViewportSize({ width: 375, height: 812 })");
    expect(responsive).toContain('toHaveAttribute("dir", "rtl")');
    expect(responsive).toContain('img[src*="/api/product-images/files/serve/"]');
    expect(responsive).toContain("image.complete && image.naturalWidth > 0");
    expect(responsive).toContain("browserResourceRequest(familyPage, imagePath)");
    expect(responsive).toContain('name: "Row actions"');
    expect(responsive).toContain("await rowActions.focus()");
    expect(responsive).toContain('await familyPage.keyboard.press("Enter")');
    expect(responsive).toContain('name: "View"');
    expect(responsive).toContain('await familyPage.keyboard.press("Escape")');
    expect(responsive).toContain("expectNoHorizontalOverflow(");
    expect(responsive).not.toContain("submitFamilyOrder(");
    expect(responsive).not.toContain('browserJsonRequest(\n      familyPage,\n      "POST"');
    expect(step16).toContain('"denials-complete"');
    expect(step16).toContain(
      "await restoreDesktopViewports(adminPage, familyPage, sponsorAPage, sponsorBPage)",
    );
    expect(step16.indexOf("await restoreDesktopViewports(")).toBeLessThan(
      step16.indexOf("await signOut(familyPage)"),
    );
    expect(step16).toContain("await signOut(familyPage)");
    expect(step16).toContain("await signOut(sponsorAPage)");
    expect(step16).toContain("await signOut(sponsorBPage)");
    expect(step16).toContain("await signOut(adminPage)");
    expect(step16).toContain('browserJsonRequest(adminPage, "DELETE", `/api/families/${state.familyProfileId}`)');
    expect(step16).toContain('`/api/order-evidence/receipts/${receiptFileName}`');
    expect(step16).toContain('`/api/order-evidence/deliveries/${deliveryProofFileName}`');
    expect(step16).toContain('browserJsonRequest(adminPage, "DELETE", `/api/staff/${staffProfileId}`)');
    expect(step16).toContain('browserJsonRequest(adminPage, "DELETE", `/api/applicants/${applicantId}`)');
    expect(step16).toContain("applicationRowsRetained");
    expect(step16).toContain("cleanupSummary = {");
    expect(step16).toContain('reporting: "counts-only"');
    expect(step16).toContain('databaseOnlyGuarantees: "NOT VERIFIED"');
    expect(step16).toContain("deleteMailboxMessages(");
    expect(step16).not.toContain("dbQuery(");
    expect(step16).not.toContain("console.log");
    expect(signOutHelper).toContain(
      "await signOutButton.click({ trial: true, timeout: 5_000 })",
    );
    expect(signOutHelper).toContain("recordAuthCookieWriters(page)");
    expect(signOutHelper).toContain("await cookieWriterRecorder.stop()");
    expect(signOutHelper).toContain('page.on("response", observeAuthBoundaryResponse)');
    expect(signOutHelper).toContain('page.off("response", observeAuthBoundaryResponse)');
    expect(signOutHelper).toContain('"/api/auth/session/recover"');
    expect(signOutHelper.indexOf("click({ trial: true")).toBeLessThan(
      signOutHelper.indexOf("page.waitForResponse("),
    );
    expect(specSource).toContain("describeRecognizedAuthCookies(cookies)");
    expect(specSource).toContain("cookie-writers=${JSON.stringify(cookieWriterEvents)}");
    expect(orderSteps).not.toContain("fewer than two active Delivery profiles");
    expect(familyOrdersReadiness).toContain('url.pathname === "/api/orders"');
    expect(familyOrdersReadiness).not.toContain(
      'url.pathname === "/api/orders/me"',
    );
    expect(familyOrdersReadiness).toContain('url.searchParams.has("limit")');
    expect(familyOrdersReadiness).toContain('url.searchParams.has("offset")');
    expect(orderSteps).toContain('uploadGeneratedPdfEvidence(\n      adminPage,\n      "deliveries"');
    expect(orderSteps).toContain("Number(purchasedOrder3.requestedTotalMinor)");
    expect(orderSteps).not.toContain("purchasedOrder3.differenceMinor");
    expect(orderSteps).toContain("actualTotalMinor - order3TotalMinor");
    expect(orderSteps).toContain("purchaseIdempotencyKey");
    expect(orderSteps).toContain("confirmationIdempotencyKey");
    expect(orderSteps).toContain('expect(failedAttempts[0]!.status).toBe("failed")');
    expect(orderSteps).toContain("expect(reassignedAttempts).toHaveLength(2)");
    expect(orderSteps).toContain('expect(reassignedAttempts[1]!.staffProfileId).toBe(staffBId)');
    expect(specSource).toContain("async function assertSponsorOrderProjection(");
    expect(orderSteps).not.toContain("dbQuery(");
    expect(orderSteps).not.toContain("console.log");
  });

  test("matches required Najm form labels without exact-name timeouts", () => {
    for (const requiredLabelMatcher of [
      "/^Guardian name\\s*\\*?$/",
      "/^Email\\s*\\*?$/",
      "/^Household phone\\s*\\*?$/",
      "/^Activation target \\(MAD\\)\\s*\\*?$/",
    ]) {
      expect(specSource).toContain(requiredLabelMatcher);
    }

    for (const staleExactSelector of [
      'getByLabel("Guardian name", { exact: true })',
      'getByLabel("Email", { exact: true })',
      'getByLabel("Household phone", { exact: true })',
      'getByLabel("Housing situation", { exact: true })',
      'getByLabel("Activation target (MAD)", { exact: true })',
    ]) {
      expect(specSource).not.toContain(staleExactSelector);
    }

    expect(specSource).toContain(
      'getByRole("combobox", { name: "Choose a housing situation", exact: true })',
    );
    expect(specSource).not.toContain('name: "Choose housing situation"');
    expect(specSource).not.toContain("getByLabel(/^Housing situation");
    expect(specSource).toContain(
      'expect(dialog.locator("#step-household")).toBeVisible({ timeout: 5_000 })',
    );
    expect(specSource).toContain(
      'expect(dialog.locator("#step-initial-children")).toBeVisible({ timeout: 5_000 })',
    );
    expect(specSource).toContain(
      'getByRole("button", { name: /^Add initial child\\b/ })',
    );
    expect(specSource).not.toContain(
      'getByRole("button", { name: "Add initial child", exact: true })',
    );
    expect(specSource).toContain(
      "await expect(childLegalName).toBeVisible({ timeout: 5_000 })",
    );
  });

  test("accepts the guarded login pathname after logout even with a redirect query", () => {
    expect(specSource).toContain(
      'await expect.poll(() => new URL(page.url()).pathname).toBe("/login")',
    );
    expect(specSource).not.toContain("toHaveURL(/\\/login$/)");
  });
});
