import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  integer,
  jsonb,
  pgTable,
  text,
  varchar,
} from "drizzle-orm/pg-core";
import type { NajmDesignConfig } from "najm-kit";
import { usersTable } from "najm-auth/pg";

import { timestamps } from "../../database/columns";

export const PLATFORM_SETTINGS_ID = "platform";
export const DEFAULT_APPEARANCE_REVISION = 1;
export const DEFAULT_BRANDING_REVISION = 1;
export const DEFAULT_PENDING_CONTRIBUTION_EXPIRY_HOURS = 72;
export const MIN_PENDING_CONTRIBUTION_EXPIRY_HOURS = 1;
export const MAX_PENDING_CONTRIBUTION_EXPIRY_HOURS = 720;

export const platformSettings = pgTable(
  "platform_settings",
  {
    id: text("id").primaryKey(),
    familyFundingTargetMinor: bigint("family_funding_target_minor", {
      mode: "number",
    }).notNull(),
    pendingContributionExpiryHours: integer(
      "pending_contribution_expiry_hours",
    )
      .default(DEFAULT_PENDING_CONTRIBUTION_EXPIRY_HOURS)
      .notNull(),
    formFillEnabled: boolean("form_fill_enabled").default(false).notNull(),
    designConfig: jsonb("design_config").$type<NajmDesignConfig>(),
    appearanceRevision: integer("appearance_revision")
      .default(DEFAULT_APPEARANCE_REVISION)
      .notNull(),
    sidebarLogoExpandedPath: text("sidebar_logo_expanded_path"),
    sidebarLogoCollapsedPath: text("sidebar_logo_collapsed_path"),
    authLogoPath: text("auth_logo_path"),
    authHeroImagePath: text("auth_hero_image_path"),
    brandingRevision: integer("branding_revision")
      .default(DEFAULT_BRANDING_REVISION)
      .notNull(),
    currency: varchar("currency", { length: 3 }).default("MAD").notNull(),
    updatedByUserId: text("updated_by_user_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    ...timestamps(),
  },
  (table) => [
    check("platform_settings_singleton_check", sql`${table.id} = 'platform'`),
    check(
      "platform_settings_positive_funding_target_check",
      sql`${table.familyFundingTargetMinor} > 0`,
    ),
    check("platform_settings_currency_check", sql`${table.currency} = 'MAD'`),
    check(
      "platform_settings_positive_appearance_revision_check",
      sql`${table.appearanceRevision} > 0`,
    ),
    check(
      "platform_settings_positive_branding_revision_check",
      sql`${table.brandingRevision} > 0`,
    ),
    check(
      "platform_settings_pending_expiry_hours_check",
      sql`${table.pendingContributionExpiryHours} BETWEEN ${MIN_PENDING_CONTRIBUTION_EXPIRY_HOURS} AND ${MAX_PENDING_CONTRIBUTION_EXPIRY_HOURS}`,
    ),
  ],
);

export type PlatformSetting = typeof platformSettings.$inferSelect;

export const settingSchema = { platformSettings };