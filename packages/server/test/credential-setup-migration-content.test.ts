import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { splitMigrationStatements } from "../src/database/migrationRunner";

// These tests are compiled into dist/ before they run, so the package root is
// the only stable anchor for the migrations directory.
const migrations = join(process.cwd(), "migrations");

function statements(tag: string) {
  return splitMigrationStatements(
    readFileSync(join(migrations, `${tag}.sql`), "utf8"),
  );
}

// Each migration's DDL is pinned because anything beyond its declared scope is
// unexplained drift and blocks deployment.
describe("credential-setup migration content", () => {
  it("creates only credential_setup_requirements in Move 3", () => {
    const sql = statements("0040_credential_setup_requirements_bridge").join("\n");

    expect(sql).toContain('CREATE TABLE "credential_setup_requirements"');
    expect(sql.match(/CREATE TABLE/g)).toHaveLength(1);
    expect(sql).not.toMatch(/DROP TABLE|ALTER TABLE "(?!credential_setup_requirements)/);
    // The bridge itself: backfill plus one trigger per direction.
    expect(sql).toContain("ON CONFLICT (\"user_id\", \"purpose\")");
    expect(sql.match(/CREATE TRIGGER/g)).toHaveLength(2);
  });

  it("drops only the bridge in Move 5, keeping the legacy table", () => {
    const sql = statements("0041_remove_credential_setup_bridge").join("\n");

    expect(sql.match(/DROP TRIGGER/g)).toHaveLength(2);
    expect(sql.match(/DROP FUNCTION/g)).toHaveLength(2);
    expect(sql).not.toContain("DROP TABLE");
  });

  it("drops only family_password_requirements in Move 6", () => {
    const sql = statements("0042_drop_family_password_requirements");

    expect(sql).toHaveLength(1);
    expect(sql[0]).toBe('DROP TABLE "family_password_requirements" CASCADE;');
  });

  it("never reorders a deployed migration", () => {
    const journal = JSON.parse(
      readFileSync(join(migrations, "meta", "_journal.json"), "utf8"),
    ) as { entries: Array<{ idx: number; when: number; tag: string }> };

    const tags = journal.entries.map((entry) => entry.tag);
    expect(tags).toContain("0040_credential_setup_requirements_bridge");
    expect(tags).toContain("0041_remove_credential_setup_bridge");
    expect(tags).toContain("0042_drop_family_password_requirements");

    // The runner applies anything newer than the last applied timestamp, so a
    // non-monotonic journal would silently skip a migration.
    const times = journal.entries.map((entry) => entry.when);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });
});
