import { db } from "@kafil/server/database";
import { kafilTheme } from "@kafil/server/theme";
import {
  DEFAULT_THEME_SCOPE_ID,
  parseSafeDesignConfig,
  themePresetSlug,
} from "najm-theme";
import { najmThemePresets } from "najm-theme/pg";
import { and, eq } from "drizzle-orm";

import ardoise from "./themes/ardoise.json";
import ciel from "./themes/ciel.json";
import nuit from "./themes/nuit.json";
import sable from "./themes/sable.json";

export interface BuiltInThemePreset {
  name: string;
  design: unknown;
}

/**
 * Themes shipped with the platform. "Emerald" mirrors the version-controlled
 * factory design so an admin can always get back to it from the library.
 *
 * These rows live in `najm_theme_presets` now. The slug, the validation, and
 * the scope key are the package's; only the names and the four design files
 * are Kafil's.
 */
export function builtInThemePresets(): BuiltInThemePreset[] {
  return [
    { name: "Emerald", design: kafilTheme.appearance() },
    { name: "Sable", design: sable },
    { name: "Nuit", design: nuit },
    { name: "Ardoise", design: ardoise },
    { name: "Ciel", design: ciel },
  ];
}

export interface ThemePresetSeedResult {
  inserted: number;
  updated: number;
  names: string[];
}

/**
 * Seeds the built-in theme library. Re-running refreshes each built-in in
 * place and never touches presets an admin saved themselves.
 */
export async function seedThemePresets(): Promise<ThemePresetSeedResult> {
  const definitions = builtInThemePresets();
  let inserted = 0;
  let updated = 0;

  for (const definition of definitions) {
    // Fail loudly during seeding rather than storing a design the package's
    // appearance policy would later reject at read time.
    const designConfig = parseSafeDesignConfig(definition.design);
    const slug = themePresetSlug(definition.name);

    const [existing] = await db
      .select({ id: najmThemePresets.id })
      .from(najmThemePresets)
      .where(
        and(
          eq(najmThemePresets.scopeId, DEFAULT_THEME_SCOPE_ID),
          eq(najmThemePresets.slug, slug),
        ),
      )
      .limit(1);

    if (existing) {
      await db
        .update(najmThemePresets)
        .set({
          name: definition.name,
          designConfig,
          isBuiltIn: true,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(najmThemePresets.id, existing.id));
      updated += 1;
      continue;
    }

    await db.insert(najmThemePresets).values({
      scopeId: DEFAULT_THEME_SCOPE_ID,
      slug,
      name: definition.name,
      designConfig,
      isBuiltIn: true,
      createdByActorId: null,
    });
    inserted += 1;
  }

  return {
    inserted,
    updated,
    names: definitions.map((definition) => definition.name),
  };
}

export interface ThemePresetVerification {
  total: number;
  builtIn: number;
  missing: string[];
}

export async function verifyThemePresets(): Promise<ThemePresetVerification> {
  const rows = await db
    .select({ slug: najmThemePresets.slug, isBuiltIn: najmThemePresets.isBuiltIn })
    .from(najmThemePresets)
    .where(eq(najmThemePresets.scopeId, DEFAULT_THEME_SCOPE_ID));

  const bySlug = new Set(rows.map((row) => row.slug));
  const missing = builtInThemePresets()
    .filter((definition) => !bySlug.has(themePresetSlug(definition.name)))
    .map((definition) => definition.name);

  return {
    total: rows.length,
    builtIn: rows.filter((row) => row.isBuiltIn).length,
    missing,
  };
}
