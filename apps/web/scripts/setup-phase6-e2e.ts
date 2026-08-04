import { hash } from "bcryptjs";
import { and, eq, inArray } from "drizzle-orm";

import {
  AUTH_PERMISSIONS,
  AUTH_ROLE_PERMISSIONS,
  AUTH_ROLES,
  type AuthRoleName,
} from "@kafil/server/config";
import {
  db,
  permissionsTable,
  pool,
  rolePermissionsTable,
  rolesTable,
  usersTable,
} from "@kafil/server/database";
import { phase6BrowserPassword, phase6BrowserUsers } from "./phase6-e2e-fixtures";

export async function preparePhase6BrowserUsers() {
  await synchronizeAuthorizationDefinitions();
  const password = await hash(phase6BrowserPassword, 12);
  const roles = await db
    .select({ id: rolesTable.id, name: rolesTable.name })
    .from(rolesTable)
    .where(inArray(rolesTable.name, Object.keys(phase6BrowserUsers)));

  for (const [roleName, email] of Object.entries(phase6BrowserUsers)) {
    const role = roles.find((entry) => entry.name === roleName);
    if (!role) throw new Error(`Missing seeded '${roleName}' role for browser tests.`);

    await db
      .insert(usersTable)
      .values({
        email,
        emailVerified: true,
        id: `phase6_browser_${roleName}`,
        name: `Phase 6 browser ${roleName}`,
        password,
        roleId: role.id,
        status: "active",
      })
      .onConflictDoUpdate({
        target: usersTable.email,
        set: {
          emailVerified: true,
          name: `Phase 6 browser ${roleName}`,
          password,
          roleId: role.id,
          status: "active",
        },
      });
  }

  console.log("Prepared isolated Phase 6 browser users.");
}

async function synchronizeAuthorizationDefinitions() {
  await db.transaction(async (tx) => {
    for (const permission of AUTH_PERMISSIONS) {
      await tx
        .insert(permissionsTable)
        .values(permission)
        .onConflictDoUpdate({
          target: permissionsTable.name,
          set: {
            action: permission.action,
            description: permission.description,
            resource: permission.resource,
          },
        });
    }

    const roles = await tx
      .select({ id: rolesTable.id, name: rolesTable.name })
      .from(rolesTable)
      .where(inArray(rolesTable.name, AUTH_ROLES.map((role) => role.name)));
    const permissions = await tx
      .select({ id: permissionsTable.id, name: permissionsTable.name })
      .from(permissionsTable)
      .where(inArray(
        permissionsTable.name,
        AUTH_PERMISSIONS.map((permission) => permission.name),
      ));
    const permissionIds = permissions.map((permission) => permission.id);

    for (const role of roles) {
      const roleName = role.name as AuthRoleName;
      const desiredNames = AUTH_ROLE_PERMISSIONS[roleName];
      if (!desiredNames) continue;

      if (permissionIds.length > 0) {
        await tx
          .delete(rolePermissionsTable)
          .where(and(
            eq(rolePermissionsTable.roleId, role.id),
            inArray(rolePermissionsTable.permissionId, permissionIds),
          ));
      }

      const desiredPermissions = permissions.filter((permission) =>
        (desiredNames as readonly string[]).includes(permission.name),
      );
      if (desiredPermissions.length > 0) {
        await tx.insert(rolePermissionsTable).values(
          desiredPermissions.map((permission) => ({
            permissionId: permission.id,
            roleId: role.id,
          })),
        );
      }
    }
  });
}

if (import.meta.main) {
  await preparePhase6BrowserUsers();
  await pool.end();
}
