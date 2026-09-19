import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import { Client } from "pg";

/**
 * Opt-in real-PostgreSQL proof of the authorization repair.
 *
 * It never touches the developer database it is pointed at. It creates its own
 * disposable database, migrates it, runs every case there, and drops it. Run it
 * with `bun run --cwd packages/seed test:db`; the ordinary unit suite skips it.
 */
const enabled = process.env.KAFIL_RUN_DB_INTEGRATION === "1";
const databaseTest = enabled ? it : it.skip;

const OPERATOR_GRANTS = 27;
const DELIVERY_GRANTS = 2;
const FAMILY_GRANTS = 6;
const SPONSOR_GRANTS = 10;

type Harness = Awaited<ReturnType<typeof createHarness>>;

const originalDatabaseUrl = process.env.DATABASE_URL ?? "";
const disposableName = `kafil_auth_repair_${Date.now().toString(36)}_${Math.random()
  .toString(36)
  .slice(2, 8)}`;

const harness: Harness | null = enabled ? await createHarness() : null;

function withDatabase(url: string, database: string) {
  const parsed = new URL(url);
  parsed.pathname = `/${database}`;
  return parsed.toString();
}

async function createHarness() {
  if (!originalDatabaseUrl) {
    throw new Error(
      "KAFIL_RUN_DB_INTEGRATION=1 requires DATABASE_URL to point at a reachable PostgreSQL server.",
    );
  }

  const maintenance = new Client({
    connectionString: withDatabase(originalDatabaseUrl, "postgres"),
  });
  await maintenance.connect();
  await maintenance.query(`CREATE DATABASE "${disposableName}"`);
  await maintenance.end();

  // The database module reads DATABASE_URL when its pool is constructed, so the
  // disposable URL must be in place before the first import of it.
  process.env.DATABASE_URL = withDatabase(originalDatabaseUrl, disposableName);

  const database = await import("@kafil/server/database");
  const { migrateDatabase } = await import("../src/migrate-database");
  await migrateDatabase();

  // These tests exercise the Release-A repair against the pre-Release-B
  // schema. Individual migration-proof cases apply the new index only after
  // they have established the intended dirty or reconciled state.
  await database.pool.query('DROP INDEX IF EXISTS "roles_name_unique"');

  const reconciliation = await import("../src/authorization-reconciliation");
  const { seedAuthentication } = await import("../src/seed-auth");

  return { ...database, ...reconciliation, seedAuthentication };
}

// Dropping the disposable database outlives Bun's default 5s hook budget once
// the suite has opened and closed a pool's worth of connections.
afterAll(async () => {
  if (!harness) return;

  process.env.DATABASE_URL = originalDatabaseUrl;
  await harness.pool.end();

  const maintenance = new Client({
    connectionString: withDatabase(originalDatabaseUrl, "postgres"),
  });
  await maintenance.connect();
  await maintenance.query(
    `DROP DATABASE IF EXISTS "${disposableName}" WITH (FORCE)`,
  );
  await maintenance.end();
}, 60_000);

/**
 * Capture a rejection message explicitly. Bun's `.rejects` matcher stalls on
 * these pool-backed promises, and the assertion is clearer read this way.
 */
async function rejectionMessage(operation: () => Promise<unknown>) {
  try {
    await operation();
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  return "the operation unexpectedly succeeded";
}

async function reset() {
  const { pool } = harness!;
  await pool.query(
    'TRUNCATE TABLE "role_permissions", "users", "permissions", "roles" RESTART IDENTITY CASCADE',
  );
}

async function insertRole(
  id: string,
  name: string,
  createdAt: string,
  description = "fixture",
) {
  await harness!.pool.query(
    'INSERT INTO "roles" (id, name, description, created_at) VALUES ($1, $2, $3, $4)',
    [id, name, description, createdAt],
  );
}

async function insertUser(email: string, roleId: string) {
  const { rows } = await harness!.pool.query<{ id: string }>(
    'INSERT INTO "users" (id, email, password, role_id, status) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    [email.replace(/\W/g, "").slice(0, 8), email, "hashed", roleId, "active"],
  );
  return rows[0]!.id;
}

async function insertCustomPermission(id: string, name: string) {
  await harness!.pool.query(
    'INSERT INTO "permissions" (id, name, resource, action) VALUES ($1, $2, $3, $4)',
    [id, name, "custom", "read"],
  );
}

async function grant(roleId: string, permissionId: string) {
  await harness!.pool.query(
    'INSERT INTO "role_permissions" (role_id, permission_id) VALUES ($1, $2)',
    [roleId, permissionId],
  );
}

async function roleIdsNamed(name: string) {
  const { rows } = await harness!.pool.query<{ id: string }>(
    'SELECT id FROM "roles" WHERE name = $1 ORDER BY id',
    [name],
  );
  return rows.map((row) => row.id);
}

async function grantedPermissionNames(roleName: string) {
  const { rows } = await harness!.pool.query<{ name: string }>(
    `SELECT p.name
     FROM "role_permissions" rp
     JOIN "permissions" p ON p.id = rp.permission_id
     JOIN "roles" r ON r.id = rp.role_id
     WHERE r.name = $1
     ORDER BY p.name`,
    [roleName],
  );
  return rows.map((row) => row.name);
}

async function roleIdOf(email: string) {
  const { rows } = await harness!.pool.query<{ role_id: string }>(
    'SELECT role_id FROM "users" WHERE email = $1',
    [email],
  );
  return rows[0]!.role_id;
}

async function duplicateLinkCount() {
  const { rows } = await harness!.pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM (
       SELECT role_id, permission_id FROM "role_permissions"
       GROUP BY role_id, permission_id HAVING COUNT(*) > 1
     ) duplicates`,
  );
  return Number(rows[0]!.count);
}

/**
 * The production shape: a legacy Delivery row created with a random ID, and the
 * deterministic `role_delivery` row a later Najm seed inserted beside it. Users
 * and administrator-created custom grants hang off both.
 */
async function seedProductionIncident() {
  await insertRole("Ab3xZ", "delivery", "2024-01-01T00:00:00.000Z", "legacy");
  await insertRole(
    "role_delivery",
    "delivery",
    "2026-09-01T00:00:00.000Z",
    "seeded",
  );
  await insertRole("role_operator", "operator", "2024-01-01T00:00:00.000Z");
  await insertRole("role_family", "family", "2024-01-01T00:00:00.000Z");
  await insertRole("role_sponsor", "sponsor", "2024-01-01T00:00:00.000Z");
  await insertRole("role_admin", "admin", "2024-01-01T00:00:00.000Z");

  await insertCustomPermission("perm_custom_legacy", "read:legacyDispatch");
  await insertCustomPermission("perm_custom_seeded", "read:seededDispatch");
  await grant("Ab3xZ", "perm_custom_legacy");
  await grant("role_delivery", "perm_custom_seeded");

  await insertUser("legacy.driver@example.test", "Ab3xZ");
  await insertUser("seeded.driver@example.test", "role_delivery");
  await insertUser("operator@example.test", "role_operator");
}

if (enabled) {
  beforeEach(async () => {
    await harness!.pool.query('DROP INDEX IF EXISTS "roles_name_unique"');
    await reset();
  });
}

async function roleNameUniquenessMigration() {
  return Bun.file(
    new URL(
      "../../server/migrations/0048_breezy_bloodscream.sql",
      import.meta.url,
    ),
  ).text();
}

describe("authorization repair on real PostgreSQL", () => {
  databaseTest(
    "blocks the uniqueness migration with a sanitized duplicate-name summary",
    async () => {
      await seedProductionIncident();

      expect(
        await rejectionMessage(async () => {
          await harness!.pool.query(await roleNameUniquenessMigration());
        }),
      ).toContain(
        "Cannot create roles_name_unique; duplicate role names: delivery (2)",
      );

      const { rows } = await harness!.pool.query<{ count: string }>(
        `SELECT count(*)::text AS count
         FROM pg_indexes
         WHERE schemaname = 'public' AND indexname = 'roles_name_unique'`,
      );
      expect(rows[0]!.count).toBe("0");
    },
  );

  databaseTest(
    "adds role-name uniqueness after repair without changing references or grants",
    async () => {
      await seedProductionIncident();
      await harness!.reconcileAuthorizationSeed();

      const deliveryRoleBefore = await roleIdsNamed("delivery");
      const legacyUserRoleBefore = await roleIdOf("legacy.driver@example.test");
      const grantsBefore = await grantedPermissionNames("delivery");

      try {
        await harness!.pool.query(await roleNameUniquenessMigration());

        expect(
          await rejectionMessage(() =>
            insertRole(
              "duplicate_delivery",
              "delivery",
              "2026-09-19T00:00:00.000Z",
            ),
          ),
        ).toContain('duplicate key value violates unique constraint "roles_name_unique"');
        expect(await roleIdsNamed("delivery")).toEqual(deliveryRoleBefore);
        expect(await roleIdOf("legacy.driver@example.test")).toBe(
          legacyUserRoleBefore,
        );
        expect(await grantedPermissionNames("delivery")).toEqual(grantsBefore);
      } finally {
        await harness!.pool.query('DROP INDEX IF EXISTS "roles_name_unique"');
      }
    },
  );

  databaseTest(
    "consolidates a legacy and a deterministic Delivery row into one",
    async () => {
      await seedProductionIncident();
      expect(await roleIdsNamed("delivery")).toHaveLength(2);

      const { repair } = await harness!.reconcileAuthorizationSeed();

      expect(await roleIdsNamed("delivery")).toEqual(["role_delivery"]);
      expect(repair.consolidatedRoles).toEqual([
        { duplicatesRemoved: 1, name: "delivery", usersMoved: 1 },
      ]);
    },
  );

  databaseTest("moves users from both rows onto the canonical row", async () => {
    await seedProductionIncident();

    await harness!.reconcileAuthorizationSeed();

    expect(await roleIdOf("legacy.driver@example.test")).toBe("role_delivery");
    expect(await roleIdOf("seeded.driver@example.test")).toBe("role_delivery");
  });

  databaseTest(
    "preserves custom permission grants from every consolidated row",
    async () => {
      await seedProductionIncident();

      await harness!.reconcileAuthorizationSeed();

      expect(await grantedPermissionNames("delivery")).toEqual([
        "read:legacyDispatch",
        "read:notifications",
        "read:seededDispatch",
        "update:notifications",
      ]);
    },
  );

  databaseTest(
    "restores exact managed grants while retaining Delivery's custom links",
    async () => {
      await seedProductionIncident();

      const { verification } = await harness!.reconcileAuthorizationSeed();

      expect(verification.roles).toEqual([
        { name: "admin", permissionCount: verification.permissionCount },
        { name: "operator", permissionCount: OPERATOR_GRANTS },
        { name: "delivery", permissionCount: DELIVERY_GRANTS },
        { name: "family", permissionCount: FAMILY_GRANTS },
        { name: "sponsor", permissionCount: SPONSOR_GRANTS },
      ]);

      // Delivery keeps its custom grants alongside the two inbox permissions.
      const deliveryGrants = await grantedPermissionNames("delivery");
      expect(deliveryGrants).toEqual([
        "read:legacyDispatch",
        "read:notifications",
        "read:seededDispatch",
        "update:notifications",
      ]);
    },
  );

  databaseTest("creates missing fixed roles at the deterministic seed ID", async () => {
    const { repair } = await harness!.reconcileAuthorizationSeed();

    expect(repair.rolesCreated).toEqual([
      "admin",
      "operator",
      "delivery",
      "family",
      "sponsor",
    ]);
    expect(await roleIdsNamed("delivery")).toEqual(["role_delivery"]);
    expect(await roleIdsNamed("sponsor")).toEqual(["role_sponsor"]);
  });

  databaseTest("is idempotent on a second run", async () => {
    await seedProductionIncident();
    await harness!.reconcileAuthorizationSeed();

    const { repair } = await harness!.reconcileAuthorizationSeed({
      invalidateUsers: async () => undefined,
    });

    expect(repair.consolidatedRoles).toEqual([]);
    expect(repair.rolesCreated).toEqual([]);
    expect(repair.grantLinksAdded).toBe(0);
    expect(repair.grantLinksRemoved).toBe(0);
    expect(repair.invalidatedUsers).toBe(0);
  });

  databaseTest(
    "serializes two concurrent repairs without duplicating rows or links",
    async () => {
      await seedProductionIncident();

      await Promise.all([
        harness!.reconcileAuthorizationSeed(),
        harness!.reconcileAuthorizationSeed(),
      ]);

      expect(await roleIdsNamed("delivery")).toEqual(["role_delivery"]);
      expect(await duplicateLinkCount()).toBe(0);
      expect(await grantedPermissionNames("operator")).toHaveLength(
        OPERATOR_GRANTS,
      );
    },
  );

  databaseTest(
    "rolls role moves, link changes, and deletions back together when invalidation fails",
    async () => {
      await seedProductionIncident();

      expect(
        await rejectionMessage(() =>
          harness!.reconcileAuthorizationSeed({
            invalidateUsers: async () => {
              throw new Error("Session invalidation is unavailable.");
            },
          }),
        ),
      ).toBe("Session invalidation is unavailable.");

      expect(await roleIdsNamed("delivery")).toEqual(["Ab3xZ", "role_delivery"]);
      expect(await roleIdOf("legacy.driver@example.test")).toBe("Ab3xZ");
      expect(await grantedPermissionNames("operator")).toEqual([]);
      expect(await grantedPermissionNames("delivery")).toEqual([
        "read:legacyDispatch",
        "read:seededDispatch",
      ]);
    },
  );

  databaseTest(
    "invalidates only the users whose role or grants were repaired",
    async () => {
      await seedProductionIncident();
      const invalidated: string[][] = [];

      const first = await harness!.reconcileAuthorizationSeed({
        invalidateUsers: async (userIds) => {
          invalidated.push([...userIds]);
        },
      });
      expect(first.repair.invalidatedUsers).toBeGreaterThan(0);
      expect(invalidated).toHaveLength(1);

      const second = await harness!.reconcileAuthorizationSeed({
        invalidateUsers: async (userIds) => {
          invalidated.push([...userIds]);
        },
      });
      expect(second.repair.invalidatedUsers).toBe(0);
      expect(invalidated).toHaveLength(1);
    },
  );

  databaseTest(
    "refuses to merge duplicated custom role names and changes nothing",
    async () => {
      await seedProductionIncident();
      await insertRole("aud01", "auditor", "2024-01-01T00:00:00.000Z");
      await insertRole("aud02", "auditor", "2024-02-01T00:00:00.000Z");

      expect(
        await rejectionMessage(() => harness!.reconcileAuthorizationSeed()),
      ).toBe(
        "Duplicate custom role names require manual review before consolidation: auditor (2).",
      );

      expect(await roleIdsNamed("delivery")).toHaveLength(2);
      expect(await roleIdsNamed("auditor")).toHaveLength(2);
      expect(await grantedPermissionNames("operator")).toEqual([]);
    },
  );

  databaseTest(
    "keeps working grants when the full seed fails after the safe repair",
    async () => {
      await seedProductionIncident();
      await harness!.reconcileAuthorizationSeed();
      const operatorBefore = await grantedPermissionNames("operator");

      // Najm's auth seed validates the admin credential before it hashes it, so
      // a weak password fails the seed the way a duplicate role used to.
      expect(
        await rejectionMessage(() =>
          harness!.seedAuthentication("admin@example.test", "weak", {
            verbose: false,
          }),
        ),
      ).not.toBe("the operation unexpectedly succeeded");

      expect(await grantedPermissionNames("operator")).toEqual(operatorBefore);
      expect(await grantedPermissionNames("family")).toHaveLength(FAMILY_GRANTS);
      expect(await grantedPermissionNames("sponsor")).toHaveLength(
        SPONSOR_GRANTS,
      );
      expect(await roleIdsNamed("delivery")).toEqual(["role_delivery"]);
    },
  );
});
