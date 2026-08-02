import { sql } from "drizzle-orm";
import { boolean, check, index, integer, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
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

export const sponsorEmailOtpChallenges = pgTable(
  "sponsor_email_otp_challenges",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    codeHash: varchar("code_hash", { length: 64 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    resendAvailableAt: timestamp("resend_available_at", { withTimezone: true }).notNull(),
    attemptsRemaining: integer("attempts_remaining").notNull().default(5),
    rememberMe: boolean("remember_me").notNull().default(false),
    emailSent: boolean("email_sent").notNull().default(false),
    locale: varchar("locale", { length: 2 }).notNull().default("en"),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("sponsor_email_otp_challenges_user_unique").on(table.userId),
    index("sponsor_email_otp_challenges_expires_idx").on(table.expiresAt),
    check("sponsor_email_otp_challenges_attempts_check", sql`${table.attemptsRemaining} >= 0`),
  ],
);

export type NewSponsorEmailOtpChallenge =
  typeof sponsorEmailOtpChallenges.$inferInsert;

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
  sponsorEmailOtpChallenges,
  familyPasswordRequirements,
};
