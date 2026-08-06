import type { NajmDesignConfig } from "najm-kit";

export interface PublicThemePreset {
  id: string;
  slug: string;
  name: string;
  designConfig: NajmDesignConfig;
  isBuiltIn: boolean;
  createdAt: string;
}

/**
 * Turns a preset name into the stable unique key used for conflict detection
 * and idempotent seeding. Two names that differ only by case, punctuation, or
 * spacing resolve to the same slug and therefore to the same preset.
 */
export function themePresetSlug(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  // Non-latin names (for example Arabic) normalize to an empty slug, so fall
  // back to a stable encoding of the trimmed original instead.
  return slug || `t-${Buffer.from(name.trim()).toString("hex").slice(0, 80)}`;
}
