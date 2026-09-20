import type { AccessResetMode, AccessUser } from "../types";

/**
 * What the dialog expects the server to do, so its copy can name the actual
 * consequence before the administrator confirms it.
 *
 * This mirrors `resolveResetMode` in `adminAccessService`, and it is
 * presentation only: the server reloads the account and decides again, so a row
 * that went stale while the table was open is refused there, not here. When the
 * two disagree the server wins and the dialog reports what really happened.
 */
export type AccessResetExpectation = AccessResetMode | "unsupported";

const STAFF_ROLES = new Set(["operator", "delivery"]);

export function expectedResetMode(user: AccessUser): AccessResetExpectation {
  const role = user.role ?? "";
  const linkedProfileId = STAFF_ROLES.has(role)
    ? user.staffProfileId
    : role === "sponsor"
      ? user.sponsorProfileId
      : role === "family"
        ? user.familyProfileId
        : null;

  // No linked profile covers the bootstrap admin and the sponsor applicant
  // whose application has not been approved yet.
  if (!linkedProfileId || user.status === "inactive") return "unsupported";
  if (user.status === "pending") {
    return role === "family" ? "unsupported" : "invitation_resent";
  }
  return role === "family" ? "family_credential_setup" : "reset_email_sent";
}

export function canResetAccess(user: AccessUser): boolean {
  return expectedResetMode(user) !== "unsupported";
}
