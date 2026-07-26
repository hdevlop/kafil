import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Pool } from "pg";

import { server } from "../src";
import { AppearanceService } from "../src/modules/settings";

const databaseDescribe =
  process.env.KAFIL_RUN_DB_INTEGRATION === "1" ? describe : describe.skip;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 4,
});

interface OriginalAppearanceRow {
  appearance_revision: number;
  design_config: unknown;
  updated_at: Date;
  updated_by_user_id: string | null;
}

let actorUserId = "";
let appearance: AppearanceService;
let original: OriginalAppearanceRow | undefined;
const auditIds: string[] = [];

function isolatedRequest<T>(operation: () => Promise<T>) {
  return server.container.run({}, operation);
}

databaseDescribe("appearance PostgreSQL revision concurrency", () => {
  beforeAll(async () => {
    if (!process.env.DATABASE_URL || !process.env.KAFIL_ADMIN_EMAIL) {
      throw new Error(
        "DATABASE_URL and KAFIL_ADMIN_EMAIL are required for database integration tests.",
      );
    }

    await server.init();
    appearance = server.container.get(AppearanceService);
    const actor = await pool.query<{ id: string }>(
      "SELECT id FROM users WHERE lower(email) = lower($1) LIMIT 1",
      [process.env.KAFIL_ADMIN_EMAIL],
    );
    actorUserId = actor.rows[0]?.id ?? "";
    if (!actorUserId) {
      throw new Error("Run `bun run seed -- setup --yes` before DB tests.");
    }

    const setting = await pool.query<OriginalAppearanceRow>(
      `SELECT design_config, appearance_revision, updated_by_user_id, updated_at
       FROM platform_settings WHERE id = 'platform'`,
    );
    original = setting.rows[0];
    if (!original) throw new Error("Platform settings are not seeded.");
  });

  afterAll(async () => {
    if (original) {
      await pool
        .query(
          `UPDATE platform_settings
           SET design_config = $1::jsonb,
               appearance_revision = $2,
               updated_by_user_id = $3,
               updated_at = $4
           WHERE id = 'platform'`,
          [
            original.design_config,
            original.appearance_revision,
            original.updated_by_user_id,
            original.updated_at,
          ],
        )
        .catch(() => undefined);
    }
    if (auditIds.length > 0) {
      await pool
        .query("DELETE FROM audit_events WHERE id = ANY($1::uuid[])", [
          auditIds,
        ])
        .catch(() => undefined);
    }
    await pool.end();
  });

  it("allows exactly one save for a shared expected revision", async () => {
    const initial = await isolatedRequest(() => appearance.get());
    const first = structuredClone(initial.designConfig);
    const second = structuredClone(initial.designConfig);
    first.theme.tokens = { ...first.theme.tokens, primary: "#126e45" };
    second.theme.tokens = { ...second.theme.tokens, primary: "#2878b5" };
    const startedAt = new Date();

    const race = await Promise.allSettled([
      isolatedRequest(() =>
        appearance.save(
          {
            expectedRevision: initial.revision,
            designConfig: first,
          },
          actorUserId,
        ),
      ),
      isolatedRequest(() =>
        appearance.save(
          {
            expectedRevision: initial.revision,
            designConfig: second,
          },
          actorUserId,
        ),
      ),
    ]);

    expect(race.filter(({ status }) => status === "fulfilled")).toHaveLength(1);
    const rejected = race.find(({ status }) => status === "rejected");
    expect(
      rejected?.status === "rejected" ? rejected.reason : undefined,
    ).toMatchObject({ status: 409 });

    const setting = await pool.query<{
      appearance_revision: number;
      design_config: { typography?: unknown };
    }>(
      `SELECT appearance_revision, design_config
       FROM platform_settings WHERE id = 'platform'`,
    );
    expect(setting.rows[0]?.appearance_revision).toBe(initial.revision + 1);
    expect(setting.rows[0]?.design_config.typography).toEqual(
      initial.designConfig.typography,
    );

    const audits = await pool.query<{
      id: string;
      metadata: Record<string, unknown>;
    }>(
      `SELECT id, metadata
       FROM audit_events
       WHERE action = 'appearance.themeUpdated'
         AND actor_user_id = $1
         AND created_at >= $2
       ORDER BY created_at`,
      [actorUserId, startedAt],
    );
    auditIds.push(...audits.rows.map(({ id }) => id));
    expect(audits.rows).toHaveLength(1);
    expect(audits.rows[0]?.metadata).toMatchObject({
      previousRevision: initial.revision,
      newRevision: initial.revision + 1,
      changedGroups: ["brand"],
    });
  }, 15_000);
});
