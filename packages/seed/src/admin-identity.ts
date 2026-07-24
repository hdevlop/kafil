import { validateAdminEmail } from "./seed-config";

export interface BootstrapAdminIdentity {
  email: string;
  id: string;
}

export interface ReconcileAdminIdentityOptions {
  desiredEmail: string;
  existingAdmins: readonly BootstrapAdminIdentity[];
  findDesiredEmailOwner: () => Promise<{ id: string } | undefined>;
  revokeActiveTokens: (adminId: string) => Promise<void>;
  updateEmail: (adminId: string, desiredEmail: string) => Promise<void>;
}

export async function reconcileAdminIdentity({
  desiredEmail: rawDesiredEmail,
  existingAdmins,
  findDesiredEmailOwner,
  revokeActiveTokens,
  updateEmail,
}: ReconcileAdminIdentityOptions) {
  const desiredEmail = validateAdminEmail(rawDesiredEmail);

  if (existingAdmins.length > 1) {
    throw new Error(
      `Expected at most one bootstrap admin, found ${existingAdmins.length}.`,
    );
  }

  const admin = existingAdmins[0];
  if (admin?.email === desiredEmail) {
    return false;
  }

  const desiredEmailOwner = await findDesiredEmailOwner();
  if (desiredEmailOwner && desiredEmailOwner.id !== admin?.id) {
    throw new Error(
      `Cannot change the bootstrap admin email to '${desiredEmail}' because that email already belongs to another user.`,
    );
  }

  if (!admin) {
    return false;
  }

  await updateEmail(admin.id, desiredEmail);
  await revokeActiveTokens(admin.id);
  return true;
}
