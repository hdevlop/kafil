import { sql } from "drizzle-orm";
import {
  bigint,
  type AnyPgColumn,
  check,
  date,
  index,
  integer,
  pgTable,
  text,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { usersTable } from "najm-auth/pg";

import { timestamps } from "../../database/columns";
import { budgetLedgerEntryTypeEnum } from "../../database/enums";
import { familyProfiles } from "../families/familySchema";

const minorUnit = (name: string) => bigint(name, { mode: "number" });

export const budgetAccounts = pgTable(
  "budget_accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    familyProfileId: uuid("family_profile_id")
      .notNull()
      .unique()
      .references(() => familyProfiles.id),
    currency: varchar("currency", { length: 3 }).default("MAD").notNull(),
    availableMinor: minorUnit("available_minor").default(0).notNull(),
    reservedMinor: minorUnit("reserved_minor").default(0).notNull(),
    spentMinor: minorUnit("spent_minor").default(0).notNull(),
    version: integer("version").default(0).notNull(),
    ...timestamps(),
  },
  (table) => [
    check("budget_accounts_currency_check", sql`${table.currency} = 'MAD'`),
    check(
      "budget_accounts_non_negative_check",
      sql`${table.availableMinor} >= 0 AND ${table.reservedMinor} >= 0 AND ${table.spentMinor} >= 0`,
    ),
  ],
);

export const monthlyBudgetLimits = pgTable(
  "monthly_budget_limits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    budgetAccountId: uuid("budget_account_id")
      .notNull()
      .references(() => budgetAccounts.id),
    month: date("month").notNull(),
    limitMinor: minorUnit("limit_minor").notNull(),
    setByUserId: text("set_by_user_id")
      .notNull()
      .references(() => usersTable.id),
    reason: text("reason").notNull(),
    ...timestamps(),
  },
  (table) => [
    check("monthly_budget_limits_positive_check", sql`${table.limitMinor} > 0`),
    check(
      "monthly_budget_limits_first_day_check",
      sql`EXTRACT(DAY FROM ${table.month}) = 1`,
    ),
    uniqueIndex("monthly_budget_limits_account_month_unique").on(
      table.budgetAccountId,
      table.month,
    ),
  ],
);

export const budgetLedgerEntries = pgTable(
  "budget_ledger_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    budgetAccountId: uuid("budget_account_id")
      .notNull()
      .references(() => budgetAccounts.id),
    entryType: budgetLedgerEntryTypeEnum("entry_type").notNull(),
    amountMinor: minorUnit("amount_minor").notNull(),
    availableAfterMinor: minorUnit("available_after_minor").notNull(),
    reservedAfterMinor: minorUnit("reserved_after_minor").notNull(),
    spentAfterMinor: minorUnit("spent_after_minor").notNull(),
    sourceType: varchar("source_type", { length: 80 }).notNull(),
    sourceId: text("source_id").notNull(),
    idempotencyKey: varchar("idempotency_key", { length: 160 })
      .notNull()
      .unique(),
    actorUserId: text("actor_user_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    reason: text("reason"),
    reversesEntryId: uuid("reverses_entry_id").references(
      (): AnyPgColumn => budgetLedgerEntries.id,
    ),
    createdAt: timestamps().createdAt,
  },
  (table) => [
    check(
      "budget_ledger_entries_non_zero_amount_check",
      sql`${table.amountMinor} <> 0`,
    ),
    check(
      "budget_ledger_entries_non_negative_balances_check",
      sql`${table.availableAfterMinor} >= 0 AND ${table.reservedAfterMinor} >= 0 AND ${table.spentAfterMinor} >= 0`,
    ),
    index("budget_ledger_entries_account_created_at_idx").on(
      table.budgetAccountId,
      table.createdAt,
    ),
    index("budget_ledger_entries_source_idx").on(
      table.sourceType,
      table.sourceId,
    ),
  ],
);

export type BudgetAccount = typeof budgetAccounts.$inferSelect;
export type NewBudgetAccount = typeof budgetAccounts.$inferInsert;
export type MonthlyBudgetLimit = typeof monthlyBudgetLimits.$inferSelect;
export type NewMonthlyBudgetLimit = typeof monthlyBudgetLimits.$inferInsert;
export type BudgetLedgerEntry = typeof budgetLedgerEntries.$inferSelect;
export type NewBudgetLedgerEntry = typeof budgetLedgerEntries.$inferInsert;

export const budgetSchema = {
  budgetAccounts,
  budgetLedgerEntries,
  monthlyBudgetLimits,
};
