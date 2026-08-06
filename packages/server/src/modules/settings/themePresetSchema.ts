import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  jsonb,
  pgTable,
  text,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import type { NajmDesignConfig } from "najm-kit";
import { usersTable } from "najm-auth/pg";

import { timestamps } from "../../database/columns";

export const MAX_THEME_PRESETS = 50;
export const MAX_THEME_PRESET_NAME_LENGTH = 80;
export const MAX_THEME_PRESET_SLUG_LENGTH = 96;

export const themePresets = pgTable(
  "theme_presets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: varchar("slug", { length: MAX_THEME_PRESET_SLUG_LENGTH })
      .notNull()
      .unique(),
    name: varchar("name", { length: MAX_THEME_PRESET_NAME_LENGTH }).notNull(),
    designConfig: jsonb("design_config").$type<NajmDesignConfig>().notNull(),
    // Built-in presets ship with the seed and cannot be deleted by an admin.
    isBuiltIn: boolean("is_built_in").default(false).notNull(),
    createdByUserId: text("created_by_user_id").references(
      () => usersTable.id,
      { onDelete: "set null" },
    ),
    ...timestamps(),
  },
  (table) => [
    check(
      "theme_presets_name_not_blank_check",
      sql`length(btrim(${table.name})) > 0`,
    ),
    check(
      "theme_presets_slug_not_blank_check",
      sql`length(btrim(${table.slug})) > 0`,
    ),
  ],
);

export type ThemePreset = typeof themePresets.$inferSelect;
export type NewThemePreset = typeof themePresets.$inferInsert;

export const themePresetSchema = { themePresets };
