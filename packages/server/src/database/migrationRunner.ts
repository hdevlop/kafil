import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { Client } from "pg";

const statementBreakpoint = "--> statement-breakpoint";
const migrationLockName = "kafil-schema-migrations";

interface MigrationJournal {
  entries: Array<{
    idx: number;
    when: number;
    tag: string;
    breakpoints: boolean;
  }>;
}

export interface MigrationFile {
  createdAt: number;
  hash: string;
  statements: string[];
  tag: string;
}

interface MigrationQueryResult {
  rows: unknown[];
}

export interface MigrationClient {
  query(sql: string, values?: unknown[]): Promise<MigrationQueryResult>;
}

export interface MigrationLogger {
  info(message: string): void;
}

function formatMigrationError(tag: string, error: unknown): Error {
  if (!(error instanceof Error)) {
    return new Error(`Migration ${tag} failed: ${String(error)}`);
  }

  const postgresError = error as Error & {
    code?: string;
    detail?: string;
    hint?: string;
  };
  const context = [
    postgresError.code ? `code ${postgresError.code}` : undefined,
    postgresError.detail ? `detail: ${postgresError.detail}` : undefined,
    postgresError.hint ? `hint: ${postgresError.hint}` : undefined,
  ].filter(Boolean);
  const suffix = context.length > 0 ? ` (${context.join("; ")})` : "";

  return new Error(`Migration ${tag} failed: ${error.message}${suffix}`, {
    cause: error,
  });
}

export function splitMigrationStatements(sql: string): string[] {
  return sql
    .split(statementBreakpoint)
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}

export async function loadMigrationFiles(
  migrationsDirectory: string,
): Promise<MigrationFile[]> {
  const journalPath = join(migrationsDirectory, "meta", "_journal.json");
  const journal = JSON.parse(
    await readFile(journalPath, "utf8"),
  ) as MigrationJournal;

  return Promise.all(
    journal.entries.map(async (entry) => {
      const sql = await readFile(
        join(migrationsDirectory, `${entry.tag}.sql`),
        "utf8",
      );

      return {
        createdAt: entry.when,
        hash: createHash("sha256").update(sql).digest("hex"),
        statements: splitMigrationStatements(sql),
        tag: entry.tag,
      };
    }),
  );
}

export async function applyPendingMigrations(
  client: MigrationClient,
  migrations: MigrationFile[],
  latestCreatedAt: number | undefined,
  logger: MigrationLogger = console,
): Promise<number> {
  let applied = 0;

  for (const migration of migrations) {
    if (
      latestCreatedAt !== undefined &&
      migration.createdAt <= latestCreatedAt
    ) {
      continue;
    }

    logger.info(`[migration] applying ${migration.tag}`);
    await client.query("BEGIN");

    try {
      for (const statement of migration.statements) {
        await client.query(statement);
      }
      await client.query(
        `INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at")
         VALUES ($1, $2)`,
        [migration.hash, migration.createdAt],
      );
      await client.query("COMMIT");
      latestCreatedAt = migration.createdAt;
      applied += 1;
      logger.info(`[migration] applied ${migration.tag}`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw formatMigrationError(migration.tag, error);
    }
  }

  return applied;
}

export async function runMigrations(options?: {
  databaseUrl?: string;
  migrationsDirectory?: string;
  logger?: MigrationLogger;
}): Promise<number> {
  const databaseUrl = options?.databaseUrl ?? process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to run migrations.");
  }

  const migrationsDirectory =
    options?.migrationsDirectory ?? join(process.cwd(), "migrations");
  const logger = options?.logger ?? console;
  const migrations = await loadMigrationFiles(migrationsDirectory);
  const client = new Client({ connectionString: databaseUrl });

  await client.connect();

  try {
    await client.query("SELECT pg_advisory_lock(hashtext($1))", [
      migrationLockName,
    ]);
    await client.query('CREATE SCHEMA IF NOT EXISTS "drizzle"');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
        "id" serial PRIMARY KEY,
        "hash" text NOT NULL,
        "created_at" bigint
      )
    `);

    const latestResult = await client.query(`
      SELECT "created_at"
      FROM "drizzle"."__drizzle_migrations"
      ORDER BY "created_at" DESC
      LIMIT 1
    `);
    const latestRow = latestResult.rows[0] as
      | { created_at: string | number | null }
      | undefined;
    const latestCreatedAt =
      latestRow?.created_at === null || latestRow?.created_at === undefined
        ? undefined
        : Number(latestRow.created_at);

    const applied = await applyPendingMigrations(
      client as unknown as MigrationClient,
      migrations,
      latestCreatedAt,
      logger,
    );
    logger.info(
      applied === 0
        ? "[migration] database is up to date"
        : `[migration] completed ${applied} migration${applied === 1 ? "" : "s"}`,
    );
    return applied;
  } finally {
    await client
      .query("SELECT pg_advisory_unlock(hashtext($1))", [migrationLockName])
      .catch(() => undefined);
    await client.end();
  }
}
