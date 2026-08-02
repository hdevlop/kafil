import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import { sponsorEmailOtpSchema } from "../src/features/Auth/config/authSchemas";
import { getPostLoginRoute } from "../src/features/Auth/lib/getPostLoginRoute";
import { getUiTranslation } from "../src/i18n/translations";

function source(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("sponsor email OTP activation", () => {
  test("accepts exactly six numeric digits", () => {
    expect(sponsorEmailOtpSchema.safeParse({ code: "012345" }).success).toBe(true);
    expect(sponsorEmailOtpSchema.safeParse({ code: "12345" }).success).toBe(false);
    expect(sponsorEmailOtpSchema.safeParse({ code: "12345a" }).success).toBe(false);
  });

  test("routes only the server-owned OTP next step to the verification page", () => {
    expect(getPostLoginRoute("sponsor_email_otp", "/orders")).toBe("/verify-email");
    expect(getPostLoginRoute("authenticated", "/orders")).toBe("/orders");
  });

  test("uses the published Najm Kit OTP field and guarded session commands", () => {
    const form = source("../src/features/Auth/components/VerifyEmailForm.tsx");
    const page = source("../src/app/(auth)/verify-email/page.tsx");
    const api = source("../src/services/accessApi.ts");

    expect(form).toContain('type="otp"');
    expect(form).toContain("length={6}");
    expect(form).toContain("numeric");
    expect(form).toContain('autoComplete="one-time-code"');
    expect(form).toContain("getSponsorEmailOtpSetup()");
    expect(form).toContain("resendSponsorEmailOtp()");
    expect(form).toContain("cancelSponsorEmailOtp()");
    expect(form).toContain('window.location.replace("/dashboard")');
    expect(page).not.toContain("searchParams");
    expect(page).not.toContain("token");
    expect(api).not.toContain("email-verification/request");
    expect(api).not.toMatch(/\{\s*token\s*[,}]/);
  });

  test("ships the complete OTP copy in every UI language", () => {
    for (const language of ["en", "fr", "ar", "es"] as const) {
      for (const key of [
        "access.emailOtp.title",
        "access.emailOtp.instructions",
        "access.emailOtp.expired",
        "access.emailOtp.resend",
        "access.emailOtp.cancel",
        "access.emailOtp.invalid",
        "access.emailOtp.success",
      ] as const) {
        expect(getUiTranslation(language, key)).not.toBe(key);
      }
    }
  });
});
