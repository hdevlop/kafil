import { and, asc, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { usersTable } from "najm-auth/pg";
import { Repository } from "najm-core";
import { DB } from "najm-database";

import type { KafilDatabase } from "../../database/types";
import { contributions } from "../contributions/contributionSchema";
import { sponsorProfiles } from "../sponsors/sponsorSchema";
import {
  budgetAccounts,
  budgetLedgerEntries,
  type MonthlyBudgetLimit,
  monthlyBudgetLimits,
  type NewBudgetLedgerEntry,
} from "./budgetSchema";
import { applyBudgetBalanceDelta, type BudgetBalance } from "./money";

const budgetLedgerSelection = {
  id: budgetLedgerEntries.id,
  budgetAccountId: budgetLedgerEntries.budgetAccountId,
  entryType: budgetLedgerEntries.entryType,
  amountMinor: budgetLedgerEntries.amountMinor,
  availableAfterMinor: budgetLedgerEntries.availableAfterMinor,
  reservedAfterMinor: budgetLedgerEntries.reservedAfterMinor,
  spentAfterMinor: budgetLedgerEntries.spentAfterMinor,
  sourceType: budgetLedgerEntries.sourceType,
  sourceId: budgetLedgerEntries.sourceId,
  idempotencyKey: budgetLedgerEntries.idempotencyKey,
  actorUserId: budgetLedgerEntries.actorUserId,
  reason: budgetLedgerEntries.reason,
  reversesEntryId: budgetLedgerEntries.reversesEntryId,
  createdAt: budgetLedgerEntries.createdAt,
  sponsorName: usersTable.name,
  sponsorImage: usersTable.image,
  sponsorGender: sponsorProfiles.gender,
  sponsorPhone: sponsorProfiles.phone,
  contributionStatus: contributions.status,
  paymentMethod: contributions.paymentMethod,
  externalReference: contributions.externalReference,
};

@Repository("default")
export class BudgetAccountRepository {
  @DB() private db!: KafilDatabase;

  async findByFamilyId(familyProfileId: string) {
    const [account] = await this.db
      .select()
      .from(budgetAccounts)
      .where(eq(budgetAccounts.familyProfileId, familyProfileId))
      .limit(1);
    return account;
  }

  async createForFamily(familyProfileId: string) {
    await this.db
      .insert(budgetAccounts)
      .values({ familyProfileId })
      .onConflictDoNothing({ target: budgetAccounts.familyProfileId });
    return this.findByFamilyId(familyProfileId);
  }

  async lockByFamilyId(familyProfileId: string) {
    const [account] = await this.db
      .select()
      .from(budgetAccounts)
      .where(eq(budgetAccounts.familyProfileId, familyProfileId))
      .limit(1)
      .for("update");
    return account;
  }

  async updateBalances(id: string, balance: BudgetBalance) {
    const [account] = await this.db
      .update(budgetAccounts)
      .set({
        ...balance,
        version: sql`${budgetAccounts.version} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(budgetAccounts.id, id))
      .returning();
    return account;
  }
}

@Repository("default")
export class BudgetLedgerRepository {
  @DB() private db!: KafilDatabase;

  async findByIdempotencyKey(idempotencyKey: string) {
    const [entry] = await this.db
      .select()
      .from(budgetLedgerEntries)
      .where(eq(budgetLedgerEntries.idempotencyKey, idempotencyKey))
      .limit(1);
    return entry;
  }

  listByAccountId(budgetAccountId: string, limit: number, offset: number) {
    return this.db
      .select(budgetLedgerSelection)
      .from(budgetLedgerEntries)
      .leftJoin(
        contributions,
        and(
          eq(budgetLedgerEntries.sourceType, "contribution"),
          sql`${budgetLedgerEntries.sourceId} = ${contributions.id}::text`,
        ),
      )
      .leftJoin(
        sponsorProfiles,
        eq(contributions.sponsorProfileId, sponsorProfiles.id),
      )
      .leftJoin(usersTable, eq(sponsorProfiles.userId, usersTable.id))
      .where(eq(budgetLedgerEntries.budgetAccountId, budgetAccountId))
      .orderBy(desc(budgetLedgerEntries.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async findLatestByAccountId(budgetAccountId: string) {
    const [entry] = await this.db
      .select()
      .from(budgetLedgerEntries)
      .where(eq(budgetLedgerEntries.budgetAccountId, budgetAccountId))
      .orderBy(desc(budgetLedgerEntries.createdAt))
      .limit(1);
    return entry;
  }

  async monthlyOrderUsage(budgetAccountId: string, month: string) {
    const startsAt = new Date(`${month}T00:00:00.000Z`);
    const endsAt = new Date(
      Date.UTC(startsAt.getUTCFullYear(), startsAt.getUTCMonth() + 1, 1),
    );
    const [result] = await this.db
      .select({
        amount: sql<number>`coalesce(sum(${budgetLedgerEntries.amountMinor}), 0)::bigint`,
      })
      .from(budgetLedgerEntries)
      .where(
        and(
          eq(budgetLedgerEntries.budgetAccountId, budgetAccountId),
          inArray(budgetLedgerEntries.entryType, [
            "order_reserve",
            "order_release",
            "order_refund",
          ]),
          gte(budgetLedgerEntries.createdAt, startsAt),
          lt(budgetLedgerEntries.createdAt, endsAt),
        ),
      );
    return Math.max(0, -Number(result?.amount ?? 0));
  }

  async validatedFundingTotal(budgetAccountId: string) {
    const [result] = await this.db
      .select({
        amount: sql<number>`coalesce(sum(${budgetLedgerEntries.amountMinor}), 0)::bigint`,
      })
      .from(budgetLedgerEntries)
      .where(
        and(
          eq(budgetLedgerEntries.budgetAccountId, budgetAccountId),
          inArray(budgetLedgerEntries.entryType, [
            "contribution_credit",
            "contribution_refund",
          ]),
        ),
      );
    return Math.max(0, Number(result?.amount ?? 0));
  }

  async validatedFundingTotalsByFamily(familyProfileIds: string[]) {
    if (familyProfileIds.length === 0) return [];

    return this.db
      .select({
        familyProfileId: budgetAccounts.familyProfileId,
        amount: sql<number>`coalesce(sum(${budgetLedgerEntries.amountMinor}), 0)::bigint`,
      })
      .from(budgetAccounts)
      .leftJoin(
        budgetLedgerEntries,
        and(
          eq(budgetLedgerEntries.budgetAccountId, budgetAccounts.id),
          inArray(budgetLedgerEntries.entryType, [
            "contribution_credit",
            "contribution_refund",
          ]),
        ),
      )
      .where(inArray(budgetAccounts.familyProfileId, familyProfileIds))
      .groupBy(budgetAccounts.familyProfileId);
  }

  async append(data: NewBudgetLedgerEntry) {
    const [entry] = await this.db
      .insert(budgetLedgerEntries)
      .values(data)
      .returning();
    return entry;
  }

  /**
   * Bootstrap-admin correction only: remove a fully reversed contribution pair
   * and rebuild the remaining ledger snapshots in chronological order.
   */
  async eraseContributionEntries(input: {
    budgetAccountId: string;
    creditEntryId: string;
    refundEntryId: string;
  }) {
    await this.db
      .delete(budgetLedgerEntries)
      .where(
        and(
          eq(budgetLedgerEntries.id, input.refundEntryId),
          eq(budgetLedgerEntries.budgetAccountId, input.budgetAccountId),
        ),
      );
    await this.db
      .delete(budgetLedgerEntries)
      .where(
        and(
          eq(budgetLedgerEntries.id, input.creditEntryId),
          eq(budgetLedgerEntries.budgetAccountId, input.budgetAccountId),
        ),
      );

    const entries = await this.db
      .select()
      .from(budgetLedgerEntries)
      .where(eq(budgetLedgerEntries.budgetAccountId, input.budgetAccountId))
      .orderBy(asc(budgetLedgerEntries.createdAt), asc(budgetLedgerEntries.id))
      .for("update");

    let balance: BudgetBalance = {
      availableMinor: 0,
      reservedMinor: 0,
      spentMinor: 0,
    };
    for (const entry of entries) {
      balance = applyLedgerEntry(balance, entry);
      await this.db
        .update(budgetLedgerEntries)
        .set({
          availableAfterMinor: balance.availableMinor,
          reservedAfterMinor: balance.reservedMinor,
          spentAfterMinor: balance.spentMinor,
        })
        .where(eq(budgetLedgerEntries.id, entry.id));
    }
    return balance;
  }
}

function applyLedgerEntry(
  balance: BudgetBalance,
  entry: Pick<
    typeof budgetLedgerEntries.$inferSelect,
    "entryType" | "amountMinor"
  >,
) {
  switch (entry.entryType) {
    case "contribution_credit":
    case "contribution_refund":
    case "manual_credit":
    case "manual_debit":
      return applyBudgetBalanceDelta(balance, {
        availableMinor: entry.amountMinor,
      });
    case "order_reserve":
      return applyBudgetBalanceDelta(balance, {
        availableMinor: entry.amountMinor,
        reservedMinor: -entry.amountMinor,
      });
    case "order_capture":
      return applyBudgetBalanceDelta(balance, {
        reservedMinor: entry.amountMinor,
        spentMinor: -entry.amountMinor,
      });
    case "order_release":
      return applyBudgetBalanceDelta(balance, {
        availableMinor: entry.amountMinor,
        reservedMinor: -entry.amountMinor,
      });
    case "order_refund":
      return applyBudgetBalanceDelta(balance, {
        availableMinor: entry.amountMinor,
        spentMinor: -entry.amountMinor,
      });
  }
}

@Repository("default")
export class MonthlyBudgetLimitRepository {
  @DB() private db!: KafilDatabase;

  async findByAccountAndMonth(budgetAccountId: string, month: string) {
    const [limit] = await this.db
      .select()
      .from(monthlyBudgetLimits)
      .where(
        sql`${monthlyBudgetLimits.budgetAccountId} = ${budgetAccountId} AND ${monthlyBudgetLimits.month} = ${month}`,
      )
      .limit(1);
    return limit;
  }

  async set(input: {
    budgetAccountId: string;
    limitMinor: number;
    month: string;
    reason: string;
    setByUserId: string;
  }) {
    const [limit] = await this.db
      .insert(monthlyBudgetLimits)
      .values(input)
      .onConflictDoUpdate({
        target: [
          monthlyBudgetLimits.budgetAccountId,
          monthlyBudgetLimits.month,
        ],
        set: {
          limitMinor: input.limitMinor,
          reason: input.reason,
          setByUserId: input.setByUserId,
          updatedAt: new Date(),
        },
      })
      .returning();
    return limit as MonthlyBudgetLimit;
  }
}
