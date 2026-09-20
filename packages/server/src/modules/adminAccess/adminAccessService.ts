import { AuthService, TokenService, UserService } from "najm-auth";
import {
  isMoroccanCin,
  moroccanCinTemporaryCredential,
} from "najm-auth/identity/ma";
import { EmailService } from "najm-email";
import { HttpError, Service } from "najm-core";
import { Transaction } from "najm-database";

import {
  AUTH_PERMISSIONS,
  AUTH_ROLE_PERMISSIONS,
  AUTH_ROLES,
  type AuthRoleName,
} from "../../config/authDefinitions";
import { AuditService } from "../audit/auditService";
import {
  accessReasonDto,
  type AccessReasonDto,
  type AccessResetDelivery,
  type AccessResetMode,
  type AccessResetResult,
  createAccessPermissionDto,
  type CreateAccessPermissionDto,
  accessUserListQuery,
  type AccessUserListQuery,
} from "./adminAccessDto";
import { AdminAccessRepository } from "./adminAccessRepository";

type AccessUserRow = NonNullable<
  Awaited<ReturnType<AdminAccessRepository["findUser"]>>
>;

const STAFF_ROLES = new Set(["operator", "delivery"]);
const RESETTABLE_ROLES = new Set([...STAFF_ROLES, "sponsor", "family"]);

/**
 * Which recovery an account gets, decided from the row this command just
 * reloaded: its role, its status, and whether the matching Kafil profile
 * actually exists. Nothing the client sent takes part, so a table left open
 * since before an approval or a deactivation cannot select a workflow the
 * account is no longer entitled to.
 *
 * The linked-profile requirement is also what keeps a sponsor application out:
 * an applicant identity is a pending user with no sponsor profile, and
 * approving it is the applicant workflow's job, not this command's.
 */
function resolveResetMode(user: AccessUserRow): AccessResetMode {
  const role = user.role ?? "";
  if (!RESETTABLE_ROLES.has(role)) {
    HttpError.conflict("This account has no Kafil role that supports an access reset");
  }

  const linkedProfileId = STAFF_ROLES.has(role)
    ? user.staffProfileId
    : role === "sponsor"
      ? user.sponsorProfileId
      : user.familyProfileId;
  if (!linkedProfileId) {
    HttpError.conflict("This account has no linked Kafil profile to reset access for");
  }

  if (user.status === "inactive") {
    HttpError.conflict("Reactivate this account before resetting its access");
  }

  if (user.status === "pending") {
    if (role === "family") {
      // Families are provisioned active with a CIN they must replace; there is
      // no invitation to resend, so this is a conflict rather than a reset.
      HttpError.conflict("Family accounts are provisioned active and have no invitation to resend");
    }
    return "invitation_resent";
  }

  return role === "family" ? "family_credential_setup" : "reset_email_sent";
}

@Service()
export class AdminAccessService {
  constructor(
    private readonly repository: AdminAccessRepository,
    private readonly users: UserService,
    private readonly tokens: TokenService,
    private readonly audits: AuditService,
    private readonly auth: AuthService,
    private readonly emails: EmailService,
  ) {}

  async listUsers(query: AccessUserListQuery) {
    const { limit, offset, ...filters } = accessUserListQuery.parse(query ?? {});
    const [items, total] = await Promise.all([
      this.repository.listUsers(limit, offset, filters),
      this.repository.countUsers(filters),
    ]);
    return { items, total, limit, offset };
  }

  async getUser(userId: string) {
    const user = await this.requireUser(userId);
    const role = (await this.repository.listRoles()).find(
      (candidate) => candidate.id === user.roleId,
    );
    return {
      ...user,
      effectivePermissions: role?.permissions ?? [],
    };
  }

  async listRoles() {
    const live = await this.repository.listRoles();
    return AUTH_ROLES.map((canonical) => {
      const role = live.find((candidate) => candidate.name === canonical.name);
      const canonicalPermissions = AUTH_ROLE_PERMISSIONS[canonical.name];
      const livePermissions = new Set(
        role?.permissions.map((permission) => permission.name) ?? [],
      );
      return {
        ...role,
        id: role?.id ?? canonical.name,
        name: canonical.name,
        description: role?.description ?? canonical.description,
        userCount: role?.userCount ?? 0,
        permissionCount: role?.permissions.length ?? 0,
        codeManaged: true,
        inSync: canonicalPermissions.every((name) => livePermissions.has(name)),
      };
    });
  }

  async getRole(roleId: string) {
    const roles = await this.listRoles();
    const role = roles.find(
      (candidate) => candidate.id === roleId || candidate.name === roleId,
    );
    if (!role) {
      HttpError.notFound("Access role not found");
    }
    return role;
  }

  async listPermissions() {
    const live = await this.repository.listPermissions();
    const canonicalByName = new Map<string, (typeof AUTH_PERMISSIONS)[number]>(
      AUTH_PERMISSIONS.map((permission) => [permission.name, permission]),
    );
    const liveByName = new Map(live.map((permission) => [permission.name, permission]));
    const names = new Set([...canonicalByName.keys(), ...liveByName.keys()]);
    return [...names]
      .sort()
      .map((name) => {
        const permission = liveByName.get(name);
        const canonical = canonicalByName.get(name);
        const liveRoles = permission?.roles.map((role) => role.name) ?? [];
        const codeManaged = Boolean(canonical);
        const expectedRoles = codeManaged
          ? AUTH_ROLES.filter((role) =>
              (AUTH_ROLE_PERMISSIONS[role.name] as readonly string[]).includes(
                name,
              ),
            ).map((role) => role.name)
          : liveRoles.filter((role): role is AuthRoleName =>
              AUTH_ROLES.some((candidate) => candidate.name === role),
            );
        const missingRoles = expectedRoles.filter(
          (role) => !liveRoles.includes(role),
        );
        const unexpectedRoles = liveRoles.filter(
          (role) => !expectedRoles.includes(role as AuthRoleName),
        );
        return {
          id: permission?.id ?? name,
          name,
          description: permission?.description ?? canonical?.description ?? null,
          resource: permission?.resource ?? canonical?.resource ?? "",
          action: permission?.action ?? canonical?.action ?? "",
          roles: permission?.roles ?? [],
          expectedRoles,
          drift: !codeManaged
            ? "custom"
            : !permission || missingRoles.length
              ? "missing_live_grant"
              : unexpectedRoles.length
                ? "unexpected_live_grant"
                : "in_sync",
          missingRoles,
          unexpectedRoles,
          codeManaged,
        };
      });
  }

  @Transaction({ retries: 2 })
  async createPermission(
    data: CreateAccessPermissionDto,
    actorUserId: string,
  ) {
    const parsed = createAccessPermissionDto.parse(data);
    const name = `${parsed.action}:${parsed.resource}`;
    if (AUTH_PERMISSIONS.some((permission) => permission.name === name)) {
      HttpError.conflict("Canonical Kafil permission already exists");
    }
    if (await this.repository.findPermissionByName(name)) {
      HttpError.conflict("Permission already exists");
    }

    await this.repository.createPermission(
      {
        action: parsed.action,
        description: parsed.description || null,
        name,
        resource: parsed.resource,
      },
      parsed.roles,
    );

    const affectedUsers = await this.repository.listUserIdsByRoleNames(
      parsed.roles,
    );
    await Promise.all(
      affectedUsers.map(({ id }) =>
        this.tokens.invalidateUserAccessTokens(id),
      ),
    );
    await this.audits.record({
      action: "access.permission_created",
      actorUserId,
      metadata: {
        action: parsed.action,
        resource: parsed.resource,
        roles: parsed.roles,
      },
      resource: "permissions",
      resourceId: name,
    });

    const created = (await this.listPermissions()).find(
      (permission) => permission.name === name,
    );
    return created!;
  }

  @Transaction({ retries: 2 })
  async deactivate(
    userId: string,
    data: AccessReasonDto,
    actorUserId: string,
  ) {
    const { reason } = accessReasonDto.parse(data);
    const user = await this.requireUser(userId);
    this.ensureSafeTarget(user, actorUserId, "deactivate");
    await this.users.update(user.id, { status: "inactive" });
    if (user.staffProfileId) {
      await this.repository.syncStaffStatus(user.staffProfileId, "inactive");
    }
    await this.revokeAll(user.id);
    await this.record("access.user_deactivated", actorUserId, user.id, reason);
    return this.getUser(user.id);
  }

  @Transaction({ retries: 2 })
  async reactivate(
    userId: string,
    data: AccessReasonDto,
    actorUserId: string,
  ) {
    const { reason } = accessReasonDto.parse(data);
    const user = await this.requireUser(userId);
    if (
      user.role !== "admin" &&
      !user.familyProfileId &&
      !user.staffProfileId &&
      !user.sponsorProfileId
    ) {
      HttpError.conflict("Linked Kafil profile is required for reactivation");
    }
    await this.users.update(user.id, { status: "active" });
    if (user.staffProfileId) {
      await this.repository.syncStaffStatus(user.staffProfileId, "active");
    }
    await this.tokens.invalidateUserAccessTokens(user.id);
    await this.record("access.user_reactivated", actorUserId, user.id, reason);
    return this.getUser(user.id);
  }

  /**
   * One administrative recovery command for an account that already exists.
   * The client sends a target id and a reason; everything else — which of the
   * three workflows runs, whose mailbox it reaches, which credential replaces
   * which — is decided here from freshly reloaded state.
   *
   * The caller learns the mode and whether mail really left. It never learns
   * the guardian identity number, a password, a token, or a link.
   */
  async resetAccess(
    userId: string,
    data: AccessReasonDto,
    actorUserId: string,
  ): Promise<AccessResetResult> {
    const { reason } = accessReasonDto.parse(data);
    const user = await this.requireUser(userId);
    this.ensureSafeTarget(user, actorUserId, "reset access for");
    const mode = resolveResetMode(user);

    if (mode === "family_credential_setup") {
      await this.resetFamilyCredential(user.id, actorUserId, reason);
      return { userId: user.id, mode, delivery: "not_applicable" };
    }

    // Sending is irreversible, so it happens outside any transaction and the
    // audit entry afterwards records what actually happened rather than what
    // was intended. An audit failure here surfaces as an error on a request
    // whose mail already left — visible and recoverable, never silent.
    const { emailSent } = mode === "invitation_resent"
      ? await this.auth.resendInvitation(user.id)
      : await this.auth.sendPasswordReset(user.id);
    const delivery = this.deliveryOutcome(emailSent);
    await this.record("access.user_access_reset", actorUserId, user.id, reason, {
      mode,
      delivery,
    });
    return { userId: user.id, mode, delivery };
  }

  /**
   * The guardian CIN is read here, handed straight to Najm, and never returned,
   * audited, or logged. Najm replaces the credential, records the durable
   * password-setup requirement, and revokes every session in one transaction,
   * and this audit entry joins it — so a family is never left holding a CIN
   * that nothing forces them to replace, or an audit trail for a reset that
   * rolled back.
   */
  @Transaction({ retries: 2 })
  private async resetFamilyCredential(
    userId: string,
    actorUserId: string,
    reason: string,
  ) {
    const guardianCin = await this.repository.findFamilyGuardianCin(userId);
    // A profile predating the current identity rules can hold a value the Najm
    // helper refuses. Conflict before any mutation, and say so without echoing
    // the stored value back.
    if (!guardianCin || !isMoroccanCin(guardianCin)) {
      HttpError.conflict(
        "This family profile has no usable guardian identity number to reset to",
      );
    }
    await this.auth.resetToTemporaryCredential(
      userId,
      moroccanCinTemporaryCredential(guardianCin),
    );
    await this.record("access.user_access_reset", actorUserId, userId, reason, {
      mode: "family_credential_setup",
      delivery: "not_applicable",
    });
  }

  /**
   * The console and memory providers answer `success` for a message that was
   * never sent anywhere. An administrator must not read that as delivery, so it
   * is reported as its own outcome.
   */
  private deliveryOutcome(emailSent: boolean): AccessResetDelivery {
    if (!emailSent) return "not_sent";
    const provider = this.emails.getProviderName().trim().toLowerCase();
    return provider === "console" || provider === "memory" ? "simulated" : "sent";
  }

  @Transaction({ retries: 2 })
  async revokeSessions(userId: string, actorUserId: string) {
    const user = await this.requireUser(userId);
    this.ensureSafeTarget(user, actorUserId, "revoke sessions for");
    await this.revokeAll(user.id);
    await this.record(
      "access.user_sessions_revoked",
      actorUserId,
      user.id,
      null,
    );
    return { revoked: true, userId: user.id };
  }

  private async requireUser(userId: string) {
    const user = await this.repository.findUser(userId);
    if (!user) {
      HttpError.notFound("Access user not found");
    }
    return user;
  }

  private ensureSafeTarget(
    user: AccessUserRow,
    actorUserId: string,
    command: string,
  ) {
    if (user.id === actorUserId) {
      HttpError.conflict(`Administrators cannot ${command} their own account`);
    }
    if (user.role === "admin") {
      HttpError.conflict("Bootstrap administrator accounts are protected");
    }
  }

  private async revokeAll(userId: string) {
    await this.tokens.invalidateUserAccessTokens(userId);
    await this.tokens.revokeAllForUser(userId);
  }

  private record(
    action: string,
    actorUserId: string,
    targetUserId: string,
    reason: string | null,
    details: Record<string, string> = {},
  ) {
    return this.audits.record({
      action,
      actorUserId,
      // Only the administrator's own words and the value-free outcome. Never a
      // credential, a token, a link, a recipient, or family data.
      metadata: { ...(reason ? { reason } : {}), ...details },
      resource: "users",
      resourceId: targetUserId,
    });
  }
}
