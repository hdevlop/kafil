import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "najm-auth/pg";

import { timestamps } from "./columns";

/**
 * Compatibility only — no application code may read or write this.
 *
 * AUTH-COOKIE-PLAN.md Move 4 deleted the access module, but the table is still
 * live: the Move 3 bridge mirrors it against `credential_setup_requirements`
 * so the previous release stays a safe rollback target. Move 6 drops it, and
 * this file goes with it.
 *
 * It stays in the Drizzle schema because removing the definition is what makes
 * `db:generate` emit a DROP, and Move 4 must produce no migration at all.
 */
export const familyPasswordRequirements = pgTable(
  "family_password_requirements",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    required: boolean("required").default(true).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ...timestamps(),
  },
);

export const legacyAccessSchema = {
  familyPasswordRequirements,
};
