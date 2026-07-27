import { describe, expect, it } from "bun:test";
import { TokenService, UserService } from "najm-auth";
import { getMcpTools } from "najm-mcp";

import { AuditService } from "../src/modules/audit";
import {
  accessReasonDto,
  accessUserListQuery,
  AdminAccessController,
  AdminAccessRepository,
  AdminAccessService,
  createAccessPermissionDto,
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
  operatorProfileId: string | null;
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
  operatorProfileId: "operator-profile",
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
    expect(getMcpTools(AdminAccessController).map((tool) => tool.methodKey))
      .toEqual([
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
      operatorProfileId: null,
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
  } = {},
) {
  let user = { ...initialUser };
  const state = {
    userUpdates: [] as Array<{ id: string; data: { status: string } }>,
    invalidated: [] as string[],
    revoked: [] as string[],
    audits: [] as Record<string, unknown>[],
    createdPermissions: [] as Array<Record<string, unknown>>,
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
  } as unknown as AdminAccessRepository;
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
  );
  return { service, state };
}
