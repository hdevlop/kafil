import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { hash } from "bcryptjs";
import { pool } from "@kafil/server/database";

import {
  phase6BrowserPassword,
  phase6BrowserUsers,
} from "../../scripts/phase6-e2e-fixtures";

const baseUrl = process.env.KAFIL_E2E_BASE_URL ?? "http://127.0.0.1:3210";
const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 10);
const applicantPassword = "ApplicantBrowser42!";
const approved = {
  userId: `applicant_browser_approved_${suffix}`,
  email: `applicant-approved-${suffix}@example.test`,
  phone: `+2127000${suffix.replace(/[^0-9]/g, "").padEnd(5, "4").slice(0, 5)}`,
  cin: `BA${suffix.toUpperCase()}`,
  name: `Approved Applicant ${suffix}`,
};
const rejected = {
  userId: `applicant_browser_rejected_${suffix}`,
  email: `applicant-rejected-${suffix}@example.test`,
  phone: `+2127111${suffix.replace(/[^0-9]/g, "").padEnd(5, "5").slice(0, 5)}`,
  cin: `BR${suffix.toUpperCase()}`,
  name: `Rejected Applicant ${suffix}`,
};
let approvedApplicantId = "";
let rejectedApplicantId = "";

async function seedApplicant(input: typeof approved) {
  const passwordHash = await hash(applicantPassword, 12);
  await pool.query(
    `INSERT INTO users
       (id, name, email, email_verified, phone, phone_verified, password, status, role_id)
     VALUES ($1, $2, $3, true, $4, true, $5, 'pending', NULL)`,
    [input.userId, input.name, input.email, input.phone, passwordHash],
  );
  const applicant = await pool.query<{ id: string }>(
    `INSERT INTO applicants
       (auth_user_id, name, email, phone, cin, gender, status)
     VALUES ($1, $2, $3, $4, $5, 'F', 'pending_review')
     RETURNING id`,
    [input.userId, input.name, input.email, input.phone, input.cin],
  );
  return applicant.rows[0]?.id ?? "";
}

async function clearApplicantUsers() {
  const ids = [approved.userId, rejected.userId];
  await pool.query(
    `DELETE FROM outbox_events
     WHERE aggregate_type = 'applicant'
       AND aggregate_id IN (SELECT id::text FROM applicants WHERE auth_user_id = ANY($1::text[]))`,
    [ids],
  );
  await pool.query(
    `DELETE FROM audit_events
     WHERE resource = 'applicants'
       AND resource_id IN (SELECT id::text FROM applicants WHERE auth_user_id = ANY($1::text[]))`,
    [ids],
  );
  await pool.query(`DELETE FROM users WHERE id = ANY($1::text[])`, [ids]);
}

async function setLanguage(context: BrowserContext, language: "en" | "fr" | "ar") {
  await context.addCookies([
    { name: "kafil-ui-language", value: language, url: baseUrl },
  ]);
}

async function login(
  page: Page,
  identifier: string,
  password: string,
  rememberMe = false,
) {
  await page.goto("/login");
  await page.getByLabel(/Email or phone|E-mail ou telephone|البريد الإلكتروني أو الهاتف/i).fill(identifier);
  await page.getByPlaceholder(/Enter your password|Saisissez votre mot de passe|أدخل كلمة المرور/i).fill(password);
  const remember = page.getByRole("checkbox");
  if (rememberMe && !(await remember.isChecked())) await remember.check();
  await page.getByRole("button", { name: /Log in|Se connecter|تسجيل الدخول/i }).click();
}

async function signOut(page: Page) {
  await page.getByRole("button", { name: /Sign out|Se déconnecter|تسجيل الخروج/i }).click();
  await expect(page).toHaveURL(/\/login/);
}

test.describe.serial("applicant decision real browser workflow", () => {
  test.setTimeout(120_000);

  test.beforeAll(async () => {
    await clearApplicantUsers();
    approvedApplicantId = await seedApplicant(approved);
    rejectedApplicantId = await seedApplicant(rejected);
    if (!approvedApplicantId || !rejectedApplicantId) {
      throw new Error("Could not seed browser decision applicants");
    }
  });

  test.afterAll(async () => {
    await clearApplicantUsers();
    await pool.end();
  });

  test("pending identity has no session, admin approves from fresh details, and sponsor email/phone converge", async ({ page, context }) => {
    await setLanguage(context, "en");
    await login(page, approved.email, applicantPassword, true);
    await expect(page).toHaveURL(/\/login/);
    expect((await context.cookies()).find((cookie) => cookie.name === "refreshToken"))
      .toBeUndefined();

    await page.getByLabel("Email or phone").fill(phase6BrowserUsers.admin);
    await page.getByPlaceholder("Enter your password").fill(phase6BrowserPassword);
    const adminRefresh = page.waitForResponse(
      (response) => response.url().endsWith("/api/auth/refresh") && response.ok(),
    );
    await page.getByRole("button", { name: "Log in" }).click();
    await page.waitForURL(/\/dashboard$/);
    await adminRefresh;
    await page.getByRole("link", { name: "Applicants" }).click();
    await page.waitForURL(/\/applicants$/);
    await expect(page.getByText("All statuses")).toBeVisible();
    await expect(page.getByText(approved.name)).toBeVisible();

    const card = page.locator('[data-slot="card"]').filter({ hasText: approved.name });
    await card.getByRole("button", { name: "Row actions" }).click();
    await page.getByRole("menuitem", { name: "View" }).click();
    await expect(page.getByRole("heading", { name: "Applicant details" })).toBeVisible();
    await page.getByRole("button", { name: "Approve" }).last().click();
    await page.getByRole("button", { name: "Approve" }).last().click();
    await expect(page.getByRole("button", { name: "Approve" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Reject" })).toHaveCount(0);
    await page.keyboard.press("Escape");
    await signOut(page);

    const sponsorProfile = page.waitForResponse(
      (response) => response.url().endsWith("/api/sponsors/me/profile") && response.ok(),
    );
    await login(page, approved.email, applicantPassword, true);
    await page.waitForURL(/\/dashboard$/);
    await sponsorProfile;
    for (const label of ["Overview", "Families", "Contributions", "Orders", "Profile"]) {
      await expect(page.getByRole("link", { name: label })).toBeVisible();
    }
    const cookies = await context.cookies();
    expect(cookies.find((cookie) => cookie.name === "kafil.remember")?.value).toBe("1");
    expect(cookies.find((cookie) => cookie.name === "refreshToken")?.expires ?? -1)
      .toBeGreaterThan(0);
    await signOut(page);

    await login(page, approved.phone, applicantPassword);
    await page.waitForURL(/\/dashboard$/);
    await expect(page.getByRole("link", { name: "Families" })).toBeVisible();
  });

  test("admin rejects with localized validation and rejected identity remains denied", async ({ page, context }) => {
    await setLanguage(context, "fr");
    const adminRefresh = page.waitForResponse(
      (response) => response.url().endsWith("/api/auth/refresh") && response.ok(),
    );
    await login(page, phase6BrowserUsers.admin, phase6BrowserPassword);
    await page.waitForURL(/\/dashboard$/);
    await adminRefresh;
    await page.getByRole("link", { name: "Candidatures" }).click();
    await page.waitForURL(/\/applicants$/);
    await expect(page.getByText("Tous les statuts")).toBeVisible();
    const card = page.locator('[data-slot="card"]').filter({ hasText: rejected.name });
    await card.getByRole("button", { name: "Row actions" }).click();
    await page.getByRole("menuitem", { name: "Rejeter" }).click();
    await page.getByRole("button", { name: "Rejeter" }).last().click();
    await expect(page.getByText("Indiquez un motif de rejet")).toBeVisible();
    await page.getByRole("dialog").getByRole("textbox").fill("Identite non admissible");
    await page.getByRole("button", { name: "Rejeter" }).last().click();
    await expect(page.getByText(rejected.name)).toHaveCount(0);
    await signOut(page);

    await setLanguage(context, "ar");
    await login(page, rejected.email, applicantPassword);
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    expect((await context.cookies()).find((cookie) => cookie.name === "refreshToken"))
      .toBeUndefined();
  });
});
