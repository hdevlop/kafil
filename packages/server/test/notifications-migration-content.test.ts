import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { splitMigrationStatements } from "../src/database/migrationRunner";

const migrations = join(process.cwd(), "migrations");

function statements(tag: string) {
  return splitMigrationStatements(
    readFileSync(join(migrations, `${tag}.sql`), "utf8"),
  );
}

describe("notifications migration content", () => {
  it("creates the five notification tables with checks and indexes in one migration", () => {
    // Phase A ships exactly one additive migration. A second migration file
    // for the same tables would break the plan's rollout contract.
    const tag = "0045_salty_hobgoblin";
    let files: string[] = [];
    try {
      files = [readFileSync(join(migrations, `${tag}.sql`), "utf8")];
    } catch {
      throw new Error(`Missing migration ${tag}.sql`);
    }
    expect(() =>
      readFileSync(join(migrations, "0046_previous_union_jack.sql"), "utf8"),
    ).toThrow();
    const sql = statements(tag).join("\n");
    expect(files[0].length).toBeGreaterThan(0);

    for (const table of [
      '"outbox_consumer_jobs"',
      '"notifications"',
      '"notification_deliveries"',
      '"push_subscriptions"',
      '"notification_settings"',
    ]) {
      expect(sql).toContain(`CREATE TABLE ${table}`);
    }
    // Status and locale guards.
    expect(sql).toContain("outbox_consumer_jobs_status_check");
    expect(sql).toContain("notifications_locale_check");
    expect(sql).toContain("notifications_read_at_check");
    expect(sql).toContain("notification_deliveries_channel_check");
    expect(sql).toContain("notification_deliveries_status_check");
    expect(sql).toContain("notification_settings_locale_check");
    // Idempotency and fan-out indexes.
    expect(sql).toContain("outbox_consumer_jobs_event_consumer_unique");
    expect(sql).toContain("notifications_source_recipient_unique");
    expect(sql).toContain(
      "notification_deliveries_notification_channel_target_unique",
    );
    expect(sql).toContain("notifications_recipient_read_created_idx");
    expect(sql).toContain("notifications_aggregate_idx");
    // Text user FKs with the correct cascade behavior.
    expect(sql).toContain("notifications_recipient_user_id_users_id_fk");
    expect(sql).toContain("notifications_actor_user_id_users_id_fk");
    expect(sql).toContain("ON DELETE cascade");
    expect(sql).toContain("ON DELETE set null");
    // Actor attribution on outbox events.
    expect(sql).toContain('ADD COLUMN "actor_user_id"');
    expect(sql).toContain("outbox_events_actor_user_id_users_id_fk");
    // Endpoint hash is globally unique (not per-user).
    expect(sql).toContain('UNIQUE("endpoint_hash")');
    // Never edits a deployed migration's scope.
    expect(sql).not.toMatch(/DROP TABLE "(users|roles|applicants|orders)"/);
  });

  it("bounds aggregate IDs, payloads, and push ciphertext in the same migration", () => {
    const sql = statements("0045_salty_hobgoblin").join("\n");
    expect(sql).toContain("notifications_aggregate_id_check");
    expect(sql).toContain('char_length("notifications"."aggregate_id"');
    expect(sql).toContain("notifications_payload_size_check");
    expect(sql).toContain('octet_length(("notifications"."payload")');
    expect(sql).toContain("push_subscriptions_endpoint_ciphertext_check");
    expect(sql).toContain("push_subscriptions_p256dh_ciphertext_check");
    expect(sql).toContain("push_subscriptions_auth_ciphertext_check");
    expect(sql.match(/ADD CONSTRAINT/g)?.length).toBeGreaterThanOrEqual(5);
    expect(sql).not.toMatch(/DROP TABLE/);
  });

  it("keeps the notification journal monotonic", () => {
    const journal = JSON.parse(
      readFileSync(join(migrations, "meta", "_journal.json"), "utf8"),
    ) as { entries: Array<{ idx: number; when: number; tag: string }> };
    const tags = journal.entries.map((entry) => entry.tag);
    expect(tags).toContain("0045_salty_hobgoblin");
    expect(tags).not.toContain("0046_previous_union_jack");
    const times = journal.entries.map((entry) => entry.when);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });
});
