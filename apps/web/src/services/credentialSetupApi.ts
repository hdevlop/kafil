import { api } from "@/services/http";

export interface CredentialSetupPending {
  nextStep: "credential_setup";
  setupRequired: true;
  purpose: string;
  expiresAt: string;
}

/**
 * Najm owns the flow; Kafil only calls it. Identifier and CIN normalization
 * happen server-side through the default Moroccan identity preset, so nothing
 * is rewritten here before the request goes out.
 */
export function getCredentialSetupStatus() {
  return api.get<CredentialSetupPending>("/auth/credential-setup/setup");
}

export function replaceCredentialSetupPassword(input: { newPassword: string }) {
  return api.post<{ changed: true; signInAgain: true }>(
    "/auth/credential-setup/change",
    input,
  );
}

export function cancelCredentialSetup() {
  return api.post<{ cancelled: true }>("/auth/credential-setup/cancel");
}
