import { date, pgTable, text, uuid, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "najm-auth/pg";

import { timestamps } from "../../database/columns";
import { genderEnum } from "../../database/enums";

export const operatorProfiles = pgTable("operator_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  phone: varchar("phone", { length: 40 }).unique(),
  // Existing deployments retain this field until a separately audited cleanup.
  legacyPreferredLanguage: varchar("preferred_language", { length: 12 })
    .notNull()
    .default("en"),
  // New profiles must provide these values through the DTO; legacy profiles are
  // completed through the operator backfill workflow before enforcement.
  cin: varchar("cin", { length: 20 }).unique(),
  gender: genderEnum("gender"),
  address: text("address"),
  dateOfBirth: date("date_of_birth"),
  jobTitle: varchar("job_title", { length: 120 }),
  notes: text("notes"),
  ...timestamps(),
});

export type OperatorProfile = typeof operatorProfiles.$inferSelect;
export type NewOperatorProfile = typeof operatorProfiles.$inferInsert;

export const operatorSchema = {
  operatorProfiles,
};
