import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { usersTable } from "najm-auth/pg";

import { timestamps } from "../../database/columns";
import {
  contributionPlanKindEnum,
  contributionPlanStatusEnum,
  contributionStatusEnum,
} from "../../database/enums";
import { familyProfiles } from "../families/familySchema";
import { sponsorProfiles } from "../sponsors/sponsorSchema";
import { supportAssignments } from "../supportAssignments/supportAssignmentSchema";

const minorUnit = (name: string) => bigint(name, { mode: "number" });

export const contributionPlans = pgTable(
  "contribution_plans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    supportAssignmentId: uuid("support_assignment_id")
      .notNull()
      .references(() => supportAssignments.id),
    kind: contributionPlanKindEnum("kind").notNull(),
    amountMinor: minorUnit("amount_minor").notNull(),
    currency: varchar("currency", { length: 3 }).default("MAD").notNull(),
    status: contributionPlanStatusEnum("status").default("active").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    nextDueAt: timestamp("next_due_at", { withTimezone: true }),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    ...timestamps(),
  },
  (table) => [
    check("contribution_plans_currency_check", sql`${table.currency} = 'MAD'`),
    check(
      "contribution_plans_positive_amount_check",
      sql`${table.amountMinor} > 0`,
    ),
    index("contribution_plans_assignment_status_idx").on(
      table.supportAssignmentId,
      table.status,
    ),
  ],
);

export const contributions = pgTable(
  "contributions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    contributionPlanId: uuid("contribution_plan_id").references(
      () => contributionPlans.id,
    ),
    supportAssignmentId: uuid("support_assignment_id")
      .notNull()
      .references(() => supportAssignments.id),
    sponsorProfileId: uuid("sponsor_profile_id")
      .notNull()
      .references(() => sponsorProfiles.id),
    familyProfileId: uuid("family_profile_id")
      .notNull()
      .references(() => familyProfiles.id),
    amountMinor: minorUnit("amount_minor").notNull(),
    currency: varchar("currency", { length: 3 }).default("MAD").notNull(),
    paymentMethod: varchar("payment_method", { length: 80 }).notNull(),
    externalReference: varchar("external_reference", { length: 160 }),
    status: contributionStatusEnum("status").default("pending").notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    validatedByUserId: text("validated_by_user_id").references(
      () => usersTable.id,
    ),
    validatedAt: timestamp("validated_at", { withTimezone: true }),
    rejectedByUserId: text("rejected_by_user_id").references(
      () => usersTable.id,
    ),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    rejectionReason: text("rejection_reason"),
    ...timestamps(),
  },
  (table) => [
    check("contributions_currency_check", sql`${table.currency} = 'MAD'`),
    check(
      "contributions_positive_amount_check",
      sql`${table.amountMinor} > 0`,
    ),
    index("contributions_assignment_status_idx").on(
      table.supportAssignmentId,
      table.status,
    ),
    index("contributions_sponsor_status_idx").on(
      table.sponsorProfileId,
      table.status,
    ),
    index("contributions_family_status_idx").on(
      table.familyProfileId,
      table.status,
    ),
  ],
);

export type ContributionPlan = typeof contributionPlans.$inferSelect;
export type NewContributionPlan = typeof contributionPlans.$inferInsert;
export type ContributionRecord = typeof contributions.$inferSelect;
export type NewContribution = typeof contributions.$inferInsert;

export const contributionSchema = {
  contributionPlans,
  contributions,
};
