import { api } from "@/services/http";

import type { ApplicantFormValues } from "../config/schemas";
import type {
  ApplicantRecord,
  ApplicantSubmissionResponse,
  ApplicantEmailOtpConfirmResult,
  ApplicantEmailOtpSetup,
} from "../types";

export function listApplicants() {
  return api.get<ApplicantRecord[]>("/applicants", {
    query: { limit: 100, offset: 0 },
  });
}

export function getApplicant(id: string) {
  return api.get<ApplicantRecord>(`/applicants/${id}`);
}

function normalizePhone(phone: string) {
  const compact = phone.replace(/[\s().-]+/g, "");
  if (compact.startsWith("0")) return `+212${compact.slice(1)}`;
  if (compact.startsWith("212")) return `+${compact}`;
  return compact;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function sanitizeAddress(address: string) {
  return address.replace(/\s+/g, " ").trim();
}

export type ApplicantLocale = "en" | "fr" | "ar" | "es";

export function submitApplicant(input: {
  values: ApplicantFormValues;
  locale: ApplicantLocale;
}) {
  return api.post<ApplicantSubmissionResponse>("/applicants", {
    name: input.values.name.trim(),
    email: normalizeEmail(input.values.email),
    phone: normalizePhone(input.values.phone),
    cin: input.values.cin.toUpperCase(),
    gender: input.values.gender === "female" ? "F" : "M",
    address: sanitizeAddress(input.values.address),
    dateOfBirth: input.values.dateOfBirth,
    password: input.values.password,
    confirmPassword: input.values.confirmPassword,
    locale: input.locale,
  });
}

export function getApplicantEmailOtpSetup() {
  return api.get<ApplicantEmailOtpSetup>("/applicants/email-verification/setup");
}

export function resendApplicantEmailOtp() {
  return api.post<ApplicantEmailOtpSetup & { accepted: true }>(
    "/applicants/email-verification/resend",
  );
}

export function confirmApplicantEmailOtp(code: string) {
  return api.post<ApplicantEmailOtpConfirmResult>(
    "/applicants/email-verification/confirm",
    { code },
  );
}
