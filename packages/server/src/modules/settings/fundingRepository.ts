import { and, asc, eq, gt, inArray, sql } from "drizzle-orm";
import { Repository } from "najm-core";
import { DB } from "najm-database";

import type { KafilDatabase } from "../../database/types";
import { contributions } from "../contributions/contributionSchema";

export interface LivePendingTotal {
  amountMinor: number;
}

export interface LivePendingExpiry {
  contributionId: string;
  expiresAt: Date;
  amountMinor: number;
}

@Repository("default")
export class FundingRepository {
  @DB() private db!: KafilDatabase;

  livePendingTotalForFamily(familyProfileId: string, now: Date) {
    return this.db
      .select({
        amountMinor: sql<number>`coalesce(sum(${contributions.amountMinor}), 0)::bigint`,
      })
      .from(contributions)
      .where(
        and(
          eq(contributions.familyProfileId, familyProfileId),
          eq(contributions.status, "pending"),
          gt(contributions.expiresAt, now),
        ),
      )
      .then((rows) => ({
        amountMinor: Number(rows[0]?.amountMinor ?? 0),
      }));
  }

  /**
   * Like {@link livePendingTotalForFamily} but excludes one specific
   * contribution ID. Used by `ContributionService.validate()` to avoid
   * counting the row's own reservation against itself.
   */
  livePendingTotalForFamilyExcluding(
    familyProfileId: string,
    now: Date,
    excludeContributionId: string,
  ) {
    return this.db
      .select({
        amountMinor: sql<number>`coalesce(sum(${contributions.amountMinor}), 0)::bigint`,
      })
      .from(contributions)
      .where(
        and(
          eq(contributions.familyProfileId, familyProfileId),
          eq(contributions.status, "pending"),
          gt(contributions.expiresAt, now),
          sql`${contributions.id} <> ${excludeContributionId}`,
        ),
      )
      .then((rows) => ({
        amountMinor: Number(rows[0]?.amountMinor ?? 0),
      }));
  }

  livePendingTotalsForFamilies(
    familyProfileIds: string[],
    now: Date,
  ): Promise<Array<{ familyProfileId: string; amountMinor: number }>> {
    if (familyProfileIds.length === 0) return Promise.resolve([]);
    return this.db
      .select({
        familyProfileId: contributions.familyProfileId,
        amountMinor: sql<number>`coalesce(sum(${contributions.amountMinor}), 0)::bigint`,
      })
      .from(contributions)
      .where(
        and(
          inArray(contributions.familyProfileId, familyProfileIds),
          eq(contributions.status, "pending"),
          gt(contributions.expiresAt, now),
        ),
      )
      .groupBy(contributions.familyProfileId)
      .then((rows) =>
        rows.map((row) => ({
          ...row,
          amountMinor: Number(row.amountMinor),
        })),
      );
  }

  earliestPendingExpiry(
    familyProfileId: string,
    now: Date,
  ): Promise<LivePendingExpiry | null> {
    return this.db
      .select({
        contributionId: contributions.id,
        expiresAt: contributions.expiresAt,
        amountMinor: contributions.amountMinor,
      })
      .from(contributions)
      .where(
        and(
          eq(contributions.familyProfileId, familyProfileId),
          eq(contributions.status, "pending"),
          gt(contributions.expiresAt, now),
        ),
      )
      .orderBy(asc(contributions.expiresAt))
      .limit(1)
      .then((rows) => rows[0] ?? null);
  }

  earliestPendingExpiries(
    familyProfileIds: string[],
    now: Date,
  ): Promise<Array<LivePendingExpiry & { familyProfileId: string }>> {
    if (familyProfileIds.length === 0) return Promise.resolve([]);
    return this.db
      .selectDistinctOn([contributions.familyProfileId], {
        familyProfileId: contributions.familyProfileId,
        contributionId: contributions.id,
        expiresAt: contributions.expiresAt,
        amountMinor: contributions.amountMinor,
      })
      .from(contributions)
      .where(
        and(
          inArray(contributions.familyProfileId, familyProfileIds),
          eq(contributions.status, "pending"),
          gt(contributions.expiresAt, now),
        ),
      )
      .orderBy(
        contributions.familyProfileId,
        asc(contributions.expiresAt),
      );
  }

  duePendingContributionIds(
    now: Date,
    limit: number,
  ): Promise<Array<{ id: string; familyProfileId: string; amountMinor: number; expiresAt: Date }>> {
    return this.db
      .select({
        id: contributions.id,
        familyProfileId: contributions.familyProfileId,
        amountMinor: contributions.amountMinor,
        expiresAt: contributions.expiresAt,
      })
      .from(contributions)
      .where(
        and(
          eq(contributions.status, "pending"),
          sql`${contributions.expiresAt} <= ${now.toISOString()}::timestamptz`,
        ),
      )
      .orderBy(asc(contributions.expiresAt))
      .limit(limit)
      .for("update", { skipLocked: true });
  }

  contributionFamiliesWithLivePending(now: Date): Promise<string[]> {
    return this.db
      .selectDistinct({ familyProfileId: contributions.familyProfileId })
      .from(contributions)
      .where(
        and(
          eq(contributions.status, "pending"),
          gt(contributions.expiresAt, now),
        ),
      )
      .then((rows) => rows.map((row) => row.familyProfileId));
  }
}
