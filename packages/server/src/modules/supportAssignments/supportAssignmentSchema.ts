import { sql } from "drizzle-orm";
import {
  check,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { usersTable } from "najm-auth/pg";

import { timestamps } from "../../database/columns";
import { supportAssignmentStatusEnum } from "../../database/enums";
import { children } from "../children/childSchema";
import { familyProfiles } from "../families/familySchema";
import { sponsorProfiles } from "../sponsors/sponsorSchema";

export const supportAssignments = pgTable(
  "support_assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sponsorProfileId: uuid("sponsor_profile_id")
      .notNull()
      .references(() => sponsorProfiles.id),
    familyProfileId: uuid("family_profile_id")
      .notNull()
      .references(() => familyProfiles.id),
    childId: uuid("child_id").references(() => children.id),
    status: supportAssignmentStatusEnum("status").default("active").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    assignedByUserId: text("assigned_by_user_id")
      .notNull()
      .references(() => usersTable.id),
    endedByUserId: text("ended_by_user_id").references(() => usersTable.id),
    notes: text("notes"),
    ...timestamps(),
  },
  (table) => [
    check(
      "support_assignments_ended_state_check",
      sql`(${table.status} = 'active' AND ${table.endedAt} IS NULL) OR (${table.status} = 'ended' AND ${table.endedAt} IS NOT NULL)`,
    ),
    index("support_assignments_sponsor_profile_id_idx").on(
      table.sponsorProfileId,
    ),
    index("support_assignments_family_profile_id_idx").on(
      table.familyProfileId,
    ),
    index("support_assignments_child_id_idx").on(table.childId),
    index("support_assignments_status_idx").on(table.status),
    uniqueIndex("support_assignments_active_family_unique")
      .on(table.sponsorProfileId, table.familyProfileId)
      .where(sql`${table.status} = 'active' AND ${table.childId} IS NULL`),
    uniqueIndex("support_assignments_active_child_unique")
      .on(table.sponsorProfileId, table.familyProfileId, table.childId)
      .where(sql`${table.status} = 'active' AND ${table.childId} IS NOT NULL`),
  ],
);

export type SupportAssignmentRecord = typeof supportAssignments.$inferSelect;
export type NewSupportAssignment = typeof supportAssignments.$inferInsert;

export const supportAssignmentSchema = {
  supportAssignments,
};
