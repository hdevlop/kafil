import { auth } from "@/lib/auth";
import { api } from "@/services/http";

export interface SponsorRegistrationResult {
  emailSent: boolean;
}

export interface AccessLoginResult {
  mustChangePassword: boolean;
}

type IdentifierLoginCredentials = {
  identifier: string;
  password: string;
};

function normalizeLoginIdentifier(identifier: string) {
  const trimmed = identifier.trim();
  if (trimmed.includes("@")) return trimmed.toLowerCase();

  const compact = trimmed.replace(/[\s().-]+/g, "");
  if (compact.startsWith("0")) return `+212${compact.slice(1)}`;
  if (compact.startsWith("212")) return `+${compact}`;
  return compact;
}

export async function loginWithIdentifier(input: {
  identifier: string;
  password: string;
}) {
  // Najm Auth accepts `identifier` at runtime, although 2.0.11's client
  // declaration still exposes only the legacy email-shaped overload. Going
  // through client.login is important: applying the returned tokens also
  // resets a refresh circuit opened by the previous expired session.
  const identifierClient = auth.client as typeof auth.client & {
    login(credentials: IdentifierLoginCredentials): ReturnType<
      typeof auth.client.login
    >;
  };
  await identifierClient.login({
    ...input,
    identifier: normalizeLoginIdentifier(input.identifier),
  });

  if (!auth.client.hasRole("family")) {
    return { mustChangePassword: false };
  }

  return getFamilyPasswordRequirement();
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
