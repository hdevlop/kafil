import { api } from "@/services/http";

import type { ApplicantFormValues } from "../config/schemas";
import type {
  ApplicantRecord,
  ApplicantSubmissionResponse,
  ApplicantEmailOtpConfirmResult,
  ApplicantEmailOtpSetup,
  ApplicantDecisionPayload,
} from "../types";

export interface ListApplicantsParams {
  limit?: number;
  offset?: number;
  status?: ApplicantRecord["status"];
  search?: string;
}

export function listApplicants(params: ListApplicantsParams = {}) {
  return api.getPage<ApplicantRecord>("/applicants", {
    query: {
      limit: params.limit ?? 100,
      offset: params.offset ?? 0,
      ...(params.status ? { status: params.status } : {}),
      ...(params.search ? { search: params.search } : {}),
    },
  });
}

export function getApplicant(id: string) {
  return api.get<ApplicantRecord>(`/applicants/${id}`);
}

export function countApplicants(status: ApplicantRecord["status"] = "pending_review") {
  return api.get<{ count: number }>("/applicants/count", {
    query: { status },
  });
}

export function approveApplicant(id: string) {
  return api.post<ApplicantDecisionPayload>(`/applicants/${id}/approve`);
}

export function rejectApplicant(id: string, reason: string) {
  return api.post<ApplicantDecisionPayload>(`/applicants/${id}/reject`, {
    reason: reason.trim(),
  });
}

export function deleteApplicant(id: string) {
  return api.delete<ApplicantRecord>(`/applicants/${id}`);
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
    password: input.values.password,
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
