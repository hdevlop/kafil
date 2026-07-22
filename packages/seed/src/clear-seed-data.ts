import { envConfig } from "@kafil/server/config";
import { pool } from "@kafil/server/database";
import { rm } from "node:fs/promises";
import { join } from "node:path";

export const SEED_DATA_TABLES = [
  "audit_events",
  "budget_ledger_entries",
  "monthly_budget_limits",
  "contributions",
  "contribution_plans",
  "order_status_events",
  "order_items",
  "orders",
  "cart_items",
  "carts",
  "inventory_ledger_entries",
  "inventory_balances",
  "products",
  "categories",
  "budget_accounts",
  "document_objects",
  "support_assignments",
  "children",
  "family_profiles",
  "sponsor_profiles",
  "operator_profiles",
  "outbox_events",
  "tokens",
] as const;

export const TRUNCATE_SEED_DATA_SQL = `TRUNCATE TABLE ${SEED_DATA_TABLES.map(
  (table) => `"${table}"`,
).join(", ")} RESTART IDENTITY CASCADE`;

export const DELETE_NON_ADMIN_USERS_SQL = `
DELETE FROM "users" AS "user"
WHERE NOT EXISTS (
  SELECT 1
  FROM "roles" AS "role"
  WHERE "role"."id" = "user"."role_id"
    AND "role"."name" = 'admin'
    AND "user"."email" = $1
)`;

export const SEED_STORAGE_DIRECTORIES = [
  "family-images",
  "sponsor-images",
] as const;

interface SeedDataClient {
  query(sql: string, values?: unknown[]): Promise<unknown>;
  release(): void;
}

interface SeedDataPool {
  connect(): Promise<SeedDataClient>;
}

/**
 * Clears mutable application data while retaining auth definitions, migration
 * history, platform settings, and the configured bootstrap admin account.
 */
export async function clearSeedData(
  adminEmail: string,
  databasePool: SeedDataPool = pool,
) {
  const client = await databasePool.connect();

  try {
    await client.query("BEGIN");
    await client.query(TRUNCATE_SEED_DATA_SQL);
    await client.query(DELETE_NON_ADMIN_USERS_SQL, [adminEmail]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

type RemoveDirectory = (
  path: string,
  options: { force: true; recursive: true },
) => Promise<void>;

export async function clearSeedStorage(
  storageBasePath = envConfig.storage.basePath,
  removeDirectory: RemoveDirectory = rm,
) {
  for (const directory of SEED_STORAGE_DIRECTORIES) {
    await removeDirectory(join(storageBasePath, directory), {
      force: true,
      recursive: true,
    });
  }
}
