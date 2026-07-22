import { sql } from "drizzle-orm";
import { bigint, check, pgTable, text, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "najm-auth/pg";

import { timestamps } from "../../database/columns";

export const PLATFORM_SETTINGS_ID = "platform";

export const platformSettings = pgTable(
  "platform_settings",
  {
    id: text("id").primaryKey(),
    familyFundingTargetMinor: bigint("family_funding_target_minor", {
      mode: "number",
    }).notNull(),
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
  ],
);

export type PlatformSetting = typeof platformSettings.$inferSelect;

export const settingSchema = { platformSettings };
