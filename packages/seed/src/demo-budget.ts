import {
  budgetAccounts,
  budgetLedgerEntries,
  db,
} from "@kafil/server/database";
import { asc, eq, inArray } from "drizzle-orm";

export async function rebuildDemoBudgetSnapshots(
  familyProfileIds: readonly string[],
) {
  const uniqueFamilyProfileIds = [...new Set(familyProfileIds)];
  if (uniqueFamilyProfileIds.length === 0) return;

  await db.transaction(async (transaction) => {
    const accounts = await transaction
      .select({
        familyProfileId: budgetAccounts.familyProfileId,
        id: budgetAccounts.id,
      })
      .from(budgetAccounts)
      .where(inArray(budgetAccounts.familyProfileId, uniqueFamilyProfileIds))
      .for("update");

    for (const account of accounts) {
      const entries = await transaction
        .select()
        .from(budgetLedgerEntries)
        .where(eq(budgetLedgerEntries.budgetAccountId, account.id))
        .orderBy(asc(budgetLedgerEntries.createdAt), asc(budgetLedgerEntries.id))
        .for("update");
      let balance = {
        availableMinor: 0,
        reservedMinor: 0,
        spentMinor: 0,
      };

      for (const entry of entries) {
        balance = applyLedgerEntry(balance, entry);
        if (
          balance.availableMinor < 0 ||
          balance.reservedMinor < 0 ||
          balance.spentMinor < 0
        ) {
          throw new Error(
            `Demo history would make family '${account.familyProfileId}' negative at ledger entry '${entry.id}'.`,
          );
        }
        await transaction
          .update(budgetLedgerEntries)
          .set({
            availableAfterMinor: balance.availableMinor,
            reservedAfterMinor: balance.reservedMinor,
            spentAfterMinor: balance.spentMinor,
          })
          .where(eq(budgetLedgerEntries.id, entry.id));
      }
      await transaction
        .update(budgetAccounts)
        .set({ ...balance, updatedAt: new Date() })
        .where(eq(budgetAccounts.id, account.id));
    }
  });
}

function applyLedgerEntry(
  balance: {
    availableMinor: number;
    reservedMinor: number;
    spentMinor: number;
  },
  entry: {
    amountMinor: number;
    entryType: string;
  },
) {
  const next = { ...balance };
  if (
    entry.entryType === "contribution_credit" ||
    entry.entryType === "contribution_refund" ||
    entry.entryType === "manual_credit" ||
    entry.entryType === "manual_debit"
  ) {
    next.availableMinor += entry.amountMinor;
  } else if (
    entry.entryType === "order_reserve" ||
    entry.entryType === "order_release"
  ) {
    next.availableMinor += entry.amountMinor;
    next.reservedMinor -= entry.amountMinor;
  } else if (entry.entryType === "order_capture") {
    next.reservedMinor += entry.amountMinor;
    next.spentMinor -= entry.amountMinor;
  } else if (entry.entryType === "order_refund") {
    next.availableMinor += entry.amountMinor;
    next.spentMinor -= entry.amountMinor;
  } else {
    throw new Error(`Unsupported budget ledger entry '${entry.entryType}'.`);
  }
  return next;
}
