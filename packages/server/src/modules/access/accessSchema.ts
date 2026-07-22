import { boolean, index, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "najm-auth/pg";

import { timestamps } from "../../database/columns";

export const emailVerificationTokens = pgTable(
  "email_verification_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    ...timestamps(),
  },
  (table) => [index("email_verification_tokens_user_idx").on(table.userId)],
);

export type NewEmailVerificationToken =
  typeof emailVerificationTokens.$inferInsert;

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

export const accessSchema = {
  emailVerificationTokens,
  familyPasswordRequirements,
};
