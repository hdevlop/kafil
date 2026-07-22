import { describe, expect, it } from "bun:test";

import {
  clearSeedData,
  clearSeedStorage,
  DELETE_NON_ADMIN_USERS_SQL,
  SEED_DATA_TABLES,
  SEED_STORAGE_DIRECTORIES,
  TRUNCATE_SEED_DATA_SQL,
} from "../src/clear-seed-data";
import { join } from "node:path";

function buildFakePool(failOn?: string) {
  const queries: Array<{ sql: string; values?: unknown[] }> = [];
  let releases = 0;

  return {
    queries,
    get releases() {
      return releases;
    },
    pool: {
      async connect() {
        return {
          async query(sql: string, values?: unknown[]) {
            queries.push({ sql, values });
            if (sql === failOn) throw new Error("database failure");
          },
          release() {
            releases += 1;
          },
        };
      },
    },
  };
}

describe("seed data reset", () => {
  it("lists mutable application tables but preserves technical seed tables", () => {
    expect(SEED_DATA_TABLES).toContain("family_profiles");
    expect(SEED_DATA_TABLES).toContain("tokens");
    expect(SEED_DATA_TABLES).not.toContain("users");
    expect(SEED_DATA_TABLES).not.toContain("roles");
    expect(SEED_DATA_TABLES).not.toContain("permissions");
    expect(SEED_DATA_TABLES).not.toContain("role_permissions");
    expect(SEED_DATA_TABLES).not.toContain("platform_settings");
  });

  it("clears data transactionally and keeps only the configured admin", async () => {
    const fake = buildFakePool();

    await clearSeedData("admin@example.test", fake.pool);

    expect(fake.queries).toEqual([
      { sql: "BEGIN", values: undefined },
      { sql: TRUNCATE_SEED_DATA_SQL, values: undefined },
      {
        sql: DELETE_NON_ADMIN_USERS_SQL,
        values: ["admin@example.test"],
      },
      { sql: "COMMIT", values: undefined },
    ]);
    expect(fake.releases).toBe(1);
  });

  it("rolls back and releases the connection when clearing fails", async () => {
    const fake = buildFakePool(TRUNCATE_SEED_DATA_SQL);

    await expect(
      clearSeedData("admin@example.test", fake.pool),
    ).rejects.toThrow("database failure");

    expect(fake.queries.at(-1)).toEqual({ sql: "ROLLBACK", values: undefined });
    expect(fake.releases).toBe(1);
  });

  it("clears only the managed profile image storage directories", async () => {
    const removals: Array<{
      options: { force: true; recursive: true };
      path: string;
    }> = [];

    await clearSeedStorage("C:/kafil-storage", async (path, options) => {
      removals.push({ options, path });
    });

    expect(SEED_STORAGE_DIRECTORIES).toEqual([
      "family-images",
      "sponsor-images",
    ]);
    expect(removals).toEqual(
      SEED_STORAGE_DIRECTORIES.map((directory) => ({
        options: { force: true, recursive: true },
        path: join("C:/kafil-storage", directory),
      })),
    );
  });
});
