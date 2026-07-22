import { auth } from "@/lib/auth";
import { api } from "@/services/http";

export interface SponsorRegistrationResult {
  emailSent: boolean;
}

export interface AccessLoginResult {
  mustChangePassword: boolean;
}

export async function loginWithIdentifier(input: {
  identifier: string;
  password: string;
}) {
  const result = await api.post<AccessLoginResult>("/access/login", input);
  // The access endpoint sets Najm's secure refresh/session cookies. Refreshing
  // once hydrates the published client state used by the rest of the app.
  await auth.client.refresh();
  return result;
}

export function getFamilyPasswordRequirement() {
  return api.get<{ mustChangePassword: boolean }>(
    "/access/family-password/requirement",
  );
}

export function changeFamilyFirstPassword(input: {
  currentPassword: string;
  newPassword: string;
}) {
  return api.post<{ changed: true; signInAgain: true }>(
    "/access/family-password/change",
    input,
  );
}

export function registerSponsorAccess(input: {
  name: string;
  email: string;
  password: string;
}) {
  return api.post<SponsorRegistrationResult>("/access/register/sponsor", input);
}

export function requestEmailVerification(email: string) {
  return api.post<{ accepted: true }>("/access/email-verification/request", {
    email,
  });
}

export function confirmEmailVerification(token: string) {
  return api.post<{ verified: true }>("/access/email-verification/confirm", {
    token,
  });
}
