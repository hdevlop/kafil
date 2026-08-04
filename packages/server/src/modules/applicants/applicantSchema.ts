import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { usersTable } from "najm-auth/pg";

import { timestamps } from "../../database/columns";

export const applicantStatusEnum = pgEnum("applicant_status", [
  "pending_email_verification",
  "pending_review",
  "approved",
  "rejected",
]);

export const applicants = pgTable(
  "applicants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    authUserId: text("auth_user_id")
      .notNull()
      .unique()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    email: varchar("email", { length: 254 }).notNull(),
    phone: varchar("phone", { length: 40 }).notNull(),
    cin: varchar("cin", { length: 20 }).notNull(),
    gender: varchar("gender", { length: 1 }).notNull(),
    status: applicantStatusEnum("status")
      .notNull()
      .default("pending_email_verification"),
    submittedAt: timestamp("submitted_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedByUserId: text("reviewed_by_user_id").references(
      () => usersTable.id,
      { onDelete: "set null" },
    ),
    rejectionReason: text("rejection_reason"),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("applicants_email_unique").on(sql`lower(${table.email})`),
    uniqueIndex("applicants_cin_unique").on(sql`upper(${table.cin})`),
    uniqueIndex("applicants_phone_unique").on(table.phone),
    index("applicants_status_idx").on(table.status),
    check("applicants_gender_check", sql`${table.gender} IN ('M', 'F')`),
    check(
      "applicants_reviewer_consistency_check",
      sql`(${table.status} IN ('approved', 'rejected')) = (${table.reviewedByUserId} IS NOT NULL AND ${table.reviewedAt} IS NOT NULL)`,
    ),
    check(
      "applicants_rejection_reason_only_when_rejected",
      sql`(${table.rejectionReason} IS NULL OR ${table.status} = 'rejected') AND (${table.status} <> 'rejected' OR ${table.rejectionReason} IS NOT NULL)`,
    ),
  ],
);

export type Applicant = typeof applicants.$inferSelect;
export type NewApplicant = typeof applicants.$inferInsert;

export const applicantEmailOtpChallenges = pgTable(
  "applicant_email_otp_challenges",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    applicantId: uuid("applicant_id")
      .notNull()
      .references(() => applicants.id, { onDelete: "cascade" }),
    authUserId: text("auth_user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    codeHash: varchar("code_hash", { length: 64 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    resendAvailableAt: timestamp("resend_available_at", {
      withTimezone: true,
    }).notNull(),
    attemptsRemaining: integer("attempts_remaining").notNull().default(5),
    emailSent: boolean("email_sent").notNull().default(false),
    locale: varchar("locale", { length: 2 }).notNull().default("en"),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("applicant_email_otp_challenges_applicant_unique").on(
      table.applicantId,
    ),
    uniqueIndex("applicant_email_otp_challenges_user_unique").on(table.authUserId),
    index("applicant_email_otp_challenges_expires_idx").on(table.expiresAt),
    check(
      "applicant_email_otp_challenges_attempts_check",
      sql`${table.attemptsRemaining} >= 0`,
    ),
  ],
);

export type ApplicantEmailOtpChallenge = typeof applicantEmailOtpChallenges.$inferSelect;
export type NewApplicantEmailOtpChallenge =
  typeof applicantEmailOtpChallenges.$inferInsert;

export const applicantSchema = {
  applicantStatusEnum,
  applicants,
  applicantEmailOtpChallenges,
};
