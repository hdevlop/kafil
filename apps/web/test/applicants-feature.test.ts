import { describe, expect, spyOn, test } from "bun:test";
import { readFileSync } from "node:fs";

import {
  applicantEmailOtpSchema,
  applicantFormSchema,
  applicantRejectReasonSchema,
  submitApplicant,
  confirmApplicantEmailOtp,
  getApplicantEmailOtpSetup,
  resendApplicantEmailOtp,
} from "../src/features/Applicants";
import { getUiTranslation } from "../src/i18n/translations";

function source(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("applicant creation form", () => {
  test("accepts a complete reviewable applicant record", () => {
    const result = applicantFormSchema.safeParse({
      name: "Amina Tazi",
      email: "amina.tazi@example.com",
      phone: "+212612345678",
      cin: "AB123456",
      gender: "female",
      password: "KafilDev123",
    });
    expect(result.success).toBe(true);
  });

  test("rejects a weak password", () => {
    expect(
      applicantFormSchema.safeParse({
        name: "Amina Tazi",
        email: "amina.tazi@example.com",
        phone: "+212612345678",
        cin: "AB123456",
        gender: "female",
        password: "weak",
      }).success,
    ).toBe(false);
  });

  test("normalizes the email to lowercase and the phone to the Moroccan international format", async () => {
    const { auth } = await import("../src/lib/auth");
    const post = spyOn(auth.api, "post").mockResolvedValue({
      data: {
        nextStep: "applicant_email_otp",
        expiresAt: "2026-08-02T12:10:00.000Z",
        resendAvailableAt: "2026-08-02T12:01:00.000Z",
        maskedDestination: "a*****@example.com",
        emailSent: true,
      },
      status: "success",
    } as never);

    await submitApplicant({
      values: {
        name: "Amina Tazi",
        email: "Amina.Tazi@Example.com",
        phone: "06 12 34 56 78",
        cin: "ab123456",
        gender: "female",
        password: "KafilDev123",
      },
      locale: "en",
    });

    expect(post).toHaveBeenCalledWith("/applicants", {
      body: {
        name: "Amina Tazi",
        email: "amina.tazi@example.com",
        phone: "+212612345678",
        cin: "AB123456",
        gender: "F",
        password: "KafilDev123",
        locale: "en",
      },
    });

    post.mockRestore();
  });
});

describe("applicant email OTP", () => {
  test("accepts exactly six numeric digits", () => {
    expect(applicantEmailOtpSchema.safeParse({ code: "012345" }).success).toBe(true);
    expect(applicantEmailOtpSchema.safeParse({ code: "12345" }).success).toBe(false);
    expect(applicantEmailOtpSchema.safeParse({ code: "1234567" }).success).toBe(false);
  });

  test("exposes the public applicant API endpoints", () => {
    const api = source("../src/services/http.ts");
    expect(api).toContain('"/applicants"');
    expect(api).toContain('"/applicants/email-verification/setup"');
    expect(api).toContain('"/applicants/email-verification/resend"');
    expect(api).toContain('"/applicants/email-verification/confirm"');
    expect(getApplicantEmailOtpSetup).toBeDefined();
    expect(resendApplicantEmailOtp).toBeDefined();
    expect(confirmApplicantEmailOtp).toBeDefined();
  });
});

describe("applicant creation thin route", () => {
  test("owns application UI in features/Applicants and not in Auth or Sponsors", () => {
    const form = source("../src/features/Applicants/components/ApplicantForm.tsx");
    const otp = source("../src/features/Applicants/components/OtpStep.tsx");
    const page = source("../src/features/Applicants/components/ApplicantPage.tsx");
    const route = source("../src/app/(auth)/apply/page.tsx");
    const auth = source("../src/lib/auth.ts");

    expect(route).toContain("ApplicantPage");
    expect(route).not.toContain("searchParams");
    expect(auth).toContain('"/apply"');

    expect(form).toContain('t("applicants.form.title")');
    expect(form).toContain('t("applicants.form.name")');
    expect(form).toContain('t("applicants.form.email")');
    expect(form).toContain('t("applicants.form.phone")');
    expect(form).toContain('t("applicants.form.cin")');
    expect(form).toContain('t("applicants.form.genderLabel")');
    expect(form).not.toContain('name="dateOfBirth"');
    expect(form).not.toContain('name="address"');
    expect(form).toContain('t("applicants.form.password")');
    expect(form).toMatch(/name="password"\s+type="text"/);
    expect(form).not.toContain('name="confirmPassword"');
    expect(form).toContain('t("applicants.form.submit")');

    expect(otp).toContain('type="otp"');
    expect(otp).toContain("length={6}");
    expect(otp).toContain('t("applicants.otp.title")');
    expect(otp).toContain('t("applicants.otp.codeLabel")');
    expect(otp).toContain('t("applicants.otp.submit")');
    expect(otp).toContain('t("applicants.otp.resend")');
    expect(otp).toContain('t("applicants.otp.cancel")');
    expect(otp).toContain("getApplicantEmailOtpSetup");
    expect(otp).toContain("resendApplicantEmailOtp");
    expect(otp).toContain("confirmApplicantEmailOtp");

    expect(page).toContain("ApplicantForm");
    expect(page).toContain("OtpStep");
    expect(page).toContain("PendingReview");
  });

  test("otp confirmation renders the pending review screen and never redirects to the dashboard", () => {
    const otp = source("../src/features/Applicants/components/OtpStep.tsx");
    expect(otp).not.toContain('window.location.replace("/dashboard")');
    expect(otp).toContain('onVerified');
  });

  test("does not accept any family context on the public application", () => {
    const form = source("../src/features/Applicants/components/ApplicantForm.tsx");
    const api = source("../src/features/Applicants/services/api.ts");
    const page = source("../src/app/(auth)/apply/page.tsx");
    const landing = source("../src/app/(landing)/page.tsx");

    expect(form).not.toContain("familyId");
    expect(form).not.toContain("family_id");
    expect(form).not.toContain("searchParams");
    expect(api).not.toContain("familyId");
    expect(api).not.toContain("family_id");
    expect(page).not.toContain("searchParams");
    expect(landing).toContain('href="/apply"');
    expect(landing).not.toContain('href="/register/sponsor"');
  });

  test("ships the complete application copy in every UI language", () => {
    for (const language of ["en", "fr", "ar", "es"] as const) {
      for (const key of [
        "applicants.form.title",
        "applicants.form.name",
        "applicants.form.email",
        "applicants.form.phone",
        "applicants.form.cin",
        "applicants.form.genderLabel",
        "applicants.form.password",
        "applicants.form.submit",
        "applicants.otp.title",
        "applicants.otp.codeLabel",
        "applicants.otp.submit",
        "applicants.otp.resend",
        "applicants.otp.cancel",
        "applicants.otp.invalid",
        "applicants.otp.success",
        "applicants.review.title",
        "applicants.review.body",
        "applicants.review.backHome",
        "applicants.review.signIn",
      ] as const) {
        expect(getUiTranslation(language, key)).not.toBe(key);
      }
    }
  });
});

describe("admin applicant queue", () => {
  test("uses the shared management workspace structure", () => {
    const page = source("../src/features/Applicants/components/ApplicantsPage.tsx");
    const route = source("../src/app/(dashboard)/applicants/page.tsx");
    const sidebar = source("../src/shared/DashboardShell/index.tsx");
    const auth = source("../src/lib/auth.ts");

    expect(route).toContain("<ApplicantsPage />");
    expect(route).toContain('requireRole(["admin"])');
    expect(sidebar).toContain('href: "/applicants"');
    expect(sidebar).toContain("includeApplicants");
    expect(auth).toContain('"/applicants": ["admin"]');
    expect(page).toContain("<NPageLayout");
    expect(page).toContain("<NPageHeader");
    expect(page).toContain("<NTable");
    expect(page).toContain('availableModes: ["cards", "table"]');
    expect(page).toContain('defaultMode: "cards"');
    expect(page).toContain("responsiveCards: true");
    expect(page).toContain("filters");
    expect(page).not.toContain("onCreate:");
    expect(page).toContain("onView: openView");
    expect(page).toContain("dialog.openDialog");
    expect(page).toContain('"pending_review"');
    expect(page).toContain('applicant.status === "rejected"');
    expect(page).toContain("useApplicantsTableFilters()");
    expect(page).not.toContain("<NativeSelect");
    expect(page).not.toContain("useApplicantPendingReviewCount");
    expect(page).not.toContain("<NBadge");
    const card = source(
      "../src/features/Applicants/components/ApplicantCard.tsx",
    );
    expect(card).toContain("<StatusBadge");
    expect(card).toContain("status={data.status}");
  });

  test("uses fresh detail queries and localized rejection validation", () => {
    const details = source(
      "../src/features/Applicants/components/ApplicantDetails.tsx",
    );
    expect(details).toContain("useApplicant(initialApplicant.id, initialApplicant)");
    expect(details).toContain('applicant.status === "rejected"');

    for (const language of ["en", "fr", "ar", "es"] as const) {
      const required = getUiTranslation(
        language,
        "operator.applicants.rejectionReasonRequired",
      );
      const tooLong = getUiTranslation(
        language,
        "operator.applicants.rejectionReasonTooLong",
      );
      const schema = applicantRejectReasonSchema({ required, tooLong });
      const empty = schema.safeParse({ reason: "" });
      const long = schema.safeParse({ reason: "x".repeat(501) });
      expect(empty.success).toBe(false);
      expect(long.success).toBe(false);
      if (!empty.success) expect(empty.error.issues[0]?.message).toBe(required);
      if (!long.success) expect(long.error.issues[0]?.message).toBe(tooLong);
    }
  });

  test("ships the admin applicant workspace copy in every UI language", () => {
    for (const language of ["en", "fr", "ar", "es"] as const) {
      for (const key of [
        "nav.applicants",
        "operator.applicants.title",
        "operator.applicants.subtitle",
        "operator.applicants.add",
        "operator.applicants.searchName",
        "operator.applicants.searchEmail",
        "operator.applicants.searchPhone",
        "operator.applicants.filterStatus",
        "operator.applicants.viewTitle",
        "operator.applicants.copyLink",
        "operator.applicants.rejectionReasonRequired",
        "operator.applicants.rejectionReasonTooLong",
        "operator.applicants.allStatuses",
        "operator.applicants.loadDetailError",
      ] as const) {
        expect(getUiTranslation(language, key)).not.toBe(key);
      }
    }
  });
});

describe("applicant form CIN boundary (8..20, aligned with server)", () => {
  const validCinForm = {
    name: "Amina Tazi",
    email: "amina.tazi@example.com",
    phone: "+212612345678",
    cin: "AB123456",
    gender: "female",
    password: "KafilDev123",
  };

  test("accepts an 8-character CIN (lower boundary)", () => {
    expect(
      applicantFormSchema.safeParse({ ...validCinForm, cin: "AB123456" }).success,
    ).toBe(true);
  });

  test("accepts a 20-character CIN (upper boundary)", () => {
    expect(
      applicantFormSchema.safeParse({ ...validCinForm, cin: "A".repeat(20) })
        .success,
    ).toBe(true);
  });

  test("rejects a 7-character CIN before submission", () => {
    const result = applicantFormSchema.safeParse({
      ...validCinForm,
      cin: "A".repeat(7),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const cinIssue = result.error.issues.find((i) => i.path.includes("cin"));
      expect(cinIssue?.message).toBe("Enter your national identity number");
    }
  });

  test("rejects a 21-character CIN before submission", () => {
    const result = applicantFormSchema.safeParse({
      ...validCinForm,
      cin: "A".repeat(21),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const cinIssue = result.error.issues.find((i) => i.path.includes("cin"));
      expect(cinIssue?.message).toBe("Enter your national identity number");
    }
  });

  test("client CIN boundary (8..20) matches the server authoritative rule", () => {
    // The client and server share the same 8..20 CIN range so a seven-character
    // value is rejected before submission; server validation stays authoritative.
    expect(
      applicantFormSchema.safeParse({ ...validCinForm, cin: "A".repeat(7) })
        .success,
    ).toBe(false);
    expect(
      applicantFormSchema.safeParse({ ...validCinForm, cin: "A".repeat(21) })
        .success,
    ).toBe(false);
    expect(
      applicantFormSchema.safeParse({ ...validCinForm, cin: "A".repeat(8) })
        .success,
    ).toBe(true);
    expect(
      applicantFormSchema.safeParse({ ...validCinForm, cin: "A".repeat(20) })
        .success,
    ).toBe(true);
  });
});
