import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  date,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { usersTable } from "najm-auth/pg";

import { timestamps } from "../../database/columns";
import { familyFundingStatusEnum } from "../../database/enums";

export const familyProfiles = pgTable(
  "family_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    guardianLegalName: text("guardian_legal_name").notNull(),
    guardianCin: varchar("guardian_cin", { length: 20 }).notNull().unique(),
    guardianDateOfBirth: date("guardian_date_of_birth"),
    exactAddress: text("exact_address").notNull(),
    phone: varchar("phone", { length: 40 }),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => usersTable.id),
    relationshipToChildren: varchar("relationship_to_children", { length: 120 }),
    notes: text("notes"),
    fundingTargetMinor: bigint("funding_target_minor", {
      mode: "number",
    }).notNull(),
    fundingStatus: familyFundingStatusEnum("funding_status")
      .default("pending_funding")
      .notNull(),
    fundingActivatedAt: timestamp("funding_activated_at", {
      withTimezone: true,
    }),
    ...timestamps(),
  },
  (table) => [
    check(
      "family_profiles_positive_funding_target_check",
      sql`${table.fundingTargetMinor} > 0`,
    ),
  ],
);

export type FamilyProfile = typeof familyProfiles.$inferSelect;
export type NewFamilyProfile = typeof familyProfiles.$inferInsert;

export const familySchema = {
  familyProfiles,
};
