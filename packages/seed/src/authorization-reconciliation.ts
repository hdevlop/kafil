import {
  db,
  permissionsTable,
  rolePermissionsTable,
  rolesTable,
  usersTable,
} from "@kafil/server/database";
import { and, eq, inArray, sql } from "drizzle-orm";

import {
  AUTH_PERMISSIONS,
  AUTH_ROLE_PERMISSIONS,
  AUTH_ROLES,
  type AuthRoleName,
  type PermissionName,
} from "./auth-definitions";
import { stableSeedId } from "./seed-ids";

/**
 * The single owner of code-managed authorization data. Full setup and
 * deployment both call it, so neither keeps a second interpretation of the same
 * role definitions. The only user column it touches is the role reference, and
 * only to move a user off a duplicate row.
 */

export interface RoleRow {
  createdAt: string | null;
  id: string;
  name: string;
}

export interface DuplicateRoleName {
  count: number;
  name: string;
}

export interface ConsolidatedRole {
  duplicatesRemoved: number;
  name: AuthRoleName;
  usersMoved: number;
}

export interface AuthorizationRepairSummary {
  consolidatedRoles: ConsolidatedRole[];
  grantLinksAdded: number;
  grantLinksRemoved: number;
  invalidatedUsers: number;
  rolesCreated: AuthRoleName[];
}

export interface AuthorizationSeedVerification {
  permissionCount: number;
  roles: Array<{
    name: AuthRoleName;
    permissionCount: number;
  }>;
}

export interface AuthorizationReconciliationResult {
  repair: AuthorizationRepairSummary;
  verification: AuthorizationSeedVerification;
}

export interface AuthorizationReconciliationOptions {
  /**
   * Called inside the repair transaction, before it may commit, so a failure
   * rolls the repair back instead of publishing grants while empty permission
   * claims are still accepted. These writes use their own connection and do not
   * roll back, so an aborted run can sign a user out. The rerun is idempotent.
   */
  invalidateUsers?: (userIds: readonly string[]) => Promise<void>;
}

export type GrantKey = string;

const AUTH_ROLE_NAMES = AUTH_ROLES.map((role) => role.name);
const FIXED_ROLE_NAMES = new Set<string>(AUTH_ROLE_NAMES);
const AUTH_PERMISSION_NAMES = AUTH_PERMISSIONS.map((permission) => permission.name);
const GRANT_KEY_SEPARATOR = "\u0000";

export function grantKey(roleName: AuthRoleName, permissionName: PermissionName): GrantKey {
  return `${roleName}${GRANT_KEY_SEPARATOR}${permissionName}`;
}

export function parseGrantKey(key: GrantKey) {
  const [roleName, permissionName] = key.split(GRANT_KEY_SEPARATOR);
  return {
    permissionName: permissionName as PermissionName,
    roleName: roleName as AuthRoleName,
  };
}

/**
 * The deterministic seed ID wins when present: every future seed resolves to it
 * and would otherwise recreate the duplicate. Otherwise the oldest row wins,
 * with the ID as a stable final tie-break.
 */
export function selectCanonicalRole<TRow extends RoleRow>(rows: readonly TRow[]): TRow {
  const [first] = rows;
  if (!first) {
    throw new Error("Cannot select a canonical role from zero rows.");
  }

  const stableId = stableSeedId("role", first.name);
  return (
    rows.find((row) => row.id === stableId) ??
    [...rows].sort(compareRoleRows)[0]!
  );
}

function compareRoleRows(left: RoleRow, right: RoleRow) {
  if (left.createdAt !== right.createdAt) {
    if (!left.createdAt) return 1;
    if (!right.createdAt) return -1;
    return left.createdAt < right.createdAt ? -1 : 1;
  }
  if (left.id === right.id) return 0;
  return left.id < right.id ? -1 : 1;
}

export function findDuplicateRoleNames(rows: readonly RoleRow[]): DuplicateRoleName[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.name, (counts.get(row.name) ?? 0) + 1);
  }

  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([name, count]) => ({ count, name }))
    .sort((left, right) => (left.name < right.name ? -1 : 1));
}

/** Two custom roles sharing a name are not knowably the same role. */
export function assertMergeableDuplicates(duplicates: readonly DuplicateRoleName[]) {
  const unknown = duplicates
    .filter((duplicate) => !FIXED_ROLE_NAMES.has(duplicate.name))
    .map((duplicate) => `${duplicate.name} (${duplicate.count})`);

  if (unknown.length > 0) {
    throw new Error(
      `Duplicate custom role names require manual review before consolidation: ${unknown.join(", ")}.`,
    );
  }
}

export function desiredManagedGrants(): Set<GrantKey> {
  const desired = new Set<GrantKey>();
  for (const roleName of AUTH_ROLE_NAMES) {
    for (const permissionName of AUTH_ROLE_PERMISSIONS[roleName]) {
      desired.add(grantKey(roleName, permissionName));
    }
  }
  return desired;
}

/** A live superset of the expected grants is drift, not success. */
export function planManagedGrants(live: Iterable<GrantKey>) {
  const desired = desiredManagedGrants();
  const current = new Set(live);

  return {
    add: [...desired].filter((key) => !current.has(key)),
    remove: [...current].filter((key) => !desired.has(key)),
  };
}

export async function reconcileAuthorizationSeed(
  options: AuthorizationReconciliationOptions = {},
): Promise<AuthorizationReconciliationResult> {
  const repair = await db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext('kafil:authorization-seed'))`,
    );

    const roleRows = await tx
      .select({
        createdAt: rolesTable.createdAt,
        id: rolesTable.id,
        name: rolesTable.name,
      })
      .from(rolesTable);
    assertMergeableDuplicates(findDuplicateRoleNames(roleRows));

    const canonicalRoleIds = new Map<AuthRoleName, string>();
    const consolidatedRoles: ConsolidatedRole[] = [];
    const rolesCreated: AuthRoleName[] = [];
    const changedRoles = new Set<AuthRoleName>();

    for (const role of AUTH_ROLES) {
      const matches = roleRows.filter((row) => row.name === role.name);

      if (matches.length === 0) {
        // A random ID here is what lets a later Najm seed insert the stable ID
        // beside it as a second row.
        const [inserted] = await tx
          .insert(rolesTable)
          .values({ id: stableSeedId("role", role.name), ...role })
          .returning({ id: rolesTable.id });
        canonicalRoleIds.set(role.name, inserted!.id);
        rolesCreated.push(role.name);
        continue;
      }

      const canonical = selectCanonicalRole(matches);
      canonicalRoleIds.set(role.name, canonical.id);
      await tx
        .update(rolesTable)
        .set({ description: role.description })
        .where(eq(rolesTable.id, canonical.id));

      const redundant = matches.filter((row) => row.id !== canonical.id);
      if (redundant.length === 0) continue;

      let usersMoved = 0;
      for (const row of redundant) {
        // Union first: a redundant row can hold custom grants, and its links
        // cascade away when the role is deleted.
        const links = await tx
          .select({ permissionId: rolePermissionsTable.permissionId })
          .from(rolePermissionsTable)
          .where(eq(rolePermissionsTable.roleId, row.id));
        if (links.length > 0) {
          await tx
            .insert(rolePermissionsTable)
            .values(
              links.map((link) => ({
                permissionId: link.permissionId,
                roleId: canonical.id,
              })),
            )
            .onConflictDoNothing();
        }

        const moved = await tx
          .update(usersTable)
          .set({ roleId: canonical.id })
          .where(eq(usersTable.roleId, row.id))
          .returning({ id: usersTable.id });
        usersMoved += moved.length;

        await tx.delete(rolesTable).where(eq(rolesTable.id, row.id));
      }

      const stranded = await tx
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(
          inArray(
            usersTable.roleId,
            redundant.map((row) => row.id),
          ),
        )
        .limit(1);
      if (stranded.length > 0) {
        throw new Error(
          `Users still reference a removed '${role.name}' role row.`,
        );
      }

      const remaining = await tx
        .select({ id: rolesTable.id })
        .from(rolesTable)
        .where(eq(rolesTable.name, role.name));
      if (remaining.length !== 1 || remaining[0]!.id !== canonical.id) {
        throw new Error(
          `Expected exactly one role named '${role.name}' after consolidation, found ${remaining.length}.`,
        );
      }

      consolidatedRoles.push({
        duplicatesRemoved: redundant.length,
        name: role.name,
        usersMoved,
      });
      changedRoles.add(role.name);
    }

    for (const permission of AUTH_PERMISSIONS) {
      await tx
        .insert(permissionsTable)
        .values({
          id: stableSeedId("permission", permission.name),
          ...permission,
        })
        .onConflictDoUpdate({
          target: permissionsTable.name,
          set: {
            action: permission.action,
            description: permission.description,
            resource: permission.resource,
          },
        });
    }

    const permissionRows = await tx
      .select({ id: permissionsTable.id, name: permissionsTable.name })
      .from(permissionsTable)
      .where(inArray(permissionsTable.name, AUTH_PERMISSION_NAMES));
    const permissionsByName = uniqueRowsByName(
      permissionRows,
      AUTH_PERMISSION_NAMES,
      "permission",
    );
    const permissionNamesById = new Map(
      permissionRows.map((row) => [row.id, row.name as PermissionName]),
    );
    const roleNamesById = new Map(
      [...canonicalRoleIds].map(([name, id]) => [id, name] as const),
    );
    const canonicalIds = [...canonicalRoleIds.values()];
    const managedPermissionIds = permissionRows.map((row) => row.id);

    const liveLinks = await tx
      .select({
        permissionId: rolePermissionsTable.permissionId,
        roleId: rolePermissionsTable.roleId,
      })
      .from(rolePermissionsTable)
      .where(
        and(
          inArray(rolePermissionsTable.roleId, canonicalIds),
          inArray(rolePermissionsTable.permissionId, managedPermissionIds),
        ),
      );

    const { add, remove } = planManagedGrants(
      liveLinks.map((link) =>
        grantKey(
          roleNamesById.get(link.roleId)!,
          permissionNamesById.get(link.permissionId)!,
        ),
      ),
    );

    for (const key of [...add, ...remove]) {
      changedRoles.add(parseGrantKey(key).roleName);
    }

    const removalsByRole = new Map<AuthRoleName, PermissionName[]>();
    for (const key of remove) {
      const { permissionName, roleName } = parseGrantKey(key);
      removalsByRole.set(roleName, [
        ...(removalsByRole.get(roleName) ?? []),
        permissionName,
      ]);
    }
    for (const [roleName, permissionNames] of removalsByRole) {
      await tx.delete(rolePermissionsTable).where(
        and(
          eq(rolePermissionsTable.roleId, canonicalRoleIds.get(roleName)!),
          inArray(
            rolePermissionsTable.permissionId,
            permissionNames.map((name) => permissionsByName.get(name)!.id),
          ),
        ),
      );
    }

    if (add.length > 0) {
      await tx
        .insert(rolePermissionsTable)
        .values(
          add.map((key) => {
            const { permissionName, roleName } = parseGrantKey(key);
            return {
              permissionId: permissionsByName.get(permissionName)!.id,
              roleId: canonicalRoleIds.get(roleName)!,
            };
          }),
        )
        .onConflictDoNothing();
    }

    const changedRoleIds = [...changedRoles].map(
      (roleName) => canonicalRoleIds.get(roleName)!,
    );
    const affectedUserIds =
      changedRoleIds.length === 0
        ? []
        : (
            await tx
              .select({ id: usersTable.id })
              .from(usersTable)
              .where(inArray(usersTable.roleId, changedRoleIds))
          ).map((row) => row.id);

    if (affectedUserIds.length > 0 && options.invalidateUsers) {
      await options.invalidateUsers(affectedUserIds);
    }

    return {
      consolidatedRoles,
      grantLinksAdded: add.length,
      grantLinksRemoved: remove.length,
      invalidatedUsers: options.invalidateUsers ? affectedUserIds.length : 0,
      rolesCreated,
    } satisfies AuthorizationRepairSummary;
  });

  return { repair, verification: await verifyAuthorizationSeed() };
}

export async function verifyAuthorizationSeed(): Promise<AuthorizationSeedVerification> {
  const roleRows = await db
    .select({ id: rolesTable.id, name: rolesTable.name })
    .from(rolesTable)
    .where(inArray(rolesTable.name, AUTH_ROLE_NAMES));
  const rolesByName = uniqueRowsByName(roleRows, AUTH_ROLE_NAMES, "role");
  const permissionRows = await db
    .select({ id: permissionsTable.id, name: permissionsTable.name })
    .from(permissionsTable)
    .where(inArray(permissionsTable.name, AUTH_PERMISSION_NAMES));
  uniqueRowsByName(permissionRows, AUTH_PERMISSION_NAMES, "permission");

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
      and(
        inArray(
          rolePermissionsTable.roleId,
          roleRows.map((role) => role.id),
        ),
        inArray(permissionsTable.name, AUTH_PERMISSION_NAMES),
      ),
    );

  const roles = AUTH_ROLE_NAMES.map((roleName) => {
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

    return { name: roleName, permissionCount: actualPermissions.length };
  });

  return { permissionCount: permissionRows.length, roles };
}

/** Counts and role names only; a deployment log needs no identities. */
export function describeRepair(repair: AuthorizationRepairSummary) {
  const consolidated = repair.consolidatedRoles
    .map(
      (role) =>
        `${role.name} -${role.duplicatesRemoved} duplicate/${role.usersMoved} user(s) moved`,
    )
    .join(", ");

  return [
    `roles created: ${repair.rolesCreated.length}`,
    `roles consolidated: ${repair.consolidatedRoles.length}${consolidated ? ` [${consolidated}]` : ""}`,
    `managed grants added: ${repair.grantLinksAdded}`,
    `managed grants removed: ${repair.grantLinksRemoved}`,
    `sessions invalidated: ${repair.invalidatedUsers}`,
  ].join("; ");
}

export function uniqueRowsByName<TName extends string>(
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
