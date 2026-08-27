import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import {
  REMOTE_GREP_MAX_LENGTH,
  buildRemotePlaywrightArgs,
  buildSshTunnelArgs,
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
  KAFIL_E2E_SSH_HOST: "demo.example.test",
  KAFIL_E2E_SSH_USER: "tester",
  KAFIL_E2E_SSH_PORT: "22",
  KAFIL_E2E_MAILBOX_LOCAL_PORT: "58025",
  KAFIL_E2E_MAILBOX_REMOTE_PORT: "58025",
  KAFIL_E2E_MAILBOX_API_URL: "http://127.0.0.1:58025",
  KAFIL_E2E_MAILBOX_USER: "acceptance",
  KAFIL_E2E_MAILBOX_PASSWORD: "not-a-runtime-secret",
};

const runnerSource = readFileSync(
  new URL("../scripts/run-connected-four-account-remote-e2e.ts", import.meta.url),
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

describe("connected four-account remote runner", () => {
  test("accepts only the exact authorized HTTPS origin and loopback mailbox", () => {
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
        KAFIL_E2E_MAILBOX_API_URL: "http://203.0.113.10:58025",
      }),
    ).toThrow();
    expect(() =>
      readRemoteAcceptanceConfig({
        ...validEnvironment,
        KAFIL_E2E_SSH_PASSWORD: "forbidden",
      }),
    ).toThrow();
  });

  test("builds a fail-closed owned SSH forward without a password", () => {
    const args = buildSshTunnelArgs(readRemoteAcceptanceConfig(validEnvironment));
    expect(args).toContain("BatchMode=yes");
    expect(args).toContain("ExitOnForwardFailure=yes");
    expect(args).toContain("StrictHostKeyChecking=yes");
    expect(args).toContain("58025:127.0.0.1:58025");
    expect(args.join(" ")).not.toContain("not-a-runtime-secret");
  });

  test("validates and forwards one optional remote grep argument", () => {
    const grep = "remote unit [AB]|remote diagnostics";
    expect(readRemoteGrep({ KAFIL_E2E_REMOTE_GREP: `  ${grep}  ` })).toBe(grep);
    expect(readRemoteAcceptanceConfig({
      ...validEnvironment,
      KAFIL_E2E_REMOTE_GREP: grep,
    }).grep).toBe(grep);
    expect(buildRemotePlaywrightArgs(grep).slice(-2)).toEqual(["--grep", grep]);
    expect(buildRemotePlaywrightArgs()).not.toContain("--grep");
    expect(() => readRemoteGrep({ KAFIL_E2E_REMOTE_GREP: "unit A\n--help" })).toThrow();
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
    expect(runnerSource).toContain('"--preflight-only"');
    expect(runnerSource).toContain("buildRemotePlaywrightArgs(config.grep)");
    expect(runnerSource.indexOf("await waitForMailbox")).toBeLessThan(
      runnerSource.indexOf("buildRemotePlaywrightArgs(config.grep)"),
    );
    expect(configSource).toContain('baseURL !== "https://kafala360.ma"');
    expect(configSource).toContain("timeout: 180_000");
    expect(configSource).toContain("ignoreHTTPSErrors: false");
    expect(configSource).toContain('preserveOutput: "never"');
    expect(configSource).toContain('trace: "off"');
  });

  test("defines serial remote units A-G with isolated contexts and passive diagnostics", () => {
    const unitA = specSource.slice(
      specSource.indexOf('test("remote unit A - guarded admin smoke"'),
      specSource.indexOf('test("remote unit B - Family creation and first login"'),
    );
    expect(specSource).toContain('test.describe.serial("connected VPS acceptance"');
    expect(specSource).toContain('test("remote unit A - guarded admin smoke"');
    expect(specSource).toContain('test("remote unit B - Family creation and first login"');
    expect(specSource).toContain('test("remote unit C - Sponsor A application and approval"');
    expect(specSource).toContain('test("remote unit D - Sponsor B application and approval"');
    expect(specSource).toContain('test("remote unit E - assignments and sponsor privacy"');
    expect(specSource).toContain('test("remote unit F - contributions and exact funding"');
    expect(specSource).toContain('test("remote unit G - ordering and delivery"');
    expect(specSource).toContain('test("remote diagnostics - final context assertions"');
    expect(specSource).toContain("browser.newContext()");
    expect(unitA).toContain('"/api/dashboard/operator"');
    expect(unitA).toContain('"Operator dashboard"');
    expect(unitA).not.toContain("/^Welcome,/i");
  });

  test("pins Family creation, credential setup, replay denial, and role boundaries", () => {
    const unitB = specSource.slice(
      specSource.indexOf('test("remote unit B - Family creation and first login"'),
      specSource.indexOf('test("remote unit C - Sponsor A application and approval"'),
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
    expect(unitB).toContain('adminPage.getByText("Loading…", { exact: true })');
    expect(unitB).toContain('name: "Operator dashboard", exact: true');
    expect(unitB).toContain("expect(createFamilyRequestCount).toBe(0)");
    expect(unitB).toContain("expect(createFamilyRequestCount).toBe(1)");
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
    const unitC = specSource.slice(
      specSource.indexOf('test("remote unit C - Sponsor A application and approval"'),
      specSource.indexOf('test("remote unit D - Sponsor B application and approval"'),
    );
    for (const contract of [
      '"/api/applicants"',
      '"/api/applicants/email-verification/confirm"',
      '"/api/dashboard/sponsor"',
      '"/api/sponsors/me/profile"',
      '"Application pending review"',
      '"Find a family to support"',
    ]) {
      expect(unitC).toContain(contract);
    }
    expect(unitC).toContain("expect(applicationRequestCount).toBe(0)");
    expect(unitC).toContain("expect(applicationRequestCount).toBe(1)");
    expect(unitC).toContain('browserJsonRequest(adminPage, "GET", "/api/auth/me")');
    expect(unitC).toContain('expect(responseRecord(adminIdentity.body).role).toBe("admin")');
    expect(unitC).toContain('"/api/applicants?limit=1&offset=0"');
    expect(unitC.indexOf("const applicantsCapability")).toBeLessThan(
      unitC.indexOf("let applicationRequestCount"),
    );
    expect(unitC).toContain('{ method: "GET", path: "/api/applicants", status: 401 }');
    expect(unitC).toContain("response.status() < 400");
    expect(unitC).toContain("pollExactlyOneOtpMessage({");
    expect(unitC).toContain("subjectKeyword: otpSubjectKeyword");
    expect(unitC).toContain("expect(confirmedOtpMessages).toHaveLength(1)");
    expect(unitC.indexOf("const confirmResponse")).toBeLessThan(
      unitC.indexOf("await deleteMailboxMessage(otpMessage.ID)"),
    );
    expect(unitC).toContain(
      "await submitPreparedLogin(sponsorPage, sponsorADiagnostics, 403)",
    );
    expect(unitC).toContain("expect(applicantMatches).toHaveLength(1)");
    expect(unitC).toContain(
      'const applicantSearch = await onlyVisible(\n      adminPage.getByPlaceholder("Search applicant name...", { exact: true }),\n    )',
    );
    expect(unitC).toContain("await applicantSearch.fill(sponsorAName)");
    expect(unitC).not.toContain(
      'adminPage\n      .getByPlaceholder("Search applicant name...", { exact: true })\n      .fill(sponsorAName)',
    );
    expect(unitC).toContain("expect(approval.status()).toBe(200)");
    expect(unitC).toContain("status: 409");
    expect(unitC).toContain("prepareLogin(sponsorPage, expectedPhoneE164, sponsorAPassword)");
    expect(specSource).toContain("sponsorAContext = await newIsolatedContext(browser)");
    expect(specSource).toContain('assertDiagnosticsClean("sponsor-a", sponsorADiagnostics)');
    expect(specSource).not.toContain("@kafil/server/database");
    expect(specSource).not.toContain("dbQuery(");
    expect(specSource).not.toContain("console.log");
    expect(specSource).toContain("cookies.some((cookie) =>");
    expect(specSource).toContain("expect(hasAuthCookie).toBe(false)");
    expect(specSource).not.toContain("cookies.find((cookie) =>");
  });

  test("pins independent Sponsor B OTP, approval replay, and logout boundaries", () => {
    const unitD = specSource.slice(
      specSource.indexOf('test("remote unit D - Sponsor B application and approval"'),
      specSource.indexOf('test("remote unit E - assignments and sponsor privacy"'),
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
      expect(unitD).toContain(contract);
    }
    expect(specSource).toContain("sponsorBContext = await newIsolatedContext(browser)");
    expect(specSource).toContain('assertDiagnosticsClean("sponsor-b", sponsorBDiagnostics)');
    expect(unitD).toContain("await deleteMailboxMessage(otpMessage.ID)");
    expect(unitD).toContain("await signOut(sponsorPage)");
    expect(unitD).not.toContain("sponsorAEmail");
    expect(unitD).not.toContain("sponsorAPassword");
    expect(unitD).not.toContain("sponsorAApplicantId");
  });

  test("pins Unit E assignment, privacy, canary, and cleanup contracts", () => {
    const assignmentHelper = specSource.slice(
      specSource.indexOf("async function openComboboxSearch("),
      specSource.indexOf('test.describe.serial("connected VPS acceptance"'),
    );
    const unitE = specSource.slice(
      specSource.indexOf('test("remote unit E - assignments and sponsor privacy"'),
      specSource.indexOf('test("remote unit F - contributions and exact funding"'),
    );
    expect(unitE).toContain("await createAssignmentThroughUi(adminPage, sponsorAEmail)");
    expect(unitE).toContain("await createAssignmentThroughUi(adminPage, sponsorBEmail)");
    expect(unitE).toContain('{ method: "POST", path: duplicatePath, status: 409 }');
    expect(unitE).toContain("expect(activeAssignments).toHaveLength(2)");
    expect(unitE).toContain('"&status=active&limit=100&offset=0"');
    expect(unitE).toContain('await page.goto("/sponsor/support", { waitUntil: "commit" })');
    expect(unitE).toContain('toBe("/family")');
    expect(unitE).toContain(
      '"/api/support-assignments/catalog?relationship=supported&limit=100&offset=0"',
    );
    expect(unitE).toContain("expect(familyRows).toHaveLength(1)");
    expect(unitE).toContain("containsForbiddenProjectionKey(sponsorProjection)");
    expect(unitE).toContain("containsSensitiveValue(sponsorProjection");
    expect(unitE).toContain('"/api/contributions/me/plans"');
    expect(unitE).toContain('"/api/contributions/me"');
    expect(unitE.match(/status: 404/g)).toHaveLength(3);
    expect(unitE).toContain("Acceptance privacy canary complete");
    expect(unitE).toContain('toBe("stopped")');
    expect(unitE).toContain('toBe("rejected")');
    expect(unitE).not.toContain("dbQuery(");
    expect(unitE).not.toContain("console.log");
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

  test("pins Unit F plan ownership, idempotent commands, and exact funding", () => {
    const unitF = specSource.slice(
      specSource.indexOf('test("remote unit F - contributions and exact funding"'),
      specSource.indexOf('test("remote unit G - ordering and delivery"'),
    );
    expect(unitF).toContain("readFamilyFundingFromSponsorCatalog(");
    expect(unitF).toContain('await adminPage.goto("/dashboard", { waitUntil: "commit" })');
    expect(unitF).not.toContain("prepareLogin(adminPage");
    expect(unitF).not.toContain("submitPreparedLogin(adminPage");
    expect(unitF).toContain('kind: "monthly"');
    expect(unitF).toContain('/pause`');
    expect(unitF).toContain('/resume`');
    expect(unitF).toContain('/stop`');
    expect(unitF).toContain("Acceptance resume-after-stop proof");
    expect(unitF).toContain("sponsorBDiagnostics");
    expect(unitF.match(/status: 404/g)).toHaveLength(2);
    expect(unitF.match(/status: 409/g)).toHaveLength(1);
    expect(unitF).toContain("acceptance-funding-reject");
    expect(unitF).toContain("acceptance-funding-refund");
    expect(unitF).toContain("validationReplay.status");
    expect(unitF).toContain("refundReplay.status");
    expect(unitF).toContain("sponsorATargetMinor + sponsorBTargetMinor");
    expect(unitF).toContain('expect(funding.status).toBe("pending_funding")');
    expect(unitF).toContain('expect(funding.status).toBe("active")');
    expect(unitF).toContain('expect(funding.capacityStatus).toBe("funded")');
    expect(unitF).toContain("const fundedFamilyRows = sponsorAPage.locator(");
    expect(unitF).toContain(
      "has: sponsorAPage.getByText(familyName, { exact: true })",
    );
    expect(unitF).toContain(
      'getByRole("navigation", {\n      name: "Pagination",\n      exact: true,',
    );
    expect(unitF).toContain(
      'getByRole("button", {\n        name: "Next page",\n        exact: true,',
    );
    expect(unitF).not.toContain(
      'getByRole("button", {\n        name: "Next",\n        exact: true,',
    );
    expect(unitF).toContain('locator(\'[aria-current="page"]\')');
    expect(unitF).toContain('const fundedProgress = await onlyVisible(');
    expect(unitF).toContain('fundedFamilyRow.getByRole("progressbar"');
    expect(unitF).not.toContain('locator(\'[data-slot="card"]\')');
    expect(unitF).not.toContain('sponsorAPage.getByRole("progressbar")');
    expect(unitF).toContain('expect(fundedProgress).toHaveAttribute(\n      "aria-valuenow",');
    expect(unitF).toContain("expect(sponsorATargetRows).toHaveLength(1)");
    expect(unitF).toContain("expect(sponsorBTargetRows).toHaveLength(1)");
    expect(unitF).toContain("expect(adminTargetRows).toHaveLength(2)");
    expect(unitF).not.toContain("dbQuery(");
    expect(unitF).not.toContain("console.log");
  });

  test("pins Unit G order money, delivery retry, privacy, and denial contracts", () => {
    const deliveryStaffHelper = specSource.slice(
      specSource.indexOf("async function createDeliveryStaffThroughUi"),
      specSource.indexOf("async function readFamilyFundingFromSponsorCatalog"),
    );
    const unitG = specSource.slice(
      specSource.indexOf('test("remote unit G - ordering and delivery"'),
      specSource.indexOf('test("remote diagnostics - final context assertions"'),
    );
    const familyOrdersReadiness = unitG.slice(
      unitG.indexOf("const familyOrdersResponse"),
      unitG.indexOf("const order1Cell"),
    );
    for (const contract of [
      '"/api/catalog/browse/products?limit=100&offset=0"',
      '"/api/staff/options/delivery"',
      '"/api/orders/cart/items"',
      '"/api/orders/submit"',
      "/purchase`",
      "/delivery/assign`",
      "/delivery/start`",
      "/delivery/fail`",
      "/delivery/confirm`",
      '"/api/orders/supported?limit=100&offset=0"',
    ]) {
      expect(unitG).toContain(contract);
    }
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
    // Unit G attempt's successor; it must not come back as a filled field.
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
    expect(unitG).toContain("uploadGeneratedPdfEvidence(adminPage, \"receipts\")");
    expect(unitG).toContain("createDeliveryStaffThroughUi(adminPage, fixture)");
    expect(unitG).toContain("test.setTimeout(300_000);");
    expect(unitG).toContain("expect(deliveryStaff).toHaveLength(2)");
    expect(unitG).toContain("expect(staffA.id).toBe(createdDeliveryStaff[0]!.id)");
    expect(unitG).toContain("expect(staffB.id).toBe(createdDeliveryStaff[1]!.id)");
    expect(unitG).not.toContain("fewer than two active Delivery profiles");
    expect(familyOrdersReadiness).toContain('url.pathname === "/api/orders"');
    expect(familyOrdersReadiness).not.toContain(
      'url.pathname === "/api/orders/me"',
    );
    expect(familyOrdersReadiness).toContain('url.searchParams.has("limit")');
    expect(familyOrdersReadiness).toContain('url.searchParams.has("offset")');
    expect(unitG).toContain('uploadGeneratedPdfEvidence(\n      adminPage,\n      "deliveries"');
    expect(unitG).toContain("Number(purchasedOrder3.requestedTotalMinor)");
    expect(unitG).not.toContain("purchasedOrder3.differenceMinor");
    expect(unitG).toContain("actualTotalMinor - order3TotalMinor");
    expect(unitG).toContain("purchaseIdempotencyKey");
    expect(unitG).toContain("confirmationIdempotencyKey");
    expect(unitG).toContain('expect(failedAttempts[0]!.status).toBe("failed")');
    expect(unitG).toContain("expect(reassignedAttempts).toHaveLength(2)");
    expect(unitG).toContain('expect(reassignedAttempts[1]!.staffProfileId).toBe(staffB.id)');
    expect(unitG).toContain("sponsorAllowedOrderKeys");
    expect(unitG).toContain("sponsorForbiddenKeys");
    expect(unitG).toContain("containsSensitiveValue(orderMatches[0], sponsorSensitiveValues)");
    expect(unitG.match(/status: 403/g)).toHaveLength(3);
    expect(unitG).not.toContain("dbQuery(");
    expect(unitG).not.toContain("console.log");
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
