import {
  boolean,
  date,
  pgTable,
  text,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { usersTable } from "najm-auth/pg";

import { timestamps } from "../../database/columns";
import { genderEnum } from "../../database/enums";

export const sponsorProfiles = pgTable("sponsor_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  phone: varchar("phone", { length: 40 }).unique(),
  // Retained privately while existing sponsor data is migrated deliberately.
  legacyCountryCode: varchar("country_code", { length: 2 }),
  legacyPreferredLanguage: varchar("preferred_language", { length: 12 })
    .notNull()
    .default("en"),
  legacyPreferredCurrency: varchar("preferred_currency", { length: 3 })
    .notNull()
    .default("USD"),
  legacyCommunicationOptIn: boolean("communication_opt_in")
    .notNull()
    .default(true),
  // New profiles must provide these values through the DTO; legacy profiles are
  // completed through the sponsor backfill workflow before enforcement.
  cin: varchar("cin", { length: 20 }).unique(),
  gender: genderEnum("gender"),
  address: text("address"),
  dateOfBirth: date("date_of_birth"),
  notes: text("notes"),
  ...timestamps(),
});

export type SponsorProfile = typeof sponsorProfiles.$inferSelect;
export type NewSponsorProfile = typeof sponsorProfiles.$inferInsert;

export const sponsorSchema = {
  sponsorProfiles,
};
