import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Pool } from "pg";

import { runThemeBackfill } from "../src/database/themeBackfill";

/**
 * The cutover data move, against a real PostgreSQL.
 *
 * The package's revision, conflict, and resolution behavior is covered by its
 * own suite. What only Kafil can prove is that *its* rows land correctly and
 * that the legacy ones survive — because the whole rollback story depends on
 * the second half.
 */
const databaseDescribe =
  process.env.KAFIL_RUN_DB_INTEGRATION === "1" ? describe : describe.skip;

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 4 });

/** A 12-byte RIFF/WEBP header: enough for the probe, no image data. */
const WEBP_STUB = Buffer.from([
  0x52, 0x49, 0x46, 0x46, 0x04, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
]);

const PRESENT_FILE = "11111111-1111-4111-8111-111111111111.webp";
const ABSENT_FILE = "22222222-2222-4222-8222-222222222222.webp";
const ASSET_PREFIX = "/api/branding/assets/serve/";

let storagePath = "";
const snapshot: {
  settings: Record<string, unknown> | undefined;
} = { settings: undefined };

databaseDescribe("najm-theme backfill", () => {
  beforeAll(async () => {
    storagePath = await mkdtemp(join(tmpdir(), "kafil-theme-backfill-"));
    await mkdir(join(storagePath, "branding"), { recursive: true });
    await writeFile(join(storagePath, "branding", PRESENT_FILE), WEBP_STUB);

    const existing = await pool.query(
      `SELECT * FROM platform_settings WHERE id = 'platform'`,
    );
    snapshot.settings = existing.rows[0];

    await pool.query(
      `DELETE FROM najm_theme_appearance WHERE scope_id = 'platform'`,
    );
    await pool.query(`DELETE FROM najm_theme_branding WHERE scope_id = 'platform'`);

    await pool.query(
      `UPDATE platform_settings
          SET appearance_revision = 19,
              branding_revision = 13,
              sidebar_logo_expanded_path = NULL,
              sidebar_logo_collapsed_path = $1,
              auth_logo_path = NULL,
              auth_hero_image_path = $2
        WHERE id = 'platform'`,
      [`${ASSET_PREFIX}${PRESENT_FILE}`, `${ASSET_PREFIX}${ABSENT_FILE}`],
    );
  });

  afterAll(async () => {
    await pool.query(
      `DELETE FROM najm_theme_appearance WHERE scope_id = 'platform'`,
    );
    await pool.query(`DELETE FROM najm_theme_branding WHERE scope_id = 'platform'`);
    if (snapshot.settings) {
      const row = snapshot.settings as Record<string, unknown>;
      await pool.query(
        `UPDATE platform_settings
            SET appearance_revision = $1,
                branding_revision = $2,
                sidebar_logo_expanded_path = $3,
                sidebar_logo_collapsed_path = $4,
                auth_logo_path = $5,
                auth_hero_image_path = $6
          WHERE id = 'platform'`,
        [
          row.appearance_revision,
          row.branding_revision,
          row.sidebar_logo_expanded_path,
          row.sidebar_logo_collapsed_path,
          row.auth_logo_path,
          row.auth_hero_image_path,
        ],
      );
    }
    await rm(storagePath, { force: true, recursive: true });
    await pool.end();
  });

  it("reports without writing in dry-run mode", async () => {
    const summary = await runThemeBackfill({
      apply: false,
      storageBasePath: storagePath,
    });

    expect(summary.mode).toBe("dry-run");
    expect(summary.appearance.revision).toBe(19);
    expect(summary.branding.revision).toBe(13);

    const written = await pool.query(
      `SELECT 1 FROM najm_theme_appearance WHERE scope_id = 'platform'`,
    );
    expect(written.rowCount).toBe(0);
  });

  it("carries revisions across and imports a missing asset as unset", async () => {
    const summary = await runThemeBackfill({
      apply: true,
      storageBasePath: storagePath,
    });

    expect(summary.mode).toBe("apply");

    const appearance = await pool.query<{ revision: number }>(
      `SELECT revision FROM najm_theme_appearance WHERE scope_id = 'platform'`,
    );
    expect(appearance.rows[0]?.revision).toBe(19);

    const branding = await pool.query<{
      revision: number;
      slot_config: Record<string, { fileName: string; mimeType: string }>;
    }>(`SELECT revision, slot_config FROM najm_theme_branding WHERE scope_id = 'platform'`);

    expect(branding.rows[0]?.revision).toBe(13);

    // Two slots were referenced; only the one whose bytes exist becomes a
    // record. The other resolves to the factory asset — which is exactly what
    // Kafil rendered for that dead reference before the cutover.
    const slots = branding.rows[0]?.slot_config ?? {};
    expect(Object.keys(slots)).toEqual(["sidebarLogoCollapsed"]);
    expect(slots.sidebarLogoCollapsed?.fileName).toBe(PRESENT_FILE);
    expect(slots.sidebarLogoCollapsed?.mimeType).toBe("image/webp");

    expect(summary.branding.slotsReferenced).toBe(2);
    expect(summary.branding.slotsImported).toBe(1);
    // Counted and named, never silent.
    expect(
      summary.skipped.some(
        (skip) =>
          skip.what === "branding.authHeroImage" && skip.reason.includes("absent"),
      ),
    ).toBe(true);
  });

  it("is idempotent and leaves the legacy rows untouched", async () => {
    const second = await runThemeBackfill({
      apply: true,
      storageBasePath: storagePath,
    });

    expect(second.appearance.alreadyPresent).toBe(true);
    expect(second.branding.alreadyPresent).toBe(true);

    const legacy = await pool.query<{
      appearance_revision: number;
      branding_revision: number;
      auth_hero_image_path: string | null;
    }>(
      `SELECT appearance_revision, branding_revision, auth_hero_image_path
         FROM platform_settings WHERE id = 'platform'`,
    );

    // The rollback guarantee: reverting code must find the original data.
    expect(legacy.rows[0]?.appearance_revision).toBe(19);
    expect(legacy.rows[0]?.branding_revision).toBe(13);
    expect(legacy.rows[0]?.auth_hero_image_path).toBe(`${ASSET_PREFIX}${ABSENT_FILE}`);
  });
});
