import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { pool } from "../config/databaseConfig";
import { envConfig } from "../config/envConfig";
import {
  DEFAULT_THEME_SCOPE_ID,
  isThemePresetSlug,
  parseSafeDesignConfig,
  themePresetSlug,
  uniqueThemePresetSlug,
  type BrandingSlotAsset,
  type BrandingSlotConfig,
} from "najm-theme";

/**
 * One-time transfer of Kafil's local theme data into the `najm-theme` tables.
 *
 * Read-only against everything Kafil still owns. It never writes
 * `platform_settings` or `theme_presets`, because rollback means reverting
 * *code* to a database that still holds the original rows — not running a
 * destructive reverse migration.
 *
 * Idempotent: a scope or preset already present in the package tables is
 * counted and left alone, so a partial run can simply be repeated.
 *
 * Dry-run by default. `--apply` is the only thing that writes.
 */

const LEGACY_ASSET_PREFIX = "/api/branding/assets/serve/";
const LEGACY_ASSET_DIRECTORY = "branding";
/** `theme-branding` from `themeConfig.ts`, suffixed per scope by the package. */
const PACKAGE_NAMESPACE = `theme-branding-${DEFAULT_THEME_SCOPE_ID}`;

/** The legacy column behind each package slot key. */
const SLOT_COLUMNS = {
  sidebarLogoExpanded: "sidebar_logo_expanded_path",
  sidebarLogoCollapsed: "sidebar_logo_collapsed_path",
  authLogo: "auth_logo_path",
  authHeroImage: "auth_hero_image_path",
} as const;

type SlotKey = keyof typeof SLOT_COLUMNS;

/**
 * PNG, JPEG, and WebP only — the three the package probes.
 *
 * Kafil's uploader also accepted AVIF; the freeze audit found zero AVIF and
 * zero GIF bytes on disk or referenced by the database. Anything that is not
 * one of these three is reported as skipped rather than imported under a MIME
 * type the serve route would refuse to hand back.
 */
function probeMime(bytes: Uint8Array): string | undefined {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return undefined;
}

export interface ThemeBackfillSkip {
  what: string;
  reason: string;
}

export interface ThemeBackfillSummary {
  mode: "dry-run" | "apply";
  appearance: {
    found: boolean;
    imported: boolean;
    revision: number | null;
    designValid: boolean;
    alreadyPresent: boolean;
  };
  branding: {
    found: boolean;
    imported: boolean;
    revision: number | null;
    slotsReferenced: number;
    slotsImported: number;
    alreadyPresent: boolean;
  };
  presets: {
    found: number;
    imported: number;
    alreadyPresent: number;
  };
  /** Every reference that did not become a row. Never silent. */
  skipped: ThemeBackfillSkip[];
}

interface LegacySettingsRow {
  design_config: unknown;
  appearance_revision: number;
  branding_revision: number;
  updated_by_user_id: string | null;
  created_at: Date;
  updated_at: Date;
  sidebar_logo_expanded_path: string | null;
  sidebar_logo_collapsed_path: string | null;
  auth_logo_path: string | null;
  auth_hero_image_path: string | null;
}

interface LegacyPresetRow {
  id: string;
  slug: string;
  name: string;
  design_config: unknown;
  is_built_in: boolean;
  created_by_user_id: string | null;
  created_at: Date;
  updated_at: Date;
}

function iso(value: Date | null | undefined): string {
  return (value ?? new Date()).toISOString();
}

function legacyFileName(path: string): string | undefined {
  if (!path.startsWith(LEGACY_ASSET_PREFIX)) return undefined;
  const fileName = decodeURIComponent(path.slice(LEGACY_ASSET_PREFIX.length));
  return /^[0-9a-f-]{36}\.(?:avif|gif|jpe?g|png|webp)$/i.test(fileName)
    ? fileName
    : undefined;
}

/**
 * A committed reference whose bytes are absent imports as **unset**, not as a
 * slot record.
 *
 * The package's slot record stores a file name, a MIME type, a byte count, and
 * an upload time derived from the actual bytes. Those bytes do not exist, so
 * there is nothing honest to write — and an unset slot resolves to the factory
 * asset, which is exactly what Kafil renders for a dead reference today.
 * Observable behavior is preserved; the row just stops claiming otherwise.
 */
async function importSlot(
  slot: SlotKey,
  legacyPath: string,
  storageBasePath: string,
  apply: boolean,
  skipped: ThemeBackfillSkip[],
): Promise<BrandingSlotAsset | undefined> {
  const fileName = legacyFileName(legacyPath);
  if (!fileName) {
    skipped.push({ what: `branding.${slot}`, reason: "not a managed upload path" });
    return undefined;
  }

  const source = resolve(storageBasePath, LEGACY_ASSET_DIRECTORY, fileName);
  const bytes = await readFile(source).catch(() => undefined);
  if (!bytes) {
    skipped.push({
      what: `branding.${slot}`,
      reason: `referenced file is absent from storage (${fileName})`,
    });
    return undefined;
  }

  const mimeType = probeMime(bytes);
  if (!mimeType) {
    skipped.push({
      what: `branding.${slot}`,
      reason: `bytes are not PNG, JPEG, or WebP (${fileName})`,
    });
    return undefined;
  }

  const uploadedAt = await stat(source)
    .then((info) => info.mtime.toISOString())
    .catch(() => new Date().toISOString());

  if (apply) {
    // Copied, not moved. The legacy directory stays readable for the whole
    // rollback window, which is the same reason the legacy columns stay.
    const target = resolve(storageBasePath, PACKAGE_NAMESPACE);
    await mkdir(target, { recursive: true });
    await writeFile(join(target, fileName), bytes);
  }

  return { fileName, mimeType, bytes: bytes.byteLength, uploadedAt };
}

export async function runThemeBackfill(options: {
  apply?: boolean;
  storageBasePath?: string;
}): Promise<ThemeBackfillSummary> {
  const apply = options.apply === true;
  const storageBasePath = resolve(
    options.storageBasePath ?? envConfig.storage.basePath,
  );
  const skipped: ThemeBackfillSkip[] = [];

  const summary: ThemeBackfillSummary = {
    mode: apply ? "apply" : "dry-run",
    appearance: {
      found: false,
      imported: false,
      revision: null,
      designValid: false,
      alreadyPresent: false,
    },
    branding: {
      found: false,
      imported: false,
      revision: null,
      slotsReferenced: 0,
      slotsImported: 0,
      alreadyPresent: false,
    },
    presets: { found: 0, imported: 0, alreadyPresent: 0 },
    skipped,
  };

  const settings = await pool.query<LegacySettingsRow>(
    `SELECT design_config, appearance_revision, branding_revision, updated_by_user_id,
            created_at, updated_at, sidebar_logo_expanded_path, sidebar_logo_collapsed_path,
            auth_logo_path, auth_hero_image_path
       FROM platform_settings WHERE id = 'platform'`,
  );
  const legacy = settings.rows[0];

  // ---------------------------------------------------------------- appearance
  if (legacy) {
    summary.appearance.found = true;
    summary.appearance.revision = legacy.appearance_revision;

    let designConfig: unknown = null;
    if (legacy.design_config !== null && legacy.design_config !== undefined) {
      try {
        designConfig = parseSafeDesignConfig(legacy.design_config);
        summary.appearance.designValid = true;
      } catch (error) {
        // Imported as `null`, which means "on the factory design" — the same
        // thing the package serves for an unparseable stored config. Storing
        // the broken payload would preserve nothing and keep a value no read
        // path can use.
        skipped.push({
          what: "appearance.designConfig",
          reason: `stored design does not validate: ${
            error instanceof Error ? error.message : String(error)
          }`,
        });
      }
    } else {
      summary.appearance.designValid = true;
    }

    const existing = await pool.query(
      `SELECT 1 FROM najm_theme_appearance WHERE scope_id = $1`,
      [DEFAULT_THEME_SCOPE_ID],
    );
    if (existing.rowCount && existing.rowCount > 0) {
      summary.appearance.alreadyPresent = true;
    } else if (apply) {
      await pool.query(
        `INSERT INTO najm_theme_appearance
           (scope_id, design_config, revision, updated_by_actor_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (scope_id) DO NOTHING`,
        [
          DEFAULT_THEME_SCOPE_ID,
          designConfig === null ? null : JSON.stringify(designConfig),
          legacy.appearance_revision,
          legacy.updated_by_user_id,
          iso(legacy.created_at),
          iso(legacy.updated_at),
        ],
      );
      summary.appearance.imported = true;
    } else {
      summary.appearance.imported = true;
    }

    // ------------------------------------------------------------- branding
    summary.branding.found = true;
    summary.branding.revision = legacy.branding_revision;

    const slotConfig: BrandingSlotConfig = {};
    for (const [slot, column] of Object.entries(SLOT_COLUMNS) as [
      SlotKey,
      (typeof SLOT_COLUMNS)[SlotKey],
    ][]) {
      const legacyPath = legacy[column];
      if (!legacyPath) continue;
      summary.branding.slotsReferenced += 1;

      const asset = await importSlot(slot, legacyPath, storageBasePath, apply, skipped);
      if (asset) {
        slotConfig[slot] = asset;
        summary.branding.slotsImported += 1;
      }
    }

    const existingBranding = await pool.query(
      `SELECT 1 FROM najm_theme_branding WHERE scope_id = $1`,
      [DEFAULT_THEME_SCOPE_ID],
    );
    if (existingBranding.rowCount && existingBranding.rowCount > 0) {
      summary.branding.alreadyPresent = true;
    } else if (apply) {
      await pool.query(
        `INSERT INTO najm_theme_branding
           (scope_id, slot_config, revision, updated_by_actor_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (scope_id) DO NOTHING`,
        [
          DEFAULT_THEME_SCOPE_ID,
          JSON.stringify(slotConfig),
          legacy.branding_revision,
          legacy.updated_by_user_id,
          iso(legacy.created_at),
          iso(legacy.updated_at),
        ],
      );
      summary.branding.imported = true;
    } else {
      summary.branding.imported = true;
    }
  } else {
    skipped.push({ what: "platform_settings", reason: "no 'platform' row" });
  }

  // ------------------------------------------------------------------ presets
  const presets = await pool.query<LegacyPresetRow>(
    `SELECT id, slug, name, design_config, is_built_in, created_by_user_id,
            created_at, updated_at
       FROM theme_presets ORDER BY created_at`,
  );
  summary.presets.found = presets.rowCount ?? 0;

  const takenSlugs = new Set<string>(
    (
      await pool.query<{ slug: string }>(
        `SELECT slug FROM najm_theme_presets WHERE scope_id = $1`,
        [DEFAULT_THEME_SCOPE_ID],
      )
    ).rows.map((row) => row.slug),
  );

  for (const preset of presets.rows) {
    let designConfig: unknown;
    try {
      designConfig = parseSafeDesignConfig(preset.design_config);
    } catch (error) {
      // A preset the package would refuse to apply is worse than a missing
      // one: it lists, an administrator selects it, and the apply is rejected.
      skipped.push({
        what: `preset.${preset.slug}`,
        reason: `design does not validate: ${
          error instanceof Error ? error.message : String(error)
        }`,
      });
      continue;
    }

    // The legacy slug is kept when the package would have produced a legal one
    // — a preset an administrator can already name in a URL or a script should
    // keep that name. Otherwise it is re-derived and de-duplicated.
    const slug = isThemePresetSlug(preset.slug)
      ? preset.slug
      : uniqueThemePresetSlug(themePresetSlug(preset.name), takenSlugs);

    if (takenSlugs.has(slug)) {
      summary.presets.alreadyPresent += 1;
      continue;
    }
    takenSlugs.add(slug);

    if (apply) {
      await pool.query(
        `INSERT INTO najm_theme_presets
           (id, scope_id, slug, name, design_config, is_built_in, created_by_actor_id,
            created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT DO NOTHING`,
        [
          // The identifier travels: a saved link or a script that applies a
          // preset by id keeps working across the cutover.
          preset.id,
          DEFAULT_THEME_SCOPE_ID,
          slug,
          preset.name,
          JSON.stringify(designConfig),
          preset.is_built_in,
          preset.created_by_user_id,
          iso(preset.created_at),
          iso(preset.updated_at),
        ],
      );
    }
    summary.presets.imported += 1;
  }

  return summary;
}
