import { describe, expect, it } from "bun:test";

import {
  applyPendingMigrations,
  splitMigrationStatements,
  type MigrationClient,
  type MigrationFile,
} from "../src/database/migrationRunner";

class RecordingClient implements MigrationClient {
  readonly queries: Array<{ sql: string; values?: unknown[] }> = [];

  constructor(private readonly failure?: Error) {}

  async query(
    sql: string,
    values?: unknown[],
  ): Promise<{ rows: unknown[] }> {
    this.queries.push({ sql, values });
    if (this.failure && sql === "SELECT broken") {
      throw this.failure;
    }
    return { rows: [] };
  }
}

const migrations: MigrationFile[] = [
  {
    createdAt: 20,
    hash: "hash-20",
    statements: ["ALTER TYPE contribution_status ADD VALUE 'expired'"],
    tag: "0020_expired_enum",
  },
  {
    createdAt: 21,
    hash: "hash-21",
    statements: ["SELECT one", "SELECT two"],
    tag: "0021_expiry_constraints",
  },
];

describe("migration runner", () => {
  it("splits Drizzle statement breakpoints and removes empty statements", () => {
    expect(
      splitMigrationStatements(
        "SELECT 1;--> statement-breakpoint\n\nSELECT 2;\n",
      ),
    ).toEqual(["SELECT 1;", "SELECT 2;"]);
  });

  it("commits every migration before starting the next one", async () => {
    const client = new RecordingClient();
    const messages: string[] = [];

    const applied = await applyPendingMigrations(
      client,
      migrations,
      19,
      { info: (message) => messages.push(message) },
    );

    expect(applied).toBe(2);
    expect(client.queries.map(({ sql }) => sql)).toEqual([
      "BEGIN",
      "ALTER TYPE contribution_status ADD VALUE 'expired'",
      expect.stringContaining('INSERT INTO "drizzle"."__drizzle_migrations"'),
      "COMMIT",
      "BEGIN",
      "SELECT one",
      "SELECT two",
      expect.stringContaining('INSERT INTO "drizzle"."__drizzle_migrations"'),
      "COMMIT",
    ]);
    expect(messages).toContain("[migration] applied 0020_expired_enum");
    expect(messages).toContain("[migration] applying 0021_expiry_constraints");
  });

  it("rolls back only the failing migration and reports PostgreSQL context", async () => {
    const postgresError = Object.assign(new Error("unsafe enum value"), {
      code: "55P04",
      hint: "Commit the enum value first.",
    });
    const client = new RecordingClient(postgresError);

    await expect(
      applyPendingMigrations(
        client,
        [
          {
            createdAt: 21,
            hash: "hash-21",
            statements: ["SELECT broken"],
            tag: "0021_expiry_constraints",
          },
        ],
        20,
        { info: () => undefined },
      ),
    ).rejects.toThrow(
      "Migration 0021_expiry_constraints failed: unsafe enum value " +
        "(code 55P04; hint: Commit the enum value first.)",
    );
    expect(client.queries.at(-1)?.sql).toBe("ROLLBACK");
  });

  it("skips migrations already recorded in the Drizzle journal", async () => {
    const client = new RecordingClient();

    const applied = await applyPendingMigrations(
      client,
      migrations,
      21,
      { info: () => undefined },
    );

    expect(applied).toBe(0);
    expect(client.queries).toEqual([]);
  });
});
