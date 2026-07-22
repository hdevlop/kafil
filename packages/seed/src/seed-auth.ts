import {
  db,
  permissionsTable,
  rolePermissionsTable,
  rolesTable,
  tokensTable,
  usersTable,
} from "@kafil/server/database";
import { and, eq, inArray } from "drizzle-orm";
import { EncryptionService, seedAuthData } from "najm-auth";

import {
  AUTH_PERMISSIONS,
  AUTH_ROLE_PERMISSIONS,
  AUTH_ROLES,
  type AuthRoleName,
} from "./auth-definitions";

export interface AuthSeedVerification {
  admin: {
    email: string;
    emailVerified: boolean;
    id: string;
    role: "admin";
    status: "active";
  };
  permissionCount: number;
  roles: Array<{
    name: AuthRoleName;
    permissionCount: number;
  }>;
}

export async function seedAuthentication(
  adminEmail: string,
  adminPassword: string,
) {
  await clearManagedRolePermissions();

  const result = await seedAuthData({
    adminEmail,
    adminPassword,
    db,
    onConflict: "skip",
    permissions: AUTH_PERMISSIONS.map((permission) => ({
      id: stableSeedId("permission", permission.name),
      ...permission,
    })),
    roles: AUTH_ROLES,
    verbose: true,
  });

  const adminPasswordChanged = await syncAdminCredentials(
    adminEmail,
    adminPassword,
  );
  await syncRolePermissions();

  return {
    adminPasswordChanged,
    result,
    verification: await verifyAuthenticationSeed(adminEmail),
  };
}

async function syncAdminCredentials(adminEmail: string, adminPassword: string) {
  const adminRoles = await db
    .select({ id: rolesTable.id })
    .from(rolesTable)
    .where(eq(rolesTable.name, "admin"))
    .limit(2);
  if (adminRoles.length !== 1) {
    throw new Error(
      `Expected exactly one admin role, found ${adminRoles.length}.`,
    );
  }

  const [admin] = await db
    .select({
      emailVerified: usersTable.emailVerified,
      failedLoginAttempts: usersTable.failedLoginAttempts,
      id: usersTable.id,
      lockoutUntil: usersTable.lockoutUntil,
      password: usersTable.password,
      roleId: usersTable.roleId,
      status: usersTable.status,
    })
    .from(usersTable)
    .where(eq(usersTable.email, adminEmail))
    .limit(1);
  if (!admin) {
    throw new Error(`Seed admin '${adminEmail}' was not found.`);
  }

  const encryption = new EncryptionService();
  const passwordMatches = await encryption.comparePassword(
    adminPassword,
    admin.password,
  );
  const accountNeedsRepair =
    admin.emailVerified !== true ||
    admin.failedLoginAttempts !== 0 ||
    admin.lockoutUntil !== null ||
    admin.roleId !== adminRoles[0]!.id ||
    admin.status !== "active";

  if (!passwordMatches || accountNeedsRepair) {
    await db
      .update(usersTable)
      .set({
        emailVerified: true,
        failedLoginAttempts: 0,
        lockoutUntil: null,
        password: passwordMatches
          ? admin.password
          : await encryption.hashPassword(adminPassword),
        roleId: adminRoles[0]!.id,
        status: "active",
      })
      .where(eq(usersTable.id, admin.id));
  }

  if (!passwordMatches) {
    await db
      .update(tokensTable)
      .set({ status: "revoked" })
      .where(
        and(
          eq(tokensTable.userId, admin.id),
          eq(tokensTable.status, "active"),
        ),
      );
  }

  return !passwordMatches;
}

async function clearManagedRolePermissions() {
  const roleRows = await db
    .select({ id: rolesTable.id })
    .from(rolesTable)
    .where(inArray(rolesTable.name, AUTH_ROLES.map((role) => role.name)));

  if (roleRows.length > 0) {
    await db
      .delete(rolePermissionsTable)
      .where(
        inArray(
          rolePermissionsTable.roleId,
          roleRows.map((role) => role.id),
        ),
      );
  }
}

export async function syncRolePermissions() {
  const roleRows = await db
    .select({
      id: rolesTable.id,
      name: rolesTable.name,
    })
    .from(rolesTable)
    .where(inArray(rolesTable.name, AUTH_ROLES.map((role) => role.name)));
  const permissionRows = await db
    .select({
      id: permissionsTable.id,
      name: permissionsTable.name,
    })
    .from(permissionsTable)
    .where(
      inArray(
        permissionsTable.name,
        AUTH_PERMISSIONS.map((permission) => permission.name),
      ),
    );

  const rolesByName = uniqueRowsByName(
    roleRows,
    AUTH_ROLES.map((role) => role.name),
    "role",
  );
  const permissionsByName = uniqueRowsByName(
    permissionRows,
    AUTH_PERMISSIONS.map((permission) => permission.name),
    "permission",
  );

  await db.transaction(async (tx) => {
    for (const roleName of Object.keys(
      AUTH_ROLE_PERMISSIONS,
    ) as AuthRoleName[]) {
      const role = rolesByName.get(roleName)!;
      const permissionNames = AUTH_ROLE_PERMISSIONS[roleName];

      await tx
        .delete(rolePermissionsTable)
        .where(eq(rolePermissionsTable.roleId, role.id));

      if (permissionNames.length > 0) {
        await tx.insert(rolePermissionsTable).values(
          permissionNames.map((permissionName) => ({
            permissionId: permissionsByName.get(permissionName)!.id,
            roleId: role.id,
          })),
        );
      }
    }
  });
}

export async function verifyAuthenticationSeed(
  adminEmail: string,
): Promise<AuthSeedVerification> {
  const requiredRoleNames = AUTH_ROLES.map((role) => role.name);
  const roleRows = await db
    .select({
      id: rolesTable.id,
      name: rolesTable.name,
    })
    .from(rolesTable)
    .where(inArray(rolesTable.name, requiredRoleNames));
  const rolesByName = uniqueRowsByName(
    roleRows,
    requiredRoleNames,
    "role",
  );
  const permissionRows = await db
    .select({
      id: permissionsTable.id,
      name: permissionsTable.name,
    })
    .from(permissionsTable)
    .where(
      inArray(
        permissionsTable.name,
        AUTH_PERMISSIONS.map((permission) => permission.name),
      ),
    );
  uniqueRowsByName(
    permissionRows,
    AUTH_PERMISSIONS.map((permission) => permission.name),
    "permission",
  );

  const [admin] = await db
    .select({
      email: usersTable.email,
      emailVerified: usersTable.emailVerified,
      id: usersTable.id,
      roleName: rolesTable.name,
      status: usersTable.status,
    })
    .from(usersTable)
    .innerJoin(rolesTable, eq(usersTable.roleId, rolesTable.id))
    .where(eq(usersTable.email, adminEmail))
    .limit(1);

  if (!admin) {
    throw new Error(`Seed admin '${adminEmail}' was not found.`);
  }
  if (
    admin.roleName !== "admin" ||
    admin.status !== "active" ||
    admin.emailVerified !== true
  ) {
    throw new Error(
      `Seed admin '${adminEmail}' is not an active, verified admin.`,
    );
  }

  const assignments = await db
    .select({
      permissionName: permissionsTable.name,
      roleId: rolePermissionsTable.roleId,
    })
    .from(rolePermissionsTable)
    .innerJoin(
      permissionsTable,
      eq(rolePermissionsTable.permissionId, permissionsTable.id),
    )
    .where(
      inArray(
        rolePermissionsTable.roleId,
        roleRows.map((role) => role.id),
      ),
    );

  const roles = requiredRoleNames.map((roleName) => {
    const role = rolesByName.get(roleName)!;
    const actualPermissions = assignments
      .filter((assignment) => assignment.roleId === role.id)
      .map((assignment) => assignment.permissionName)
      .sort();
    const expectedPermissions = [...AUTH_ROLE_PERMISSIONS[roleName]].sort();

    if (
      actualPermissions.length !== expectedPermissions.length ||
      actualPermissions.some(
        (permission, index) => permission !== expectedPermissions[index],
      )
    ) {
      throw new Error(
        `Role '${roleName}' permissions do not match the seed definition.`,
      );
    }

    return {
      name: roleName,
      permissionCount: actualPermissions.length,
    };
  });

  return {
    admin: {
      email: admin.email,
      emailVerified: true,
      id: admin.id,
      role: "admin",
      status: "active",
    },
    permissionCount: permissionRows.length,
    roles,
  };
}

function uniqueRowsByName<TName extends string>(
  rows: Array<{ id: string; name: string }>,
  expectedNames: readonly TName[],
  label: string,
) {
  const grouped = new Map<string, Array<{ id: string; name: string }>>();

  for (const row of rows) {
    const current = grouped.get(row.name) ?? [];
    current.push(row);
    grouped.set(row.name, current);
  }

  const result = new Map<TName, { id: string; name: string }>();
  for (const name of expectedNames) {
    const matches = grouped.get(name) ?? [];
    if (matches.length !== 1) {
      throw new Error(
        `Expected exactly one ${label} named '${name}', found ${matches.length}.`,
      );
    }
    result.set(name, matches[0]!);
  }

  return result;
}

function stableSeedId(prefix: string, value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);

  return `${prefix}_${normalized || "item"}`;
}
