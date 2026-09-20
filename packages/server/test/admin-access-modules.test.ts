import { describe, expect, it } from "bun:test";
import { AuthService, TokenService, UserService } from "najm-auth";
import { EmailService } from "najm-email";
import { getMcpTools } from "najm-mcp";
import { getRateLimitOptions } from "najm-rate";

import { AuditService } from "../src/modules/audit";
import {
  accessReasonDto,
  accessResetRateLimitKey,
  accessUserListQuery,
  AdminAccessController,
  AdminAccessRepository,
  AdminAccessService,
  createAccessPermissionDto,
  resolveAccessResetRateLimitConfig,
} from "../src/modules/adminAccess";

interface AccessFakeUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  status: string;
  roleId: string;
  role: string;
  lastLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;
  familyProfileId: string | null;
  staffProfileId: string | null;
  sponsorProfileId: string | null;
}

const operatorUser: AccessFakeUser = {
  id: "operator-user",
  name: "Safe Operator",
  email: "operator@example.test",
  emailVerified: true,
  status: "active",
  roleId: "operator-role",
  role: "operator",
  lastLogin: null,
  createdAt: new Date("2026-07-27T00:00:00.000Z"),
  updatedAt: new Date("2026-07-27T00:00:00.000Z"),
  familyProfileId: null,
  staffProfileId: "operator-profile",
  sponsorProfileId: null,
};

describe("admin access contracts", () => {
  it("normalizes privacy-safe list filters and requires lifecycle reasons", () => {
    expect(
      accessUserListQuery.parse({
        search: "  safe  ",
        role: "operator",
        verified: "true",
      }),
    ).toMatchObject({
      search: "safe",
      role: "operator",
      verified: true,
      limit: 25,
      offset: 0,
    });
    expect(accessReasonDto.safeParse({ reason: "x" }).success).toBe(false);
    expect(
      createAccessPermissionDto.parse({
        action: "review",
        resource: "purchase-orders",
        roles: ["admin", "operator"],
      }),
    ).toEqual({
      action: "review",
      resource: "purchase-orders",
      roles: ["admin", "operator"],
    });
    expect(
      createAccessPermissionDto.safeParse({
        action: "Review all",
        resource: "orders",
      }).success,
    ).toBe(false);
    expect(
      accessUserListQuery.safeParse({ role: "super-admin" }).success,
    ).toBe(false);
  });

  it("exposes read and explicit account lifecycle tools only", () => {
    const tools = getMcpTools(AdminAccessController).map((tool) => tool.methodKey);
    expect(tools).toEqual([
      "listUsers",
      "getUser",
      "deactivate",
      "reactivate",
      "revokeSessions",
      "listRoles",
      "getRole",
      "listPermissions",
      "createPermission",
    ]);
    // Reset access replaces a credential or sends mail a person then acts on.
    // It stays off the tool surface until that exposure is decided on its own.
    expect(tools).not.toContain("resetAccess");
  });

  it("buckets repeat resets on the target account, not the administrator", async () => {
    expect(getRateLimitOptions(AdminAccessController, "resetAccess")).toMatchObject({
      limit: 3,
      window: "15m",
      key: accessResetRateLimitKey,
    });

    // `as never` rather than a hono `Context` import: the workspace resolves
    // two copies of hono's types, and the key only ever reads `req.param`.
    const keyFor = (userId: string) =>
      accessResetRateLimitKey({ req: { param: () => userId } } as never, {
        clientIp: "203.0.113.10",
      });

    expect(await keyFor("user-1")).toBe(await keyFor("user-1"));
    expect(await keyFor("user-1")).not.toBe(await keyFor("user-2"));
  });

  it("rejects a rate limit configuration that would disable the cooldown", () => {
    expect(resolveAccessResetRateLimitConfig({})).toEqual({
      limit: 3,
      window: "15m",
    });
    expect(
      resolveAccessResetRateLimitConfig({
        KAFIL_ACCESS_RESET_RATE_LIMIT: "1",
        KAFIL_ACCESS_RESET_RATE_WINDOW: "1h",
      }),
    ).toEqual({ limit: 1, window: "1h" });
    expect(() =>
      resolveAccessResetRateLimitConfig({ KAFIL_ACCESS_RESET_RATE_LIMIT: "0" }),
    ).toThrow();
    expect(() =>
      resolveAccessResetRateLimitConfig({ KAFIL_ACCESS_RESET_RATE_WINDOW: "soon" }),
    ).toThrow();
  });
});

const familyUser: AccessFakeUser = {
  ...operatorUser,
  id: "family-user",
  name: "Guardian",
  email: "family@example.test",
  roleId: "family-role",
  role: "family",
  familyProfileId: "family-profile",
  staffProfileId: null,
};

const sponsorUser: AccessFakeUser = {
  ...operatorUser,
  id: "sponsor-user",
  name: "Sponsor",
  email: "sponsor@example.test",
  roleId: "sponsor-role",
  role: "sponsor",
  staffProfileId: null,
  sponsorProfileId: "sponsor-profile",
};

/** A pending sponsor application: a real user, but no approved profile yet. */
const applicantUser: AccessFakeUser = {
  ...sponsorUser,
  id: "applicant-user",
  email: "applicant@example.test",
  status: "pending",
  emailVerified: true,
  sponsorProfileId: null,
};

describe("admin access reset", () => {
  it("resets an active family to its guardian CIN without exposing it", async () => {
    const { service, state } = accessService(familyUser, {
      guardianCin: "AB123456",
    });

    const result = await service.resetAccess(
      familyUser.id,
      { reason: "Guardian lost the password" },
      "admin-user",
    );

    expect(result).toEqual({
      userId: familyUser.id,
      mode: "family_credential_setup",
      delivery: "not_applicable",
    });
    expect(state.temporaryResets).toEqual([
      { userId: familyUser.id, credential: { kind: "ma-cin", value: "AB123456" } },
    ]);
    expect(state.passwordResets).toEqual([]);
    expect(state.invitations).toEqual([]);
    expect(JSON.stringify(result)).not.toMatch(/ab123456/i);
    expect(JSON.stringify(state.audits)).not.toMatch(/ab123456/i);
    expect(state.audits).toEqual([
      expect.objectContaining({
        action: "access.user_access_reset",
        actorUserId: "admin-user",
        resource: "users",
        resourceId: familyUser.id,
        metadata: {
          reason: "Guardian lost the password",
          mode: "family_credential_setup",
          delivery: "not_applicable",
        },
      }),
    ]);
  });

  it("refuses a family whose stored identity number the helper rejects", async () => {
    const { service, state } = accessService(familyUser, {
      guardianCin: "not-a-cin",
    });

    await expect(
      service.resetAccess(familyUser.id, { reason: "Lost access" }, "admin-user"),
    ).rejects.toMatchObject({ status: 409 });
    expect(state.temporaryResets).toEqual([]);
    expect(state.audits).toEqual([]);
  });

  it("refuses a family profile that is missing entirely", async () => {
    const { service, state } = accessService(familyUser, { guardianCin: undefined });

    await expect(
      service.resetAccess(familyUser.id, { reason: "Lost access" }, "admin-user"),
    ).rejects.toMatchObject({ status: 409 });
    expect(state.temporaryResets).toEqual([]);
  });

  it("emails an active operator and reports real delivery", async () => {
    const { service, state } = accessService(operatorUser);

    const result = await service.resetAccess(
      operatorUser.id,
      { reason: "Operator locked out" },
      "admin-user",
    );

    expect(result).toEqual({
      userId: operatorUser.id,
      mode: "reset_email_sent",
      delivery: "sent",
    });
    expect(state.passwordResets).toEqual([operatorUser.id]);
    expect(state.temporaryResets).toEqual([]);
    expect(state.audits[0]).toMatchObject({
      action: "access.user_access_reset",
      metadata: {
        reason: "Operator locked out",
        mode: "reset_email_sent",
        delivery: "sent",
      },
    });
  });

  it("emails an active sponsor the same way", async () => {
    const { service, state } = accessService(sponsorUser);

    expect(
      await service.resetAccess(sponsorUser.id, { reason: "Sponsor locked out" }, "admin-user"),
    ).toMatchObject({ mode: "reset_email_sent", delivery: "sent" });
    expect(state.passwordResets).toEqual([sponsorUser.id]);
  });

  it("re-invites a pending invited staff account instead of resetting it", async () => {
    const { service, state } = accessService({
      ...operatorUser,
      status: "pending",
      emailVerified: false,
    });

    expect(
      await service.resetAccess(operatorUser.id, { reason: "Invite expired" }, "admin-user"),
    ).toMatchObject({ mode: "invitation_resent", delivery: "sent" });
    expect(state.invitations).toEqual([operatorUser.id]);
    expect(state.passwordResets).toEqual([]);
  });

  it("never activates a sponsor application awaiting review", async () => {
    const { service, state } = accessService(applicantUser);

    await expect(
      service.resetAccess(applicantUser.id, { reason: "Applicant asked" }, "admin-user"),
    ).rejects.toMatchObject({ status: 409 });
    expect(state.invitations).toEqual([]);
    expect(state.passwordResets).toEqual([]);
    expect(state.audits).toEqual([]);
  });

  it("refuses a confirmation the account has outgrown", async () => {
    // The table listed this operator as pending, so the dialog explained a
    // re-invitation. The account was activated in the meantime: an ordinary
    // reset mail is eligible now, but it is not what the administrator read.
    const { service, state } = accessService(operatorUser);

    await expect(
      service.resetAccess(
        operatorUser.id,
        { reason: "Invite expired", expectedMode: "invitation_resent" },
        "admin-user",
      ),
    ).rejects.toMatchObject({ status: 409 });
    expect(state.passwordResets).toEqual([]);
    expect(state.invitations).toEqual([]);
    expect(state.audits).toEqual([]);
  });

  it("proceeds when the confirmation still describes the account", async () => {
    const { service, state } = accessService(operatorUser);

    expect(
      await service.resetAccess(
        operatorUser.id,
        { reason: "Operator locked out", expectedMode: "reset_email_sent" },
        "admin-user",
      ),
    ).toMatchObject({ mode: "reset_email_sent", delivery: "sent" });
    expect(state.passwordResets).toEqual([operatorUser.id]);
  });

  it("never lets the confirmation select the workflow", async () => {
    // A family account with an operator-shaped claim still gets the family
    // workflow refused into a conflict, not the mail the claim asked for.
    const { service, state } = accessService(familyUser, { guardianCin: "AB123456" });

    await expect(
      service.resetAccess(
        familyUser.id,
        { reason: "Wrong claim", expectedMode: "reset_email_sent" },
        "admin-user",
      ),
    ).rejects.toMatchObject({ status: 409 });
    expect(state.passwordResets).toEqual([]);
    expect(state.temporaryResets).toEqual([]);
  });

  it("records a link Najm could not retire, and nothing about it", async () => {
    // The send failed and the token store was unreachable, so a usable link
    // exists that nobody received. The next successful send supersedes it; the
    // trail still has to say it happened.
    const { service, state } = accessService(operatorUser, {
      emailSent: false,
      undeliveredLinkLive: true,
    });

    expect(
      await service.resetAccess(operatorUser.id, { reason: "Locked out" }, "admin-user"),
    ).toMatchObject({ mode: "reset_email_sent", delivery: "not_sent" });
    expect(state.audits[0]).toMatchObject({
      action: "access.user_access_reset",
      metadata: {
        mode: "reset_email_sent",
        delivery: "not_sent",
        undeliveredLinkLive: "true",
      },
    });
    expect(JSON.stringify(state.audits)).not.toMatch(/token|http|reset-password/i);
  });

  it("leaves the flag out entirely when nothing was stranded", async () => {
    const { service, state } = accessService(operatorUser, { emailSent: false });

    await service.resetAccess(operatorUser.id, { reason: "Locked out" }, "admin-user");

    expect(state.audits[0]).toMatchObject({
      metadata: { mode: "reset_email_sent", delivery: "not_sent" },
    });
    expect(
      Object.keys((state.audits[0] as { metadata: Record<string, unknown> }).metadata),
    ).not.toContain("undeliveredLinkLive");
  });

  it("refuses an inactive account rather than quietly reactivating it", async () => {
    const { service, state } = accessService({ ...operatorUser, status: "inactive" });

    await expect(
      service.resetAccess(operatorUser.id, { reason: "Wants back in" }, "admin-user"),
    ).rejects.toMatchObject({ status: 409 });
    expect(state.passwordResets).toEqual([]);
    expect(state.userUpdates).toEqual([]);
  });

  it("refuses a role whose profile link does not match", async () => {
    const { service } = accessService({ ...sponsorUser, sponsorProfileId: null });

    await expect(
      service.resetAccess(sponsorUser.id, { reason: "Mismatched" }, "admin-user"),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("protects the acting administrator and the bootstrap administrator", async () => {
    const self = accessService({ ...operatorUser, id: "admin-user" });
    await expect(
      self.service.resetAccess("admin-user", { reason: "Reset myself" }, "admin-user"),
    ).rejects.toMatchObject({ status: 409 });

    const bootstrap = accessService({
      ...operatorUser,
      id: "other-admin",
      role: "admin",
      roleId: "admin-role",
      staffProfileId: null,
    });
    await expect(
      bootstrap.service.resetAccess("other-admin", { reason: "Reset admin" }, "admin-user"),
    ).rejects.toMatchObject({ status: 409 });
    expect(bootstrap.state.passwordResets).toEqual([]);
  });

  it("reports a failed send as not sent, with the audit saying the same", async () => {
    const { service, state } = accessService(operatorUser, { emailSent: false });

    expect(
      await service.resetAccess(operatorUser.id, { reason: "Locked out" }, "admin-user"),
    ).toMatchObject({ mode: "reset_email_sent", delivery: "not_sent" });
    expect(state.audits[0]).toMatchObject({
      metadata: expect.objectContaining({ delivery: "not_sent" }),
    });
  });

  it("does not let the console provider pass for delivery", async () => {
    const { service, state } = accessService(operatorUser, { provider: "console" });

    expect(
      await service.resetAccess(operatorUser.id, { reason: "Locked out" }, "admin-user"),
    ).toMatchObject({ delivery: "simulated" });
    expect(state.audits[0]).toMatchObject({
      metadata: expect.objectContaining({ delivery: "simulated" }),
    });
  });

  it("requires a reason of its own before anything happens", async () => {
    const { service, state } = accessService(operatorUser);

    await expect(
      service.resetAccess(operatorUser.id, { reason: "x" }, "admin-user"),
    ).rejects.toBeDefined();
    expect(state.passwordResets).toEqual([]);
  });

  it("keeps every response free of credentials, tokens, and recipients", async () => {
    for (const user of [familyUser, operatorUser, sponsorUser]) {
      const { service } = accessService(user, { guardianCin: "AB123456" });
      const result = await service.resetAccess(
        user.id,
        { reason: "Routine recovery" },
        "admin-user",
      );
      expect(JSON.stringify(result)).not.toMatch(
        /password|token|guardian|cin|@example/i,
      );
    }
  });
});

describe("admin access lifecycle", () => {
  it("deactivates a safe user, invalidates every session, and audits safe metadata", async () => {
    const { service, state } = accessService(operatorUser);

    const result = await service.deactivate(
      operatorUser.id,
      { reason: "Operator left the programme" },
      "admin-user",
    );

    expect(result.status).toBe("inactive");
    expect(state.userUpdates).toEqual([
      { id: operatorUser.id, data: { status: "inactive" } },
    ]);
    expect(state.invalidated).toEqual([operatorUser.id]);
    expect(state.revoked).toEqual([operatorUser.id]);
    expect(state.staffStatusSyncs).toEqual([
      { staffProfileId: operatorUser.staffProfileId!, status: "inactive" },
    ]);
    expect(state.audits).toEqual([
      expect.objectContaining({
        action: "access.user_deactivated",
        actorUserId: "admin-user",
        resourceId: operatorUser.id,
        metadata: { reason: "Operator left the programme" },
      }),
    ]);
    expect(JSON.stringify(result)).not.toMatch(
      /password|token|guardian|address/i,
    );
  });

  it("reactivates a safe user and syncs the linked Staff status back to active", async () => {
    const { service, state } = accessService({
      ...operatorUser,
      status: "inactive",
    });

    const result = await service.reactivate(
      operatorUser.id,
      { reason: "Returned to the programme" },
      "admin-user",
    );

    expect(result.status).toBe("active");
    expect(state.userUpdates).toEqual([
      { id: operatorUser.id, data: { status: "active" } },
    ]);
    expect(state.invalidated).toEqual([operatorUser.id]);
    expect(state.revoked).toEqual([]);
    expect(state.staffStatusSyncs).toEqual([
      { staffProfileId: operatorUser.staffProfileId!, status: "active" },
    ]);
    expect(state.audits).toEqual([
      expect.objectContaining({
        action: "access.user_reactivated",
        actorUserId: "admin-user",
        resourceId: operatorUser.id,
        metadata: { reason: "Returned to the programme" },
      }),
    ]);
  });

  it("protects the current administrator and every bootstrap administrator", async () => {
    const self = accessService({ ...operatorUser, id: "admin-user" });
    await expect(
      self.service.deactivate(
        "admin-user",
        { reason: "Unsafe self action" },
        "admin-user",
      ),
    ).rejects.toMatchObject({ status: 409 });

    const bootstrap = accessService({
      ...operatorUser,
      id: "other-admin",
      role: "admin",
      roleId: "admin-role",
      staffProfileId: null,
    });
    await expect(
      bootstrap.service.revokeSessions("other-admin", "admin-user"),
    ).rejects.toMatchObject({ status: 409 });
    expect(bootstrap.state.invalidated).toEqual([]);
  });

  it("shows fixed code-managed roles and live grant drift without mutation controls", async () => {
    const { service } = accessService(operatorUser, {
      liveRoles: [
        {
          id: "operator-role",
          name: "operator",
          description: "Operator",
          userCount: 1,
          permissions: [],
        },
      ],
    });

    const roles = await service.listRoles();

    expect(roles.map((role) => role.name)).toEqual([
      "admin",
      "operator",
      "delivery",
      "family",
      "sponsor",
    ]);
    expect(roles.every((role) => role.codeManaged)).toBe(true);
    expect(roles.find((role) => role.name === "operator")?.inSync).toBe(false);
  });

  it("creates an audited custom permission and invalidates affected role users", async () => {
    const { service, state } = accessService(operatorUser);

    const permission = await service.createPermission(
      {
        action: "review",
        resource: "purchase-orders",
        description: "Review purchase orders",
        roles: ["operator"],
      },
      "admin-user",
    );

    expect(permission).toMatchObject({
      name: "review:purchase-orders",
      codeManaged: false,
      drift: "custom",
    });
    expect(state.createdPermissions).toEqual([
      expect.objectContaining({ name: "review:purchase-orders" }),
    ]);
    expect(state.invalidated).toContain(operatorUser.id);
    expect(state.audits).toContainEqual(
      expect.objectContaining({
        action: "access.permission_created",
        resource: "permissions",
        resourceId: "review:purchase-orders",
      }),
    );
  });
});

function accessService(
  initialUser: AccessFakeUser,
  options: {
    liveRoles?: Array<{
      id: string;
      name: string;
      description: string;
      userCount: number;
      permissions: Array<{
        id: string;
        name: string;
        description: string | null;
        resource: string;
        action: string;
      }>;
    }>;
    guardianCin?: string;
    emailSent?: boolean;
    undeliveredLinkLive?: boolean;
    provider?: string;
  } = {},
) {
  let user = { ...initialUser };
  const state = {
    userUpdates: [] as Array<{ id: string; data: { status: string } }>,
    invalidated: [] as string[],
    revoked: [] as string[],
    audits: [] as Record<string, unknown>[],
    createdPermissions: [] as Array<Record<string, unknown>>,
    staffStatusSyncs: [] as Array<{
      staffProfileId: string;
      status: "active" | "inactive";
    }>,
    temporaryResets: [] as Array<{ userId: string; credential: unknown }>,
    passwordResets: [] as string[],
    invitations: [] as string[],
  };
  const livePermissions: Array<{
    id: string;
    name: string;
    description: string | null;
    resource: string;
    action: string;
    roles: Array<{ id: string; name: string }>;
  }> = [];
  const repository = {
    findUser: async (id: string) => (id === user.id ? user : undefined),
    listUsers: async () => [user],
    countUsers: async () => 1,
    listRoles: async () => options.liveRoles ?? [
      {
        id: user.roleId,
        name: user.role,
        description: "Fixed role",
        userCount: 1,
        permissions: [],
      },
    ],
    listPermissions: async () => livePermissions,
    findPermissionByName: async (name: string) =>
      livePermissions.find((permission) => permission.name === name),
    createPermission: async (
      permission: Record<string, unknown>,
      roleNames: string[],
    ) => {
      state.createdPermissions.push(permission);
      livePermissions.push({
        id: "custom-permission",
        name: String(permission.name),
        description: (permission.description as string | null) ?? null,
        resource: String(permission.resource),
        action: String(permission.action),
        roles: roleNames.map((name) => ({ id: `${name}-role`, name })),
      });
    },
    listUserIdsByRoleNames: async (roleNames: string[]) =>
      roleNames.includes(user.role) ? [{ id: user.id }] : [],
    syncStaffStatus: async (
      staffProfileId: string,
      status: "active" | "inactive",
    ) => {
      state.staffStatusSyncs.push({ staffProfileId, status });
    },
    findFamilyGuardianCin: async () => options.guardianCin,
  } as unknown as AdminAccessRepository;
  const emailSent = options.emailSent ?? true;
  const undeliveredLinkLive = options.undeliveredLinkLive ?? false;
  const service = new AdminAccessService(
    repository,
    {
      update: async (id: string, data: { status: string }) => {
        state.userUpdates.push({ id, data });
        user = { ...user, status: data.status };
        return user;
      },
    } as unknown as UserService,
    {
      invalidateUserAccessTokens: async (id: string) => {
        state.invalidated.push(id);
      },
      revokeAllForUser: async (id: string) => {
        state.revoked.push(id);
      },
    } as unknown as TokenService,
    {
      record: async (event: Record<string, unknown>) => {
        state.audits.push(event);
      },
    } as unknown as AuditService,
    {
      resetToTemporaryCredential: async (userId: string, credential: unknown) => {
        state.temporaryResets.push({ userId, credential });
        return { userId, purpose: "password", temporaryCredentialKind: "ma-cin" };
      },
      sendPasswordReset: async (userId: string) => {
        state.passwordResets.push(userId);
        return { userId, emailSent, undeliveredLinkLive };
      },
      resendInvitation: async (userId: string) => {
        state.invitations.push(userId);
        return { userId, emailSent, undeliveredLinkLive };
      },
    } as unknown as AuthService,
    {
      getProviderName: () => options.provider ?? "smtp",
    } as unknown as EmailService,
  );
  return { service, state };
}
