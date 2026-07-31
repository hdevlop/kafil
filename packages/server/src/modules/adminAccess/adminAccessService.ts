import { TokenService, UserService } from "najm-auth";
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
  createAccessPermissionDto,
  type CreateAccessPermissionDto,
  accessUserListQuery,
  type AccessUserListQuery,
} from "./adminAccessDto";
import { AdminAccessRepository } from "./adminAccessRepository";

@Service()
export class AdminAccessService {
  constructor(
    private readonly repository: AdminAccessRepository,
    private readonly users: UserService,
    private readonly tokens: TokenService,
    private readonly audits: AuditService,
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
    user: Awaited<ReturnType<AdminAccessRepository["findUser"]>> & {},
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
  ) {
    return this.audits.record({
      action,
      actorUserId,
      metadata: reason ? { reason } : {},
      resource: "users",
      resourceId: targetUserId,
    });
  }
}
