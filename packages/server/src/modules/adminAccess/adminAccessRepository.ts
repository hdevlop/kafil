import {
  and,
  asc,
  count,
  eq,
  ilike,
  inArray,
  or,
} from "drizzle-orm";
import {
  permissionsTable,
  rolePermissionsTable,
  rolesTable,
  usersTable,
} from "najm-auth/pg";
import { Repository } from "najm-core";
import { DB } from "najm-database";

import type { KafilDatabase } from "../../database/types";
import { familyProfiles } from "../families/familySchema";
import { sponsorProfiles } from "../sponsors/sponsorSchema";
import { staffProfiles } from "../staff/staffSchema";

export interface AccessUserFilters {
  search?: string;
  role?: string;
  status?: "active" | "inactive" | "pending";
  verified?: boolean;
}

const userSelection = {
  id: usersTable.id,
  name: usersTable.name,
  email: usersTable.email,
  emailVerified: usersTable.emailVerified,
  status: usersTable.status,
  roleId: usersTable.roleId,
  role: rolesTable.name,
  lastLogin: usersTable.lastLogin,
  createdAt: usersTable.createdAt,
  updatedAt: usersTable.updatedAt,
  familyProfileId: familyProfiles.id,
  staffProfileId: staffProfiles.id,
  sponsorProfileId: sponsorProfiles.id,
};

@Repository("default")
export class AdminAccessRepository {
  @DB() private db!: KafilDatabase;

  async listUsers(limit: number, offset: number, filters: AccessUserFilters) {
    const condition = userFilter(filters);
    const base = this.userDirectory()
      .orderBy(asc(usersTable.name), asc(usersTable.email))
      .limit(limit)
      .offset(offset);
    return condition ? base.where(condition) : base;
  }

  async countUsers(filters: AccessUserFilters) {
    const condition = userFilter(filters);
    const base = this.db
      .select({ value: count() })
      .from(usersTable)
      .leftJoin(rolesTable, eq(usersTable.roleId, rolesTable.id));
    const [result] = condition ? await base.where(condition) : await base;
    return Number(result?.value ?? 0);
  }

  async findUser(userId: string) {
    const [user] = await this.userDirectory()
      .where(eq(usersTable.id, userId))
      .limit(1);
    return user;
  }

  async countActiveAdmins() {
    const [result] = await this.db
      .select({ value: count() })
      .from(usersTable)
      .innerJoin(rolesTable, eq(usersTable.roleId, rolesTable.id))
      .where(
        and(eq(rolesTable.name, "admin"), eq(usersTable.status, "active")),
      );
    return Number(result?.value ?? 0);
  }

  async listRoles() {
    const roles = await this.db
      .select()
      .from(rolesTable)
      .where(inArray(rolesTable.name, ["admin", "operator", "family", "sponsor"]))
      .orderBy(asc(rolesTable.name));
    return Promise.all(
      roles.map(async (role) => ({
        ...role,
        userCount: await this.countUsersByRole(role.id),
        permissions: await this.listPermissionsByRole(role.id),
      })),
    );
  }

  async findRole(roleId: string) {
    const [role] = await this.db
      .select()
      .from(rolesTable)
      .where(eq(rolesTable.id, roleId))
      .limit(1);
    if (!role) return undefined;
    return {
      ...role,
      userCount: await this.countUsersByRole(role.id),
      permissions: await this.listPermissionsByRole(role.id),
    };
  }

  async listPermissions() {
    const rows = await this.db
      .select({
        id: permissionsTable.id,
        name: permissionsTable.name,
        description: permissionsTable.description,
        resource: permissionsTable.resource,
        action: permissionsTable.action,
        roleId: rolesTable.id,
        roleName: rolesTable.name,
      })
      .from(permissionsTable)
      .leftJoin(
        rolePermissionsTable,
        eq(permissionsTable.id, rolePermissionsTable.permissionId),
      )
      .leftJoin(rolesTable, eq(rolePermissionsTable.roleId, rolesTable.id))
      .orderBy(asc(permissionsTable.resource), asc(permissionsTable.action));
    const permissions = new Map<
      string,
      {
        id: string;
        name: string;
        description: string | null;
        resource: string;
        action: string;
        roles: Array<{ id: string; name: string }>;
      }
    >();
    for (const row of rows) {
      const permission = permissions.get(row.id) ?? {
        id: row.id,
        name: row.name,
        description: row.description,
        resource: row.resource,
        action: row.action,
        roles: [],
      };
      if (row.roleId && row.roleName) {
        permission.roles.push({ id: row.roleId, name: row.roleName });
      }
      permissions.set(row.id, permission);
    }
    return [...permissions.values()];
  }

  async findPermissionByName(name: string) {
    const [permission] = await this.db
      .select()
      .from(permissionsTable)
      .where(eq(permissionsTable.name, name))
      .limit(1);
    return permission;
  }

  async createPermission(
    data: {
      action: string;
      description: string | null;
      name: string;
      resource: string;
    },
    roleNames: string[],
  ) {
    const [permission] = await this.db
      .insert(permissionsTable)
      .values(data)
      .returning();

    if (roleNames.length > 0) {
      const roles = await this.db
        .select({ id: rolesTable.id, name: rolesTable.name })
        .from(rolesTable)
        .where(inArray(rolesTable.name, roleNames));
      await this.db.insert(rolePermissionsTable).values(
        roles.map((role) => ({
          permissionId: permission.id,
          roleId: role.id,
        })),
      );
    }

    return permission;
  }

  async syncStaffStatus(
    staffProfileId: string,
    status: "active" | "inactive",
  ) {
    await this.db
      .update(staffProfiles)
      .set({ status, updatedAt: new Date() })
      .where(eq(staffProfiles.id, staffProfileId));
  }

  async listUserIdsByRoleNames(roleNames: string[]) {
    if (roleNames.length === 0) return [];
    return this.db
      .select({ id: usersTable.id })
      .from(usersTable)
      .innerJoin(rolesTable, eq(usersTable.roleId, rolesTable.id))
      .where(inArray(rolesTable.name, roleNames));
  }

  async listPermissionsByRole(roleId: string) {
    return this.db
      .select({
        id: permissionsTable.id,
        name: permissionsTable.name,
        description: permissionsTable.description,
        resource: permissionsTable.resource,
        action: permissionsTable.action,
      })
      .from(rolePermissionsTable)
      .innerJoin(
        permissionsTable,
        eq(rolePermissionsTable.permissionId, permissionsTable.id),
      )
      .where(eq(rolePermissionsTable.roleId, roleId))
      .orderBy(asc(permissionsTable.resource), asc(permissionsTable.action));
  }

  private async countUsersByRole(roleId: string) {
    const [result] = await this.db
      .select({ value: count() })
      .from(usersTable)
      .where(eq(usersTable.roleId, roleId));
    return Number(result?.value ?? 0);
  }

  private userDirectory() {
    return this.db
      .select(userSelection)
      .from(usersTable)
      .leftJoin(rolesTable, eq(usersTable.roleId, rolesTable.id))
      .leftJoin(familyProfiles, eq(usersTable.id, familyProfiles.userId))
      .leftJoin(staffProfiles, eq(usersTable.id, staffProfiles.userId))
      .leftJoin(sponsorProfiles, eq(usersTable.id, sponsorProfiles.userId));
  }
}

function userFilter(filters: AccessUserFilters) {
  const search = filters.search?.trim();
  const conditions = [
    search
      ? or(
          ilike(usersTable.name, `%${search}%`),
          ilike(usersTable.email, `%${search}%`),
        )
      : undefined,
    filters.role ? eq(rolesTable.name, filters.role) : undefined,
    filters.status ? eq(usersTable.status, filters.status) : undefined,
    filters.verified === undefined
      ? undefined
      : eq(usersTable.emailVerified, filters.verified),
  ].filter((condition) => condition !== undefined);
  return conditions.length ? and(...conditions) : undefined;
}
