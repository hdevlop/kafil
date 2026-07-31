import { date, index, pgTable, text, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "najm-auth/pg";

import { timestamps } from "../../database/columns";
import { genderEnum, staffAffiliationEnum, staffStatusEnum } from "../../database/enums";

export const staffProfiles = pgTable(
  "staff_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .unique()
      .references(() => usersTable.id, { onDelete: "set null" }),
    name: varchar("name", { length: 120 }).notNull(),
    contactEmail: varchar("contact_email", { length: 254 }),
    phone: varchar("phone", { length: 40 }).notNull().unique(),
    image: text("image"),
    affiliation: staffAffiliationEnum("affiliation").notNull().default("internal"),
    companyName: varchar("company_name", { length: 160 }),
    cin: varchar("cin", { length: 20 }).unique(),
    gender: genderEnum("gender"),
    address: text("address"),
    dateOfBirth: date("date_of_birth"),
    jobTitle: varchar("job_title", { length: 120 }),
    status: staffStatusEnum("status").notNull().default("active"),
    notes: text("notes"),
    ...timestamps(),
  },
  (table) => [
    index("staff_profiles_status_idx").on(table.status),
    index("staff_profiles_affiliation_idx").on(table.affiliation),
    index("staff_profiles_name_idx").on(table.name),
  ],
);

export type StaffProfile = typeof staffProfiles.$inferSelect;
export type NewStaffProfile = typeof staffProfiles.$inferInsert;

export const staffFunctions = pgTable(
  "staff_functions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    staffProfileId: uuid("staff_profile_id")
      .notNull()
      .references(() => staffProfiles.id, { onDelete: "cascade" }),
    functionKey: varchar("function_key", { length: 32 }).notNull(),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("staff_functions_profile_function_unique").on(
      table.staffProfileId,
      table.functionKey,
    ),
    index("staff_functions_function_key_idx").on(table.functionKey),
  ],
);

export type StaffFunction = typeof staffFunctions.$inferSelect;
export type NewStaffFunction = typeof staffFunctions.$inferInsert;

export const staffSchema = {
  staffFunctions,
  staffProfiles,
};