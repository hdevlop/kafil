import {
  bigint,
  pgEnum,
  pgTable,
  text,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { usersTable } from "najm-auth/pg";

import { timestamps } from "../../database/columns";
import { familyProfiles } from "../families/familySchema";

export const documentClassification = pgEnum("document_classification", [
  "identity",
  "verification",
]);

export const documentObjects = pgTable("document_objects", {
  id: uuid("id").defaultRandom().primaryKey(),
  familyProfileId: uuid("family_profile_id")
    .notNull()
    .references(() => familyProfiles.id),
  classification: documentClassification("classification").notNull(),
  storagePath: text("storage_path").notNull().unique(),
  mediaType: varchar("media_type", { length: 160 }).notNull(),
  byteSize: bigint("byte_size", { mode: "number" }).notNull(),
  createdByUserId: text("created_by_user_id")
    .notNull()
    .references(() => usersTable.id),
  ...timestamps(),
});

export type DocumentObject = typeof documentObjects.$inferSelect;
export type NewDocumentObject = typeof documentObjects.$inferInsert;

export const documentSchema = {
  documentObjects,
};
