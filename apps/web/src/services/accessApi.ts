import { api } from "@/services/http";

export interface SponsorRegistrationResult {
  emailSent: boolean;
}

export interface AccessLoginResult {
  nextStep: "authenticated" | "family_password_setup" | "sponsor_email_otp";
  expiresAt?: string;
  resendAvailableAt?: string;
  maskedDestination?: string;
  emailSent?: boolean;
}

export interface SponsorEmailOtpSetup {
  nextStep: "sponsor_email_otp";
  expiresAt: string;
  resendAvailableAt: string;
  maskedDestination: string;
  emailSent: boolean;
}

function normalizeLoginIdentifier(identifier: string) {
  const trimmed = identifier.trim();
  if (trimmed.includes("@")) return trimmed.toLowerCase();

  const compact = trimmed.replace(/[\s().-]+/g, "");
  if (compact.startsWith("0")) return `+212${compact.slice(1)}`;
  if (compact.startsWith("212")) return `+${compact}`;
  return compact;
}

const familyCinCredentialPattern = /^[a-z]{1,3}\d{5,17}$/i;

function normalizeFamilyCinCredential(password: string) {
  const trimmed = password.trim();
  if (
    trimmed.length >= 8 &&
    trimmed.length <= 20 &&
    familyCinCredentialPattern.test(trimmed)
  ) {
    return trimmed.toLowerCase();
  }
  return password;
}

export async function loginWithIdentifier(input: {
  identifier: string;
  password: string;
  rememberMe: boolean;
  locale?: "en" | "fr" | "ar" | "es";
}) {
  return api.post<AccessLoginResult>("/access/login", {
    ...input,
    identifier: normalizeLoginIdentifier(input.identifier),
    password: normalizeFamilyCinCredential(input.password),
  });
}

export function getFamilyPasswordSetup() {
  return api.get<{ setupRequired: true; expiresAt: string }>(
    "/access/family-password/setup",
  );
}

export function changeFamilyFirstPassword(input: {
  newPassword: string;
}) {
  return api.post<{ changed: true; signInAgain: true }>(
    "/access/family-password/change",
    input,
  );
}

export function cancelFamilyPasswordSetup() {
  return api.post<{ cancelled: true }>("/access/family-password/cancel");
}

export function registerSponsorAccess(input: {
  name: string;
  email: string;
  password: string;
  locale: "en" | "fr" | "ar" | "es";
}) {
  return api.post<SponsorRegistrationResult>("/access/register/sponsor", input);
}

export function getSponsorEmailOtpSetup() {
  return api.get<SponsorEmailOtpSetup>("/access/email-verification/setup");
}

export function resendSponsorEmailOtp() {
  return api.post<SponsorEmailOtpSetup & { accepted: true }>(
    "/access/email-verification/resend",
  );
}

export function confirmEmailVerification(code: string) {
  return api.post<{ nextStep: "authenticated" }>(
    "/access/email-verification/confirm",
    { code },
  );
}

export function cancelSponsorEmailOtp() {
  return api.post<{ cancelled: true }>(
    "/access/email-verification/cancel",
  );
}
