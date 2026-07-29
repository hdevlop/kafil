import { envConfig } from "@kafil/server/config";
import { pool } from "@kafil/server/database";
import { readdir, unlink } from "node:fs/promises";
import { join, resolve } from "node:path";

const DEMO_USER_PATTERN =
  "^00000000-0000-4000-8000-(102|202|302)[0-9]{9}$";

export const DEMO_SCOPE_SQL = [
  `CREATE TEMP TABLE kafil_demo_users ON COMMIT DROP AS
   SELECT id, image
   FROM users
   WHERE email LIKE '%@demo.kafil.test'
     AND id ~ '${DEMO_USER_PATTERN}'`,
  `CREATE TEMP TABLE kafil_demo_families ON COMMIT DROP AS
   SELECT id FROM family_profiles
   WHERE user_id IN (SELECT id FROM kafil_demo_users)`,
  `CREATE TEMP TABLE kafil_demo_sponsors ON COMMIT DROP AS
   SELECT id FROM sponsor_profiles
   WHERE user_id IN (SELECT id FROM kafil_demo_users)`,
  `CREATE TEMP TABLE kafil_demo_operators ON COMMIT DROP AS
   SELECT id FROM operator_profiles
   WHERE user_id IN (SELECT id FROM kafil_demo_users)`,
  `CREATE TEMP TABLE kafil_demo_assignments ON COMMIT DROP AS
   SELECT id FROM support_assignments
   WHERE family_profile_id IN (SELECT id FROM kafil_demo_families)
      OR sponsor_profile_id IN (SELECT id FROM kafil_demo_sponsors)`,
  `CREATE TEMP TABLE kafil_demo_contributions ON COMMIT DROP AS
   SELECT id FROM contributions
   WHERE external_reference LIKE 'KAFIL-DEMO-%'
      OR family_profile_id IN (SELECT id FROM kafil_demo_families)
      OR sponsor_profile_id IN (SELECT id FROM kafil_demo_sponsors)
      OR support_assignment_id IN (SELECT id FROM kafil_demo_assignments)`,
  `CREATE TEMP TABLE kafil_demo_plans ON COMMIT DROP AS
   SELECT id FROM contribution_plans
   WHERE support_assignment_id IN (SELECT id FROM kafil_demo_assignments)`,
  `CREATE TEMP TABLE kafil_demo_orders ON COMMIT DROP AS
   SELECT id, delivery_proof_storage_path
   FROM orders
   WHERE submission_idempotency_key LIKE 'demo-assisted-order:%'
      OR family_profile_id IN (SELECT id FROM kafil_demo_families)`,
  `CREATE TEMP TABLE kafil_demo_purchases ON COMMIT DROP AS
   SELECT id, receipt_storage_path
   FROM order_purchase_records
   WHERE order_id IN (SELECT id FROM kafil_demo_orders)`,
  `CREATE TEMP TABLE kafil_demo_carts ON COMMIT DROP AS
   SELECT id FROM carts
   WHERE family_profile_id IN (SELECT id FROM kafil_demo_families)`,
  `CREATE TEMP TABLE kafil_demo_budgets ON COMMIT DROP AS
   SELECT id FROM budget_accounts
   WHERE family_profile_id IN (SELECT id FROM kafil_demo_families)`,
  `CREATE TEMP TABLE kafil_demo_children ON COMMIT DROP AS
   SELECT id, image FROM children
   WHERE family_profile_id IN (SELECT id FROM kafil_demo_families)`,
  `CREATE TEMP TABLE kafil_demo_documents ON COMMIT DROP AS
   SELECT id FROM document_objects
   WHERE family_profile_id IN (SELECT id FROM kafil_demo_families)`,
  `CREATE TEMP TABLE kafil_demo_resources ON COMMIT DROP AS
   SELECT id::text FROM kafil_demo_users
   UNION SELECT id::text FROM kafil_demo_families
   UNION SELECT id::text FROM kafil_demo_sponsors
   UNION SELECT id::text FROM kafil_demo_operators
   UNION SELECT id::text FROM kafil_demo_assignments
   UNION SELECT id::text FROM kafil_demo_contributions
   UNION SELECT id::text FROM kafil_demo_plans
   UNION SELECT id::text FROM kafil_demo_orders
   UNION SELECT id::text FROM kafil_demo_purchases
   UNION SELECT id::text FROM kafil_demo_children
   UNION SELECT id::text FROM kafil_demo_documents`,
] as const;

export const DEMO_SUMMARY_SQL = `SELECT
  (SELECT count(*)::int FROM kafil_demo_families) AS families,
  (SELECT count(*)::int FROM kafil_demo_sponsors) AS sponsors,
  (SELECT count(*)::int FROM kafil_demo_operators) AS operators,
  (SELECT count(*)::int FROM kafil_demo_contributions) AS contributions,
  (SELECT count(*)::int FROM kafil_demo_orders) AS orders`;

export const DEMO_STORAGE_SQL = `
  SELECT image AS reference FROM kafil_demo_users WHERE image IS NOT NULL
  UNION
  SELECT image AS reference FROM kafil_demo_children WHERE image IS NOT NULL
  UNION
  SELECT delivery_proof_storage_path AS reference
  FROM kafil_demo_orders WHERE delivery_proof_storage_path IS NOT NULL
  UNION
  SELECT receipt_storage_path AS reference
  FROM kafil_demo_purchases WHERE receipt_storage_path IS NOT NULL`;

export const MANAGED_STORAGE_REFERENCES_SQL = `
  SELECT image AS reference FROM users WHERE image IS NOT NULL
  UNION
  SELECT image AS reference FROM children WHERE image IS NOT NULL
  UNION
  SELECT image AS reference FROM categories WHERE image IS NOT NULL
  UNION
  SELECT image_url AS reference FROM products WHERE image_url IS NOT NULL`;

export const REMOVE_DEMO_SQL = [
  `DELETE FROM outbox_events
   WHERE aggregate_id IN (SELECT id FROM kafil_demo_resources)`,
  `DELETE FROM audit_events
   WHERE actor_user_id IN (SELECT id FROM kafil_demo_users)
      OR resource_id IN (SELECT id FROM kafil_demo_resources)`,
  `DELETE FROM order_purchase_reversals
   WHERE purchase_id IN (SELECT id FROM kafil_demo_purchases)`,
  `DELETE FROM order_purchase_records
   WHERE id IN (SELECT id FROM kafil_demo_purchases)`,
  `DELETE FROM order_status_events
   WHERE order_id IN (SELECT id FROM kafil_demo_orders)`,
  `DELETE FROM order_items
   WHERE order_id IN (SELECT id FROM kafil_demo_orders)`,
  `DELETE FROM orders WHERE id IN (SELECT id FROM kafil_demo_orders)`,
  `DELETE FROM cart_items
   WHERE cart_id IN (SELECT id FROM kafil_demo_carts)`,
  `DELETE FROM carts WHERE id IN (SELECT id FROM kafil_demo_carts)`,
  `DELETE FROM monthly_budget_limits
   WHERE budget_account_id IN (SELECT id FROM kafil_demo_budgets)`,
  `DELETE FROM budget_ledger_entries
   WHERE budget_account_id IN (SELECT id FROM kafil_demo_budgets)`,
  `DELETE FROM budget_accounts
   WHERE id IN (SELECT id FROM kafil_demo_budgets)`,
  `DELETE FROM contributions
   WHERE id IN (SELECT id FROM kafil_demo_contributions)`,
  `DELETE FROM contribution_plans
   WHERE id IN (SELECT id FROM kafil_demo_plans)`,
  `DELETE FROM document_objects
   WHERE id IN (SELECT id FROM kafil_demo_documents)`,
  `DELETE FROM support_assignments
   WHERE id IN (SELECT id FROM kafil_demo_assignments)`,
  `DELETE FROM children
   WHERE id IN (SELECT id FROM kafil_demo_children)`,
  `DELETE FROM tokens WHERE user_id IN (SELECT id FROM kafil_demo_users)`,
  `DELETE FROM family_profiles
   WHERE id IN (SELECT id FROM kafil_demo_families)`,
  `DELETE FROM sponsor_profiles
   WHERE id IN (SELECT id FROM kafil_demo_sponsors)`,
  `DELETE FROM operator_profiles
   WHERE id IN (SELECT id FROM kafil_demo_operators)`,
  `DELETE FROM users WHERE id IN (SELECT id FROM kafil_demo_users)`,
] as const;

export const RESET_DEMO_CATALOG_SQL = [
  `DELETE FROM cart_items AS item
   WHERE NOT EXISTS (
     SELECT 1 FROM order_items AS history
     WHERE history.product_id = item.product_id
   )`,
  `DELETE FROM inventory_ledger_entries AS entry
   WHERE NOT EXISTS (
     SELECT 1 FROM order_items AS history
     WHERE history.product_id = entry.product_id
   )`,
  `DELETE FROM inventory_balances AS balance
   WHERE NOT EXISTS (
     SELECT 1 FROM order_items AS history
     WHERE history.product_id = balance.product_id
   )`,
  `DELETE FROM products AS product
   WHERE NOT EXISTS (
     SELECT 1 FROM order_items AS history
     WHERE history.product_id = product.id
   )
   RETURNING product.id`,
  `DELETE FROM categories AS category
   WHERE NOT EXISTS (
     SELECT 1 FROM products AS product
     WHERE product.category_id = category.id
   )
   RETURNING category.id`,
] as const;

export interface DemoRemovalSummary {
  categories: number;
  contributions: number;
  families: number;
  files: number;
  operators: number;
  orders: number;
  products: number;
  sponsors: number;
}

interface DemoDataClient {
  query(sql: string): Promise<unknown>;
  release(): void;
}

interface DemoDataPool {
  connect(): Promise<DemoDataClient>;
}

type RemoveFile = (path: string) => Promise<void>;

interface ManagedDirectoryEntry {
  isFile(): boolean;
  name: string;
}

type ReadDirectory = (
  path: string,
  options: { withFileTypes: true },
) => Promise<ManagedDirectoryEntry[]>;

const MANAGED_FILE_PATTERN =
  /^[0-9a-f-]{36}\.(?:avif|gif|jpeg|jpg|pdf|png|webp)$/i;

const MANAGED_FILE_PREFIXES = [
  ["/api/family-images/files/serve/", "family-images"],
  ["/api/sponsor-images/files/serve/", "sponsor-images"],
  ["/api/operator-images/files/serve/", "operator-images"],
  ["/api/child-images/files/serve/", "child-images"],
  ["/api/category-images/files/serve/", "category-images"],
  ["/api/product-images/files/serve/", "product-images"],
  ["/api/order-evidence/receipts/serve/", "order-evidence/receipts"],
  ["/api/order-evidence/deliveries/serve/", "order-evidence/deliveries"],
] as const;

const ORPHAN_SWEEP_DIRECTORIES = [
  "category-images",
  "child-images",
  "family-images",
  "operator-images",
  "product-images",
  "sponsor-images",
] as const;

export async function removeDemoData(
  databasePool: DemoDataPool = pool,
  storageBasePath = envConfig.storage.basePath,
  removeFile: RemoveFile = unlink,
  readDirectory: ReadDirectory = readdir,
): Promise<DemoRemovalSummary> {
  const client = await databasePool.connect();
  let summary: Omit<DemoRemovalSummary, "categories" | "files" | "products">;
  let references: string[];
  let retainedReferences: string[];
  let categories = 0;
  let products = 0;

  try {
    await client.query("BEGIN");
    for (const sql of DEMO_SCOPE_SQL) await client.query(sql);
    const summaryResult = (await client.query(DEMO_SUMMARY_SQL)) as {
      rows: Array<Omit<DemoRemovalSummary, "files">>;
    };
    const storageResult = (await client.query(DEMO_STORAGE_SQL)) as {
      rows: Array<{ reference: string }>;
    };
    summary = summaryResult.rows[0] ?? emptySummary();
    references = storageResult.rows.map((row) => row.reference);
    for (const sql of REMOVE_DEMO_SQL) await client.query(sql);
    for (const sql of RESET_DEMO_CATALOG_SQL) {
      const result = (await client.query(sql)) as { rows?: unknown[] };
      if (sql === RESET_DEMO_CATALOG_SQL[3]) {
        products = result.rows?.length ?? 0;
      } else if (sql === RESET_DEMO_CATALOG_SQL[4]) {
        categories = result.rows?.length ?? 0;
      }
    }
    const retainedStorageResult = (await client.query(
      MANAGED_STORAGE_REFERENCES_SQL,
    )) as {
      rows: Array<{ reference: string }>;
    };
    retainedReferences = retainedStorageResult.rows.map((row) => row.reference);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  const demoFiles = await removeManagedDemoFiles(
    references,
    storageBasePath,
    removeFile,
  );
  const orphanFiles = await removeOrphanedManagedFiles(
    retainedReferences,
    storageBasePath,
    removeFile,
    readDirectory,
  );
  return {
    ...summary,
    categories,
    files: demoFiles + orphanFiles,
    products,
  };
}

export async function removeManagedDemoFiles(
  references: readonly string[],
  storageBasePath: string,
  removeFile: RemoveFile = unlink,
) {
  const targets = new Set(
    references
      .map((reference) => managedDemoFilePath(reference, storageBasePath))
      .filter((path): path is string => Boolean(path)),
  );

  for (const target of targets) {
    try {
      await removeFile(target);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  return targets.size;
}

export function managedDemoFilePath(reference: string, storageBasePath: string) {
  const match = MANAGED_FILE_PREFIXES.find(([prefix]) =>
    reference.startsWith(prefix),
  );
  if (!match) return undefined;
  const fileName = decodeURIComponent(reference.slice(match[0].length));
  if (!MANAGED_FILE_PATTERN.test(fileName)) {
    return undefined;
  }
  return join(storageBasePath, match[1], fileName);
}

export async function removeOrphanedManagedFiles(
  retainedReferences: readonly string[],
  storageBasePath: string,
  removeFile: RemoveFile = unlink,
  readDirectory: ReadDirectory = readdir,
) {
  const retainedPaths = new Set(
    retainedReferences
      .map((reference) => managedDemoFilePath(reference, storageBasePath))
      .filter((path): path is string => Boolean(path))
      .map((path) => resolve(path)),
  );
  let removed = 0;

  for (const directory of ORPHAN_SWEEP_DIRECTORIES) {
    const directoryPath = join(storageBasePath, directory);
    let entries: ManagedDirectoryEntry[];
    try {
      entries = await readDirectory(directoryPath, { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
      throw error;
    }

    for (const entry of entries) {
      if (!entry.isFile() || !MANAGED_FILE_PATTERN.test(entry.name)) continue;
      const target = resolve(directoryPath, entry.name);
      if (retainedPaths.has(target)) continue;
      try {
        await removeFile(target);
        removed += 1;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
    }
  }

  return removed;
}

function emptySummary(): Omit<
  DemoRemovalSummary,
  "categories" | "files" | "products"
> {
  return { contributions: 0, families: 0, operators: 0, orders: 0, sponsors: 0 };
}
