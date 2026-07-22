import { date, index, pgTable, text, uuid, varchar } from "drizzle-orm/pg-core";

import { timestamps } from "../../database/columns";
import { childStatusEnum, genderEnum } from "../../database/enums";
import { familyProfiles } from "../families/familySchema";

export const children = pgTable(
  "children",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    familyProfileId: uuid("family_profile_id")
      .notNull()
      .references(() => familyProfiles.id),
    legalName: text("legal_name").notNull(),
    dateOfBirth: date("date_of_birth").notNull(),
    gender: genderEnum("gender").notNull(),
    schoolLevel: varchar("school_level", { length: 120 }),
    clothingSize: varchar("clothing_size", { length: 40 }),
    shoeSize: varchar("shoe_size", { length: 40 }),
    notes: text("notes"),
    status: childStatusEnum("status").default("active").notNull(),
    ...timestamps(),
  },
  (table) => [
    index("children_family_profile_id_idx").on(table.familyProfileId),
    index("children_family_profile_status_idx").on(
      table.familyProfileId,
      table.status,
    ),
  ],
);

export type ChildRecord = typeof children.$inferSelect;
export type NewChild = typeof children.$inferInsert;

export const childSchema = {
  children,
};
