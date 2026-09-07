import { and, asc, desc, eq, gt, isNull, lte, or, sql } from "drizzle-orm";
import { Repository } from "najm-core";
import { DB } from "najm-database";
import { usersTable } from "najm-auth/pg";

import type { KafilDatabase } from "../../database/types";
import { applicants } from "../applicants/applicantSchema";
import { contributions } from "../contributions/contributionSchema";
import { familyProfiles } from "../families/familySchema";
import { orders } from "../orders/orderSchema";
import { outboxEvents } from "../outbox/outboxSchema";
import { sponsorProfiles } from "../sponsors/sponsorSchema";
import { supportAssignments } from "../supportAssignments/supportAssignmentSchema";
import {
  notificationDeliveries,
  notificationSettings,
  notifications,
  outboxConsumerJobs,
  pushSubscriptions,
  type NewNotification,
  type NewNotificationDelivery,
  type NewPushSubscription,
} from "./notificationSchema";
import {
  NOTIFICATION_LEASE_MINUTES,
  NOTIFICATION_MAX_ATTEMPTS,
  NOTIFICATION_RETRY_DELAYS_MINUTES,
} from "./notificationConfig";

export interface NotificationCursor {
  createdAt: string;
  id: string;
}

export function encodeCursor(createdAt: Date | string, id: string) {
  const at = createdAt instanceof Date ? createdAt.toISOString() : createdAt;
  return Buffer.from(`${at}|${id}`, "utf8").toString("base64url");
}

/**
 * Raw `db.execute` rows keep PostgreSQL snake_case keys; drizzle's
 * camelCase mapping only applies to the query builder. The claim loops must
 * translate explicitly because the dispatcher and worker read camelCase
 * fields (a missing translation dead-letters every job as missing_event).
 */
function toConsumerJob(row: Record<string, unknown>) {
  return {
    id: row["id"] as string,
    outboxEventId: row["outbox_event_id"] as string,
    consumerKey: row["consumer_key"] as string,
    status: row["status"] as string,
    attempts: Number(row["attempts"] ?? 0),
    availableAt: row["available_at"] as Date,
    leasedAt: (row["leased_at"] as Date | null) ?? null,
    processedAt: (row["processed_at"] as Date | null) ?? null,
    lastErrorCode: (row["last_error_code"] as string | null) ?? null,
    createdAt: row["created_at"] as Date,
    updatedAt: row["updated_at"] as Date,
  };
}

function toDelivery(row: Record<string, unknown>) {
  return {
    id: row["id"] as string,
    notificationId: row["notification_id"] as string,
    channel: row["channel"] as string,
    targetKey: row["target_key"] as string,
    pushSubscriptionId: (row["push_subscription_id"] as string | null) ?? null,
    status: row["status"] as string,
    attempts: Number(row["attempts"] ?? 0),
    availableAt: row["available_at"] as Date,
    leasedAt: (row["leased_at"] as Date | null) ?? null,
    processedAt: (row["processed_at"] as Date | null) ?? null,
    lastErrorCode: (row["last_error_code"] as string | null) ?? null,
    createdAt: row["created_at"] as Date,
    updatedAt: row["updated_at"] as Date,
  };
}

export function decodeCursor(cursor: string): NotificationCursor | null {
  try {
    const raw = Buffer.from(cursor, "base64url").toString("utf8");
    const separator = raw.lastIndexOf("|");
    if (separator <= 0) return null;
    const createdAt = raw.slice(0, separator);
    const id = raw.slice(separator + 1);
    if (!createdAt || !id) return null;
    const time = Date.parse(createdAt);
    if (!Number.isFinite(time)) return null;
    return { createdAt: new Date(time).toISOString(), id: id.slice(0, 100) };
  } catch {
    return null;
  }
}

@Repository("default")
export class NotificationRepository {
  @DB() private db!: KafilDatabase;

  async listMine(
    userId: string,
    options: { limit: number; cursor?: string; unread?: boolean; topic?: string },
  ) {
    const { limit, unread, topic } = options;
    const cursor = options.cursor ? decodeCursor(options.cursor) : null;
    const conditions = [eq(notifications.recipientUserId, userId)];
    if (unread === true) conditions.push(isNull(notifications.readAt));
    if (unread === false) conditions.push(sql`${notifications.readAt} IS NOT NULL`);
    if (topic) conditions.push(eq(notifications.topic, topic.slice(0, 120)));
    if (cursor) {
      conditions.push(
        sql`(${notifications.createdAt}, ${notifications.id}) < (${cursor.createdAt}::timestamptz, ${cursor.id}::uuid)`,
      );
    }
    const rows = await this.db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt), desc(notifications.id))
      .limit(limit + 1);
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const last = page[page.length - 1];
    return {
      rows: page,
      nextCursor:
        hasMore && last
          ? encodeCursor(last.createdAt, last.id)
          : null,
    };
  }

  async unreadCount(userId: string) {
    const [row] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(
        and(
          eq(notifications.recipientUserId, userId),
          isNull(notifications.readAt),
        ),
      );
    return row?.count ?? 0;
  }

  async findOwn(id: string, userId: string) {
    const [row] = await this.db
      .select()
      .from(notifications)
      .where(
        and(eq(notifications.id, id), eq(notifications.recipientUserId, userId)),
      )
      .limit(1);
    return row;
  }

  /** Write-once: NULL -> timestamp; already-read rows return untouched. */
  async markRead(id: string, userId: string, readAt: Date) {
    const [row] = await this.db
      .update(notifications)
      .set({ readAt, updatedAt: readAt })
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.recipientUserId, userId),
          isNull(notifications.readAt),
        ),
      )
      .returning();
    if (row) return { row, updated: true as const };
    const existing = await this.findOwn(id, userId);
    if (!existing) return { row: undefined, updated: false as const, missing: true as const };
    return { row: existing, updated: false as const };
  }

  /**
   * One scoped SQL statement. Statement-snapshot semantics mean rows
   * inserted concurrently but invisible to the snapshot stay unread; the
   * returned count is the exact affected count, never looped to zero.
   */
  async markAllRead(userId: string, readAt: Date) {
    const result = await this.db.execute(sql`
      UPDATE "notifications"
      SET "read_at" = ${readAt}, "updated_at" = ${readAt}
      WHERE "recipient_user_id" = ${userId} AND "read_at" IS NULL
    `);
    return typeof result.rowCount === "number" ? result.rowCount : 0;
  }

  async createNotifications(rows: NewNotification[]) {
    if (rows.length === 0) return [];
    return this.db
      .insert(notifications)
      .values(rows)
      .onConflictDoNothing({
        target: [notifications.sourceEventId, notifications.recipientUserId],
      })
      .returning();
  }

  async getSettings(userId: string) {
    const [row] = await this.db
      .select()
      .from(notificationSettings)
      .where(eq(notificationSettings.userId, userId))
      .limit(1);
    return row;
  }

  async upsertSettings(userId: string, locale: string, at: Date) {
    const [row] = await this.db
      .insert(notificationSettings)
      .values({ userId, locale, createdAt: at, updatedAt: at })
      .onConflictDoUpdate({
        target: notificationSettings.userId,
        set: { locale, updatedAt: at },
      })
      .returning();
    return row;
  }

  async findUserForDelivery(userId: string) {
    const [row] = await this.db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        emailVerified: usersTable.emailVerified,
        status: usersTable.status,
      })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);
    return row;
  }

  // -- consumer jobs -------------------------------------------------------

  async claimConsumerJobs(limit: number) {
    // Dead-letter anything that already exhausted the six-attempt ceiling but
    // never ran markConsumerFailed (e.g. a worker crash after claim), so a
    // stale lease can never retry forever.
    await this.db.execute(sql`
      UPDATE "outbox_consumer_jobs"
      SET "status" = 'dead',
          "processed_at" = now(),
          "last_error_code" = 'max_attempts_exceeded',
          "updated_at" = now()
      WHERE "attempts" >= ${NOTIFICATION_MAX_ATTEMPTS}
        AND "status" IN ('pending', 'failed', 'processing')
        AND (
          "status" IN ('pending', 'failed')
          OR "leased_at" <= now() - (${NOTIFICATION_LEASE_MINUTES} || ' minutes')::interval
        )
    `);
    const rows = await this.db.execute(sql`
      UPDATE "outbox_consumer_jobs" AS job
      SET "status" = 'processing',
          "leased_at" = now(),
          "attempts" = job."attempts" + 1,
          "updated_at" = now()
      WHERE job."id" IN (
        SELECT id FROM "outbox_consumer_jobs"
        WHERE (
          ("status" = 'pending')
          OR ("status" = 'failed' AND "available_at" <= now())
          OR ("status" = 'processing' AND "leased_at" <= now() - (${NOTIFICATION_LEASE_MINUTES} || ' minutes')::interval)
        )
        AND "available_at" <= now()
        AND "attempts" < ${NOTIFICATION_MAX_ATTEMPTS}
        ORDER BY "available_at" ASC, "id" ASC
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING job.*
    `);
    return (rows.rows as Array<Record<string, unknown>>).map(toConsumerJob);
  }

  async loadOutboxEvent(id: string) {
    const [row] = await this.db
      .select()
      .from(outboxEvents)
      .where(eq(outboxEvents.id, id))
      .limit(1);
    return row;
  }

  /**
   * One atomic statement marks the consumer job sent and completes the
   * parent outbox event together. A failure anywhere in the statement
   * leaves a processing job attached to a pending event (recoverable via
   * lease recovery) instead of a sent job attached to a pending event.
   */
  async markConsumerSent(id: string, at: Date) {
    await this.db.execute(sql`
      WITH job AS (
        UPDATE "outbox_consumer_jobs"
        SET "status" = 'sent',
            "processed_at" = ${at},
            "last_error_code" = NULL,
            "updated_at" = ${at}
        WHERE "id" = ${id}
        RETURNING "outbox_event_id"
      )
      UPDATE "outbox_events" AS event
      SET "status" = 'sent',
          "processed_at" = ${at},
          "last_error" = NULL,
          "updated_at" = ${at}
      FROM job
      WHERE event."id" = job."outbox_event_id"
    `);
  }

  async markConsumerFailed(id: string, code: string, at: Date) {
    const job = await this.findConsumerJob(id);
    const attempts = (job?.attempts ?? 0);
    if (attempts >= NOTIFICATION_MAX_ATTEMPTS) {
      await this.db
        .update(outboxConsumerJobs)
        .set({ status: "dead", processedAt: at, lastErrorCode: code.slice(0, 120), updatedAt: at })
        .where(eq(outboxConsumerJobs.id, id));
      return;
    }
    const delay =
      NOTIFICATION_RETRY_DELAYS_MINUTES[
        Math.min(attempts - 1, NOTIFICATION_RETRY_DELAYS_MINUTES.length - 1)
      ] ?? 60;
    const jittered = delay * (0.8 + Math.random() * 0.4);
    await this.db.execute(sql`
      UPDATE "outbox_consumer_jobs"
      SET "status" = 'failed',
          "available_at" = now() + (${jittered} || ' minutes')::interval,
          "last_error_code" = ${code.slice(0, 120)},
          "updated_at" = now()
      WHERE "id" = ${id}
    `);
  }

  async markConsumerDead(id: string, code: string, at: Date) {
    await this.db
      .update(outboxConsumerJobs)
      .set({ status: "dead", processedAt: at, lastErrorCode: code.slice(0, 120), updatedAt: at })
      .where(eq(outboxConsumerJobs.id, id));
  }

  private async findConsumerJob(id: string) {
    const [row] = await this.db
      .select()
      .from(outboxConsumerJobs)
      .where(eq(outboxConsumerJobs.id, id))
      .limit(1);
    return row;
  }

  // -- deliveries ----------------------------------------------------------

  async createDeliveries(rows: NewNotificationDelivery[]) {
    if (rows.length === 0) return [];
    return this.db
      .insert(notificationDeliveries)
      .values(rows)
      .onConflictDoNothing({
        target: [
          notificationDeliveries.notificationId,
          notificationDeliveries.channel,
          notificationDeliveries.targetKey,
        ],
      })
      .returning();
  }

  async claimDeliveries(limit: number) {
    // Same six-attempt ceiling as consumer jobs: crashed deliveries that never
    // reached markDeliveryFailed become dead instead of retrying forever.
    await this.db.execute(sql`
      UPDATE "notification_deliveries"
      SET "status" = 'dead',
          "processed_at" = now(),
          "last_error_code" = 'max_attempts_exceeded',
          "updated_at" = now()
      WHERE "attempts" >= ${NOTIFICATION_MAX_ATTEMPTS}
        AND "status" IN ('pending', 'failed', 'processing')
        AND (
          "status" IN ('pending', 'failed')
          OR "leased_at" <= now() - (${NOTIFICATION_LEASE_MINUTES} || ' minutes')::interval
        )
    `);
    const rows = await this.db.execute(sql`
      UPDATE "notification_deliveries" AS delivery
      SET "status" = 'processing',
          "leased_at" = now(),
          "attempts" = delivery."attempts" + 1,
          "updated_at" = now()
      WHERE delivery."id" IN (
        SELECT id FROM "notification_deliveries"
        WHERE (
          ("status" = 'pending')
          OR ("status" = 'failed' AND "available_at" <= now())
          OR ("status" = 'processing' AND "leased_at" <= now() - (${NOTIFICATION_LEASE_MINUTES} || ' minutes')::interval)
        )
        AND "available_at" <= now()
        AND "attempts" < ${NOTIFICATION_MAX_ATTEMPTS}
        ORDER BY "available_at" ASC, "id" ASC
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING delivery.*
    `);
    return (rows.rows as Array<Record<string, unknown>>).map(toDelivery);
  }

  async loadNotification(id: string) {
    const [row] = await this.db
      .select()
      .from(notifications)
      .where(eq(notifications.id, id))
      .limit(1);
    return row;
  }

  async markDeliverySent(id: string, at: Date) {
    await this.db
      .update(notificationDeliveries)
      .set({ status: "sent", processedAt: at, lastErrorCode: null, updatedAt: at })
      .where(eq(notificationDeliveries.id, id));
  }

  async markDeliverySkipped(id: string, code: string, at: Date) {
    await this.db
      .update(notificationDeliveries)
      .set({ status: "skipped", processedAt: at, lastErrorCode: code.slice(0, 120), updatedAt: at })
      .where(eq(notificationDeliveries.id, id));
  }

  async markDeliveryFailed(id: string, code: string, at: Date) {
    const [delivery] = await this.db
      .select()
      .from(notificationDeliveries)
      .where(eq(notificationDeliveries.id, id))
      .limit(1);
    const attempts = delivery?.attempts ?? 0;
    if (attempts >= NOTIFICATION_MAX_ATTEMPTS) {
      await this.db
        .update(notificationDeliveries)
        .set({ status: "dead", processedAt: at, lastErrorCode: code.slice(0, 120), updatedAt: at })
        .where(eq(notificationDeliveries.id, id));
      return;
    }
    const delay =
      NOTIFICATION_RETRY_DELAYS_MINUTES[
        Math.min(attempts - 1, NOTIFICATION_RETRY_DELAYS_MINUTES.length - 1)
      ] ?? 60;
    const jittered = delay * (0.8 + Math.random() * 0.4);
    await this.db.execute(sql`
      UPDATE "notification_deliveries"
      SET "status" = 'failed',
          "available_at" = now() + (${jittered} || ' minutes')::interval,
          "last_error_code" = ${code.slice(0, 120)},
          "updated_at" = now()
      WHERE "id" = ${id}
    `);
  }

  async markDeliveryDead(id: string, code: string, at: Date) {
    await this.db
      .update(notificationDeliveries)
      .set({ status: "dead", processedAt: at, lastErrorCode: code.slice(0, 120), updatedAt: at })
      .where(eq(notificationDeliveries.id, id));
  }

  // -- push subscriptions --------------------------------------------------

  async findSubscriptionByHash(endpointHash: string) {
    const [row] = await this.db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.endpointHash, endpointHash))
      .limit(1);
    return row;
  }

  async upsertSubscription(data: NewPushSubscription, at: Date) {
    const [row] = await this.db
      .insert(pushSubscriptions)
      .values({ ...data, createdAt: at, updatedAt: at })
      .onConflictDoUpdate({
        target: pushSubscriptions.endpointHash,
        // Global endpoint transfer: an account switch moves the browser
        // endpoint to the current user so the former account cannot receive
        // future pushes on that browser.
        set: {
          userId: data.userId,
          endpointCiphertext: data.endpointCiphertext,
          p256dhCiphertext: data.p256dhCiphertext,
          authCiphertext: data.authCiphertext,
          endpointFingerprint: data.endpointFingerprint,
          userAgentFamily: data.userAgentFamily,
          disabledAt: null,
          updatedAt: at,
        },
      })
      .returning();
    return row;
  }

  async removeSubscriptionByEndpoint(userId: string, endpointHash: string) {
    const [row] = await this.db
      .delete(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.userId, userId),
          eq(pushSubscriptions.endpointHash, endpointHash),
        ),
      )
      .returning();
    return row;
  }

  async listActiveSubscriptions(userId: string) {
    return this.db
      .select()
      .from(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.userId, userId),
          isNull(pushSubscriptions.disabledAt),
        ),
      )
      .orderBy(asc(pushSubscriptions.createdAt));
  }

  async findSubscription(id: string) {
    const [row] = await this.db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.id, id))
      .limit(1);
    return row;
  }

  async markSubscriptionSuccess(id: string, at: Date) {
    await this.db
      .update(pushSubscriptions)
      .set({ lastSuccessAt: at, lastFailureAt: null, updatedAt: at })
      .where(eq(pushSubscriptions.id, id));
  }

  async markSubscriptionFailure(id: string, at: Date) {
    await this.db
      .update(pushSubscriptions)
      .set({ lastFailureAt: at, updatedAt: at })
      .where(eq(pushSubscriptions.id, id));
  }

  async disableSubscription(id: string, at: Date) {
    await this.db
      .update(pushSubscriptions)
      .set({ disabledAt: at, updatedAt: at })
      .where(eq(pushSubscriptions.id, id));
  }

  async countUnread(userId: string) {
    return this.unreadCount(userId);
  }

  async findNotificationsByEvent(eventId: string) {
    return this.db
      .select()
      .from(notifications)
      .where(eq(notifications.sourceEventId, eventId));
  }

  // -- recipient / locale lookups (persistence owned here; resolvers stay
  // query-free per the Najm backend skill) ----------------------------------

  async findContributionParties(contributionId: string) {
    const [row] = await this.db
      .select({
        sponsorUserId: sponsorProfiles.userId,
        familyUserId: familyProfiles.userId,
      })
      .from(contributions)
      .innerJoin(
        sponsorProfiles,
        eq(contributions.sponsorProfileId, sponsorProfiles.id),
      )
      .innerJoin(
        familyProfiles,
        eq(contributions.familyProfileId, familyProfiles.id),
      )
      .where(eq(contributions.id, contributionId))
      .limit(1);
    return row;
  }

  async findOrderFamily(orderId: string) {
    const [order] = await this.db
      .select({
        familyProfileId: orders.familyProfileId,
        familyUserId: familyProfiles.userId,
      })
      .from(orders)
      .innerJoin(familyProfiles, eq(orders.familyProfileId, familyProfiles.id))
      .where(eq(orders.id, orderId))
      .limit(1);
    return order;
  }

  async findFamilyUser(familyProfileId: string) {
    const [family] = await this.db
      .select({ userId: familyProfiles.userId })
      .from(familyProfiles)
      .where(eq(familyProfiles.id, familyProfileId))
      .limit(1);
    return family?.userId ?? null;
  }

  async findApplicantAuthUser(applicantId: string) {
    const [applicant] = await this.db
      .select({ authUserId: applicants.authUserId })
      .from(applicants)
      .where(eq(applicants.id, applicantId))
      .limit(1);
    return applicant?.authUserId ?? null;
  }

  async findSponsorUsersCoveringFamily(familyProfileId: string, eventTime: Date) {
    const rows = await this.db
      .select({ userId: sponsorProfiles.userId })
      .from(supportAssignments)
      .innerJoin(
        sponsorProfiles,
        eq(supportAssignments.sponsorProfileId, sponsorProfiles.id),
      )
      .where(
        and(
          eq(supportAssignments.familyProfileId, familyProfileId),
          lte(supportAssignments.startedAt, eventTime),
          or(
            isNull(supportAssignments.endedAt),
            gt(supportAssignments.endedAt, eventTime),
          ),
        ),
      );
    return [...new Set(rows.map((row) => row.userId).filter(Boolean))];
  }

  async findLocaleSetting(userId: string) {
    const [setting] = await this.db
      .select({ locale: notificationSettings.locale })
      .from(notificationSettings)
      .where(eq(notificationSettings.userId, userId))
      .limit(1);
    return setting?.locale ?? null;
  }

  async isFamilyRecipient(userId: string) {
    const [family] = await this.db
      .select({ id: familyProfiles.id })
      .from(familyProfiles)
      .where(eq(familyProfiles.userId, userId))
      .limit(1);
    return Boolean(family);
  }
}
