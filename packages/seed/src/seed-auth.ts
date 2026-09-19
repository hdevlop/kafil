import {
  db,
  rolesTable,
  tokensTable,
  usersTable,
} from "@kafil/server/database";
import { and, eq } from "drizzle-orm";
import { EncryptionService, seedAuthData } from "najm-auth";

import {
  reconcileAuthorizationSeed,
  verifyAuthorizationSeed,
  type AuthorizationReconciliationOptions,
  type AuthorizationSeedVerification,
} from "./authorization-reconciliation";
import { AUTH_PERMISSIONS, AUTH_ROLES } from "./auth-definitions";
import { reconcileAdminIdentity } from "./admin-identity";
import { stableSeedId } from "./seed-ids";

export {
  reconcileAuthorizationSeed,
  verifyAuthorizationSeed,
  type AuthorizationSeedVerification,
};

export interface AuthSeedVerification extends AuthorizationSeedVerification {
  admin: {
    email: string;
    emailVerified: boolean;
    id: string;
    role: "admin";
    status: "active";
  };
}

export async function seedAuthentication(
  adminEmail: string,
  adminPassword: string,
  options: {
    reconciliation?: AuthorizationReconciliationOptions;
    verbose?: boolean;
  } = {},
) {
  // Najm's auth seed is not transactional: a duplicate role discovered part-way
  // through used to leave Admin reseeded and every other role stripped.
  await reconcileAuthorizationSeed(options.reconciliation);

  const adminEmailChanged = await reconcileBootstrapAdminEmail(adminEmail);

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
    verbose: options.verbose ?? true,
  });

  const adminPasswordChanged = await syncAdminCredentials(
    adminEmail,
    adminPassword,
  );

  // Najm's seed grants Admin every permission it was handed; reconcile again so
  // the final managed grants are exact.
  const { repair } = await reconcileAuthorizationSeed(options.reconciliation);

  return {
    adminEmailChanged,
    adminPasswordChanged,
    repair,
    result,
    verification: await verifyAuthenticationSeed(adminEmail),
  };
}

async function reconcileBootstrapAdminEmail(desiredEmail: string) {
  return db.transaction(async (tx) => {
    const existingAdmins = await tx
      .select({
        email: usersTable.email,
        id: usersTable.id,
      })
      .from(usersTable)
      .innerJoin(rolesTable, eq(usersTable.roleId, rolesTable.id))
      .where(eq(rolesTable.name, "admin"))
      .limit(2);

    return reconcileAdminIdentity({
      desiredEmail,
      existingAdmins,
      findDesiredEmailOwner: async () => {
        const [owner] = await tx
          .select({ id: usersTable.id })
          .from(usersTable)
          .where(eq(usersTable.email, desiredEmail))
          .limit(1);
        return owner;
      },
      revokeActiveTokens: async (adminId) => {
        await tx
          .update(tokensTable)
          .set({ status: "revoked" })
          .where(
            and(
              eq(tokensTable.userId, adminId),
              eq(tokensTable.status, "active"),
            ),
          );
      },
      updateEmail: async (adminId, email) => {
        await tx
          .update(usersTable)
          .set({ email })
          .where(eq(usersTable.id, adminId));
      },
    });
  });
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

export async function verifyAuthenticationSeed(
  adminEmail: string,
): Promise<AuthSeedVerification> {
  const authorization = await verifyAuthorizationSeed();

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

  return {
    admin: {
      email: admin.email,
      emailVerified: true,
      id: admin.id,
      role: "admin",
      status: "active",
    },
    ...authorization,
  };
}
