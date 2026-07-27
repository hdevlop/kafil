import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Pool } from "pg";

import { server } from "../src";
import { BrandingService } from "../src/modules/settings";

const databaseDescribe =
  process.env.KAFIL_RUN_DB_INTEGRATION === "1" ? describe : describe.skip;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 4,
});

interface OriginalBrandingRow {
  branding_revision: number;
  sidebar_logo_expanded_path: string | null;
  sidebar_logo_collapsed_path: string | null;
  auth_logo_path: string | null;
  auth_hero_image_path: string | null;
  updated_at: Date;
  updated_by_user_id: string | null;
}

let actorUserId = "";
let branding: BrandingService;
let original: OriginalBrandingRow | undefined;
const auditIds: string[] = [];

function isolatedRequest<T>(operation: () => Promise<T>) {
  return server.container.run({}, operation);
}

databaseDescribe("branding PostgreSQL revision concurrency", () => {
  beforeAll(async () => {
    if (!process.env.DATABASE_URL || !process.env.KAFIL_ADMIN_EMAIL) {
      throw new Error(
        "DATABASE_URL and KAFIL_ADMIN_EMAIL are required for database integration tests.",
      );
    }

    await server.init();
    branding = server.container.get(BrandingService);
    const actor = await pool.query<{ id: string }>(
      "SELECT id FROM users WHERE lower(email) = lower($1) LIMIT 1",
      [process.env.KAFIL_ADMIN_EMAIL],
    );
    actorUserId = actor.rows[0]?.id ?? "";
    if (!actorUserId) {
      throw new Error("Run `bun run seed -- setup --yes` before DB tests.");
    }

    const setting = await pool.query<OriginalBrandingRow>(
      `SELECT branding_revision, sidebar_logo_expanded_path,
              sidebar_logo_collapsed_path, auth_logo_path,
              auth_hero_image_path, updated_by_user_id, updated_at
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
           SET branding_revision = $1,
               sidebar_logo_expanded_path = $2,
               sidebar_logo_collapsed_path = $3,
               auth_logo_path = $4,
               auth_hero_image_path = $5,
               updated_by_user_id = $6,
               updated_at = $7
           WHERE id = 'platform'`,
          [
            original.branding_revision,
            original.sidebar_logo_expanded_path,
            original.sidebar_logo_collapsed_path,
            original.auth_logo_path,
            original.auth_hero_image_path,
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

  it("allows exactly one save for a shared expected branding revision", async () => {
    const initial = await isolatedRequest(() => branding.get());
    const startedAt = new Date();

    const race = await Promise.allSettled([
      isolatedRequest(() =>
        branding.save(
          {
            sidebarLogoExpandedPath: null,
            sidebarLogoCollapsedPath: null,
            authLogoPath: null,
            authHeroImagePath: null,
            expectedRevision: initial.revision,
          },
          actorUserId,
        ),
      ),
      isolatedRequest(() =>
        branding.save(
          {
            sidebarLogoExpandedPath: null,
            sidebarLogoCollapsedPath: null,
            authLogoPath: null,
            authHeroImagePath: null,
            expectedRevision: initial.revision,
          },
          actorUserId,
        ),
      ),
    ]);

    const fulfilled = race.filter(
      ({ status }) => status === "fulfilled",
    );
    const rejected = race.find(({ status }) => status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(
      rejected?.status === "rejected" ? rejected.reason : undefined,
    ).toMatchObject({ status: 409 });

    const setting = await pool.query<{ branding_revision: number }>(
      `SELECT branding_revision FROM platform_settings WHERE id = 'platform'`,
    );
    expect(setting.rows[0]?.branding_revision).toBe(initial.revision + 1);

    const audits = await pool.query<{
      id: string;
      metadata: Record<string, unknown>;
    }>(
      `SELECT id, metadata
       FROM audit_events
       WHERE action = 'branding.assetsUpdated'
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
    });
  }, 15_000);
});
