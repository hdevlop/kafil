import { createHash } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { TransactionService } from "najm-database";
import { Pool } from "pg";

import { server } from "../src";
import { NotificationDispatcher } from "../src/modules/notifications/notificationDispatcher";
import { NotificationLocaleResolver } from "../src/modules/notifications/localeResolver";
import { NotificationRecipientResolver } from "../src/modules/notifications/recipientResolver";
import { NotificationRepository } from "../src/modules/notifications/notificationRepository";
import { NotificationService } from "../src/modules/notifications/notificationService";
import { OutboxService } from "../src/modules/outbox/outboxService";

const databaseDescribe =
  process.env.KAFIL_RUN_DB_INTEGRATION === "1" ? describe : describe.skip;

// statement_timeout keeps a stuck query from hanging the whole file: the
// server cancels the statement and node-pg settles the promise.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 8,
  statement_timeout: 15_000,
});

const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 10);
const like = `notif-${suffix}-%`;

let sponsorUser = "";
let familyUser = "";
let actorUser = "";
let adminUser = "";
let sponsorProfileId = "";
let familyProfileId = "";
let assignmentId = "";
let contributionId = "";
const extraUserIds: string[] = [];

function inRequestScope<T>(operation: () => Promise<T>) {
  return server.container.run({}, operation);
}

function services() {
  return {
    outbox: server.container.get(OutboxService),
    notifications: server.container.get(NotificationService),
    repository: server.container.get(NotificationRepository),
    dispatcher: server.container.get(NotificationDispatcher),
    recipients: server.container.get(NotificationRecipientResolver),
    locales: server.container.get(NotificationLocaleResolver),
    transactions: server.container.get(TransactionService),
  };
}

// NOTE: never use `expect(pool.query(...)).rejects` in this file. Bun's
// rejects matcher does not settle for node-pg promises issued after a
// successful query on the same pool, which hangs the test and then the
// process. try/catch settles the same rejection reliably.
function errorText(error: unknown): string {
  const parts: string[] = [];
  let current = error;
  while (current instanceof Error && parts.length < 5) {
    parts.push(current.message);
    const cause = (current as { cause?: unknown }).cause;
    current = cause;
  }
  return parts.join("\n");
}

async function expectRejected(
  promise: Promise<unknown>,
  contains?: string,
): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    // Drizzle wraps driver failures (trigger RAISE included) in a query
    // error whose cause chain carries the database message.
    if (contains !== undefined) {
      expect(errorText(error)).toContain(contains);
    }
    return error;
  }
  throw new Error("Expected the operation to reject, but it succeeded");
}

async function claimJobFor(eventId: string) {
  const { repository } = services();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const jobs = await inRequestScope(() => repository.claimConsumerJobs(10));
    const found = jobs.find((job) => job.outboxEventId === eventId);
    if (found) return found;
  }
  throw new Error(`No consumer job claimed for event ${eventId}`);
}

async function createUser(role: string) {
  const id = `notif-${suffix}-${role}-${crypto.randomUUID().replaceAll("-", "").slice(0, 6)}`;
  await pool.query(
    `INSERT INTO users (id, email, password, email_verified, status)
     VALUES ($1, $2, $3, true, 'active')`,
    [id, `${id}@example.test`, "x".repeat(60)],
  );
  return id;
}

async function cleanup() {
  await pool.query(
    `DELETE FROM notification_deliveries WHERE notification_id IN (
       SELECT id FROM notifications WHERE recipient_user_id LIKE $1
     )`,
    [like],
  );
  await pool.query(`DELETE FROM notifications WHERE recipient_user_id LIKE $1`, [
    like,
  ]);
  await pool.query(`DELETE FROM push_subscriptions WHERE user_id LIKE $1`, [like]);
  await pool.query(`DELETE FROM notification_settings WHERE user_id LIKE $1`, [
    like,
  ]);
  await pool.query(
    `DELETE FROM outbox_consumer_jobs WHERE outbox_event_id IN (
       SELECT id FROM outbox_events
       WHERE aggregate_id LIKE $1 OR actor_user_id LIKE $1
     )`,
    [like],
  );
  await pool.query(
    `DELETE FROM outbox_events WHERE aggregate_id LIKE $1 OR actor_user_id LIKE $1`,
    [like],
  );
  await pool.query(`DELETE FROM audit_events WHERE actor_user_id LIKE $1`, [like]);
  await pool.query(
    `DELETE FROM contributions WHERE sponsor_profile_id IN (
       SELECT id FROM sponsor_profiles WHERE user_id LIKE $1
     )`,
    [like],
  );
  await pool.query(
    `DELETE FROM support_assignments WHERE sponsor_profile_id IN (
       SELECT id FROM sponsor_profiles WHERE user_id LIKE $1
     )`,
    [like],
  );
  await pool.query(`DELETE FROM applicants WHERE auth_user_id LIKE $1`, [like]);
  await pool.query(`DELETE FROM sponsor_profiles WHERE user_id LIKE $1`, [like]);
  await pool.query(`DELETE FROM family_profiles WHERE user_id LIKE $1`, [like]);
  await pool.query(`DELETE FROM users WHERE id LIKE $1`, [like]);
}

databaseDescribe("notifications PostgreSQL integration", () => {
  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required for notification DB tests.");
    }
    await server.init();
    sponsorUser = await createUser("sponsor");
    familyUser = await createUser("family");
    actorUser = await createUser("actor");
    adminUser = await createUser("admin");

    const sponsor = await pool.query<{ id: string }>(
      `INSERT INTO sponsor_profiles (user_id) VALUES ($1) RETURNING id`,
      [sponsorUser],
    );
    sponsorProfileId = sponsor.rows[0]?.id as string;
    const family = await pool.query<{ id: string }>(
      `INSERT INTO family_profiles
         (user_id, guardian_legal_name, guardian_cin, exact_address,
          housing_situation, registration_date, created_by_user_id, funding_target_minor)
       VALUES ($1, 'Notif Fixture', $2, 'Fixture address', 'rented', '2025-01-15', $3, 500000)
       RETURNING id`,
      [familyUser, `GC${suffix}`, actorUser],
    );
    familyProfileId = family.rows[0]?.id as string;
    const assignment = await pool.query<{ id: string }>(
      `INSERT INTO support_assignments
         (sponsor_profile_id, family_profile_id, assigned_by_user_id, started_at)
       VALUES ($1, $2, $3, '2026-01-01T00:00:00Z')
       RETURNING id`,
      [sponsorProfileId, familyProfileId, actorUser],
    );
    assignmentId = assignment.rows[0]?.id as string;
    const contribution = await pool.query<{ id: string }>(
      `INSERT INTO contributions
         (support_assignment_id, sponsor_profile_id, family_profile_id,
          amount_minor, payment_method, status, expires_at)
       VALUES ($1, $2, $3, 12000, 'db-test', 'validated', now() + interval '30 days')
       RETURNING id`,
      [assignmentId, sponsorProfileId, familyProfileId],
    );
    contributionId = contribution.rows[0]?.id as string;
  });

  afterAll(async () => {
    try {
      await cleanup();
    } catch {
      // Cleanup is best-effort; the pool must still close below.
    } finally {
      await pool.end();
    }
  });

  it("enqueues the outbox event and consumer job atomically and rolls both back", async () => {
    const { outbox, transactions } = services();
    const aggregateId = `notif-${suffix}-rollback`;

    await expectRejected(
      inRequestScope(() =>
        transactions.run(async () => {
          await outbox.enqueue({
            topic: "order.delivered",
            aggregateType: "order",
            aggregateId,
            actorUserId: actorUser,
            payload: { orderNumber: "KFL-rollback" },
          });
          throw new Error("forced notification rollback");
        }),
      ),
      "forced notification rollback",
    );

    const rolledBack = await pool.query<{ id: string }>(
      `SELECT id FROM outbox_events WHERE aggregate_id = $1`,
      [aggregateId],
    );
    expect(rolledBack.rows).toHaveLength(0);

    // The real enqueue path creates exactly one notifications-v1 consumer job
    // in the same surrounding transaction and persists the actor.
    const event = await inRequestScope(() =>
      outbox.enqueue({
        topic: "order.delivered",
        aggregateType: "order",
        aggregateId,
        actorUserId: actorUser,
        payload: { orderNumber: "KFL-rollback" },
      }),
    );
    expect(event.actorUserId).toBe(actorUser);
    const jobs = await pool.query<{ consumer_key: string }>(
      `SELECT consumer_key FROM outbox_consumer_jobs WHERE outbox_event_id = $1`,
      [event.id],
    );
    expect(jobs.rows).toEqual([{ consumer_key: "notifications-v1" }]);

    // Historical rows inserted without a job never backfill on their own.
    const legacy = await pool.query<{ id: string }>(
      `INSERT INTO outbox_events (topic, aggregate_type, aggregate_id, payload, status)
       VALUES ('order.delivered', 'order', $1, '{}'::jsonb, 'pending')
       RETURNING id`,
      [`notif-${suffix}-legacy`],
    );
    const legacyJobs = await pool.query(
      `SELECT id FROM outbox_consumer_jobs WHERE outbox_event_id = $1`,
      [legacy.rows[0]?.id as string],
    );
    expect(legacyJobs.rows).toHaveLength(0);
  });

  it("claims each consumer job once across concurrent workers", async () => {
    const { outbox, repository } = services();
    const events = await inRequestScope(() =>
      Promise.all(
        [0, 1, 2].map((index) =>
          outbox.enqueue({
            topic: "order.delivered",
            aggregateType: "order",
            aggregateId: `notif-${suffix}-claim-${index}`,
            payload: { orderNumber: `KFL-claim-${index}` },
          }),
        ),
      ),
    );
    const wanted = new Set(events.map((event) => event.id));

    const [first, second] = await Promise.all([
      inRequestScope(() => repository.claimConsumerJobs(10)),
      inRequestScope(() => repository.claimConsumerJobs(10)),
    ]);
    const claimed = [...first, ...second].filter((job) =>
      wanted.has(job.outboxEventId),
    );
    const ids = claimed.map((job) => job.id);
    // SKIP LOCKED means the same job is never handed to both workers.
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(claimed.map((job) => job.outboxEventId))).toEqual(wanted);
    for (const job of claimed) {
      expect(job.status).toBe("processing");
      expect(job.attempts).toBeGreaterThanOrEqual(1);
    }
  });

  it("recovers stale leases, schedules bounded retries, and dead-letters at the ceiling", async () => {
    const { outbox, repository } = services();
    const event = await inRequestScope(() =>
      outbox.enqueue({
        topic: "order.delivered",
        aggregateType: "order",
        aggregateId: `notif-${suffix}-retry`,
        payload: { orderNumber: "KFL-retry" },
      }),
    );

    const claimed = await claimJobFor(event.id);
    const jobId = claimed.id;
    expect(claimed.status).toBe("processing");

    // A crashed worker's lease becomes reclaimable after five minutes with a
    // bumped attempt counter.
    await pool.query(
      `UPDATE outbox_consumer_jobs SET leased_at = now() - interval '10 minutes'
       WHERE id = $1`,
      [jobId as string],
    );
    const recovered = await inRequestScope(() => repository.claimConsumerJobs(10));
    const reclaimed = recovered.find((job) => job.id === jobId);
    expect(reclaimed?.status).toBe("processing");
    expect(reclaimed?.attempts).toBe(2);

    // A sanitized transient failure schedules a bounded backoff, not a loop.
    await inRequestScope(() =>
      repository.markConsumerFailed(jobId as string, "timeout_retry", new Date()),
    );
    const failed = await pool.query<{
      status: string;
      available_at: Date;
      last_error_code: string;
    }>(
      `SELECT status, available_at, last_error_code
       FROM outbox_consumer_jobs WHERE id = $1`,
      [jobId as string],
    );
    expect(failed.rows[0]?.status).toBe("failed");
    expect(failed.rows[0]?.last_error_code).toBe("timeout_retry");
    // Two attempts so far (initial claim plus stale recovery): the schedule
    // pins the 5-minute step with 0.8-1.2 jitter, i.e. roughly 4-6 minutes.
    const delayMs =
      new Date(failed.rows[0]?.available_at as Date).getTime() - Date.now();
    expect(delayMs).toBeGreaterThan(3.5 * 60_000);
    expect(delayMs).toBeLessThan(6.5 * 60_000);

    // The sixth attempt dead-letters instead of retrying forever, and a dead
    // job is never claimable again.
    await pool.query(
      `UPDATE outbox_consumer_jobs SET attempts = 6, status = 'failed',
        available_at = now() - interval '1 hour' WHERE id = $1`,
      [jobId as string],
    );
    await inRequestScope(() =>
      repository.markConsumerFailed(jobId as string, "timeout_retry", new Date()),
    );
    const dead = await pool.query<{ status: string }>(
      `SELECT status FROM outbox_consumer_jobs WHERE id = $1`,
      [jobId as string],
    );
    expect(dead.rows[0]?.status).toBe("dead");
    const reclaim = await inRequestScope(() => repository.claimConsumerJobs(10));
    expect(reclaim.find((job) => job.id === jobId)).toBeUndefined();

    // The claim sweep converts a stale crashed row that already exhausted the
    // ceiling straight to dead.
    const crashedEvent = await inRequestScope(() =>
      outbox.enqueue({
        topic: "order.delivered",
        aggregateType: "order",
        aggregateId: `notif-${suffix}-crashed`,
        payload: {},
      }),
    );
    const crashed = await pool.query<{ id: string }>(
      `UPDATE outbox_consumer_jobs
       SET status = 'processing', attempts = 6, leased_at = now() - interval '1 hour'
       WHERE outbox_event_id = $1 RETURNING id`,
      [crashedEvent.id],
    );
    await inRequestScope(() => repository.claimConsumerJobs(10));
    const swept = await pool.query<{ status: string }>(
      `SELECT status FROM outbox_consumer_jobs WHERE id = $1`,
      [crashed.rows[0]?.id as string],
    );
    expect(swept.rows[0]?.status).toBe("dead");
  });

  it("claims each delivery once across concurrent workers and reclaims stale delivery leases", async () => {
    const { outbox, repository } = services();
    const reader = await createUser("delivery-reader");
    extraUserIds.push(reader);
    const recipients = [sponsorUser, familyUser, reader];
    const event = await inRequestScope(() =>
      outbox.enqueue({
        topic: "order.delivered",
        aggregateType: "order",
        aggregateId: `notif-${suffix}-delivery-claim`,
        payload: { orderNumber: "KFL-dclaim" },
      }),
    );
    const notificationIds: string[] = [];
    for (const recipient of recipients) {
      const inserted = await pool.query<{ id: string }>(
        `INSERT INTO notifications
            (source_event_id, recipient_user_id, topic, aggregate_type, aggregate_id, locale, payload)
          VALUES ($1, $2, 'order.delivered', 'order', $3, 'en', '{}'::jsonb)
          RETURNING id`,
        [event.id, recipient, `notif-${suffix}-delivery-claim`],
      );
      const notificationId = inserted.rows[0]?.id as string;
      notificationIds.push(notificationId);
      await pool.query(
        `INSERT INTO notification_deliveries (notification_id, channel, target_key)
          VALUES ($1, 'email', $2)`,
        [notificationId, `user:${recipient}`],
      );
    }
    const wanted = new Set(notificationIds);

    const [first, second] = await Promise.all([
      inRequestScope(() => repository.claimDeliveries(10)),
      inRequestScope(() => repository.claimDeliveries(10)),
    ]);
    const claimed = [...first, ...second].filter((delivery) =>
      wanted.has(delivery.notificationId),
    );
    const ids = claimed.map((delivery) => delivery.id);
    // SKIP LOCKED means the same delivery is never handed to both workers.
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(claimed.map((delivery) => delivery.notificationId))).toEqual(wanted);
    for (const delivery of claimed) {
      expect(delivery.status).toBe("processing");
      expect(delivery.attempts).toBeGreaterThanOrEqual(1);
    }

    // A crashed worker's delivery lease becomes reclaimable after five
    // minutes with a bumped attempt counter. Reclaiming a processing
    // delivery can resend an already-sent email when the crash happened
    // after the provider send: external delivery is at-least-once, and the
    // stable target key keeps the redelivery correlated, not duplicated as
    // a new job.
    const one = claimed[0];
    await pool.query(
      `UPDATE notification_deliveries SET leased_at = now() - interval '10 minutes'
        WHERE id = $1`,
      [one?.id as string],
    );
    const recovered = await inRequestScope(() => repository.claimDeliveries(10));
    const reclaimed = recovered.find((delivery) => delivery.id === one?.id);
    expect(reclaimed?.status).toBe("processing");
    expect(reclaimed?.attempts).toBe((one?.attempts ?? 1) + 1);

    for (const delivery of claimed) {
      await inRequestScope(() =>
        repository.markDeliverySent(delivery.id as string, new Date()),
      );
    }
  });

  it("fans out contribution events to sponsor and family exactly once", async () => {
    const { outbox, dispatcher } = services();
    const event = await inRequestScope(() =>
      outbox.enqueue({
        topic: "contribution.validated",
        aggregateType: "contribution",
        aggregateId: contributionId,
        actorUserId: actorUser,
        payload: {
          amountMinor: 12000,
          email: "must-not-pass",
          guardianCin: "must-not-pass",
          notes: "must-not-pass",
        },
      }),
    );
    const claimed = await claimJobFor(event.id);

    await inRequestScope(() =>
      dispatcher.dispatchConsumerJob(claimed as { id: string; outboxEventId: string; attempts: number }),
    );

    const rows = await pool.query<{
      recipient_user_id: string;
      actor_user_id: string | null;
      locale: string;
      payload: Record<string, unknown>;
    }>(
      `SELECT recipient_user_id, actor_user_id, locale, payload
       FROM notifications WHERE source_event_id = $1 ORDER BY recipient_user_id`,
      [event.id],
    );
    expect(rows.rows.map((row) => row.recipient_user_id).sort()).toEqual(
      [sponsorUser, familyUser].sort(),
    );
    // Locale is snapshotted at fan-out: family Arabic default, sponsor English.
    expect(
      rows.rows.find((row) => row.recipient_user_id === familyUser)?.locale,
    ).toBe("ar");
    expect(
      rows.rows.find((row) => row.recipient_user_id === sponsorUser)?.locale,
    ).toBe("en");
    for (const row of rows.rows) {
      expect(row.actor_user_id).toBe(actorUser);
      // Topic allowlist only: the shared sanitizer plus the per-topic list
      // drop every sensitive or unknown key before the inbox row.
      expect(row.payload).toEqual({ amountMinor: 12000 });
    }

    // Consumer completion and outbox completion move together.
    const states = await pool.query<{ status: string }>(
      `SELECT status FROM outbox_consumer_jobs WHERE id = $1`,
      [(claimed as { id: string }).id],
    );
    expect(states.rows[0]?.status).toBe("sent");
    const outboxState = await pool.query<{ status: string }>(
      `SELECT status FROM outbox_events WHERE id = $1`,
      [event.id],
    );
    expect(outboxState.rows[0]?.status).toBe("sent");

    // External channels stay off by default: fan-out is in-app only unless
    // the channel flag is explicitly enabled for the test.
    const deliveries = await pool.query(
      `SELECT id FROM notification_deliveries WHERE notification_id IN (
         SELECT id FROM notifications WHERE source_event_id = $1
       )`,
      [event.id],
    );
    expect(deliveries.rows).toHaveLength(0);

    // Replay is idempotent: one inbox row per (event, recipient).
    await inRequestScope(() =>
      dispatcher.dispatchConsumerJob(claimed as { id: string; outboxEventId: string; attempts: number }),
    );
    const replayed = await pool.query(
      `SELECT count(*)::int AS total FROM notifications WHERE source_event_id = $1`,
      [event.id],
    );
    expect(replayed.rows[0]?.total).toBe(2);
  });

  it("dead-letters unsupported topics and events without recipients", async () => {
    const { outbox, dispatcher } = services();

    const unknown = await inRequestScope(() =>
      outbox.enqueue({
        topic: "billing.refunded",
        aggregateType: "billing",
        aggregateId: `notif-${suffix}-unknown-topic`,
        payload: {},
      }),
    );
    const unknownJob = await claimJobFor(unknown.id);
    await inRequestScope(() =>
      dispatcher.dispatchConsumerJob(unknownJob as { id: string; outboxEventId: string; attempts: number }),
    );
    const unknownState = await pool.query<{ status: string; last_error_code: string }>(
      `SELECT status, last_error_code FROM outbox_consumer_jobs WHERE id = $1`,
      [(unknownJob as { id: string }).id],
    );
    expect(unknownState.rows[0]).toMatchObject({
      status: "dead",
      last_error_code: "unsupported_topic",
    });

    const orphan = await inRequestScope(() =>
      outbox.enqueue({
        topic: "order.delivered",
        aggregateType: "order",
        aggregateId: crypto.randomUUID(),
        actorUserId: actorUser,
        payload: { orderNumber: "KFL-ghost" },
      }),
    );
    const orphanJob = await claimJobFor(orphan.id);
    await inRequestScope(() =>
      dispatcher.dispatchConsumerJob(orphanJob as { id: string; outboxEventId: string; attempts: number }),
    );
    const orphanState = await pool.query<{ status: string; last_error_code: string }>(
      `SELECT status, last_error_code FROM outbox_consumer_jobs WHERE id = $1`,
      [(orphanJob as { id: string }).id],
    );
    expect(orphanState.rows[0]).toMatchObject({
      status: "dead",
      last_error_code: "no_recipients",
    });
    const orphanRows = await pool.query(
      `SELECT id FROM notifications WHERE source_event_id = $1`,
      [orphan.id],
    );
    expect(orphanRows.rows).toHaveLength(0);
  });

  it("resolves sponsors temporally at event time through the real resolver", async () => {
    const { recipients } = services();
    const eventTime = new Date("2026-03-15T12:00:00.000Z");
    const temporalSponsors: Array<{ user: string; profile: string }> = [];
    for (const name of ["temp-active", "temp-ended", "temp-boundary", "temp-late"]) {
      const user = await createUser(name);
      extraUserIds.push(user);
      const profile = await pool.query<{ id: string }>(
        `INSERT INTO sponsor_profiles (user_id) VALUES ($1) RETURNING id`,
        [user],
      );
      temporalSponsors.push({ user, profile: profile.rows[0]?.id as string });
    }
    const byName = Object.fromEntries(
      ["temp-active", "temp-ended", "temp-boundary", "temp-late"].map((name, index) => [
        name,
        temporalSponsors[index] as { user: string; profile: string },
      ]),
    );
    // Active at event time; ended before; ended exactly at event time
    // (strictly greater wins, so the boundary is excluded); started after.
    await pool.query(
      `INSERT INTO support_assignments
         (sponsor_profile_id, family_profile_id, assigned_by_user_id, status, started_at, ended_at)
       VALUES
         ($1, $2, $3, 'active', '2026-01-01T00:00:00Z', NULL),
         ($4, $2, $3, 'ended', '2026-01-01T00:00:00Z', '2026-02-01T00:00:00Z'),
         ($5, $2, $3, 'ended', '2026-01-01T00:00:00Z', '2026-03-15T12:00:00Z'),
         ($6, $2, $3, 'active', '2026-04-01T00:00:00Z', NULL)`,
      [
        byName["temp-active"]?.profile,
        familyProfileId,
        actorUser,
        byName["temp-ended"]?.profile,
        byName["temp-boundary"]?.profile,
        byName["temp-late"]?.profile,
      ],
    );

    const resolved = await inRequestScope(() =>
      recipients.resolve(
        "family.fundingActivated",
        "family",
        familyProfileId,
        eventTime,
      ),
    );
    expect(resolved.familyUserId).toBe(familyUser);
    // Only the assignment covering the family at the occurrence timestamp
    // counts; the boundary, ended, and late assignments do not.
    expect(resolved.sponsorUserIds).toContain(byName["temp-active"]?.user);
    expect(resolved.sponsorUserIds).not.toContain(byName["temp-ended"]?.user);
    expect(resolved.sponsorUserIds).not.toContain(byName["temp-boundary"]?.user);
    expect(resolved.sponsorUserIds).not.toContain(byName["temp-late"]?.user);
    // The long-lived fixture assignment from beforeAll still covers the family.
    expect(resolved.sponsorUserIds).toContain(sponsorUser);
    expect(resolved.all).toContain(familyUser);
  });

  it("creates inbox rows and dispatcher-owned applicant email jobs in Phase C", async () => {
    const { outbox, dispatcher } = services();
    const applicantUser = await createUser("applicant");
    extraUserIds.push(applicantUser);
    const applicantId = crypto.randomUUID();
    await pool.query(
      `INSERT INTO applicants
         (id, auth_user_id, name, email, phone, cin, gender, status)
       VALUES ($1, $2, 'Applicant Fixture', $3, $4, $5, 'F', 'pending_review')`,
      [
        applicantId,
        applicantUser,
        `${applicantId}@example.test`,
        `+2127${[...suffix].map((c) => String(parseInt(c, 16) % 10)).join("")}`,
        `CA${suffix}`.toUpperCase(),
      ],
    );
    const event = await inRequestScope(() =>
      outbox.enqueue({
        topic: "applicant.rejected",
        aggregateType: "applicant",
        aggregateId: applicantId,
        actorUserId: actorUser,
        payload: { applicantId, transition: "pending_review->rejected", locale: "ar" },
      }),
    );
    const job = await claimJobFor(event.id);
    await inRequestScope(() =>
      dispatcher.dispatchConsumerJob(job as { id: string; outboxEventId: string; attempts: number }),
    );

    const rows = await pool.query<{
      recipient_user_id: string;
      locale: string;
      payload: Record<string, unknown>;
    }>(
      `SELECT recipient_user_id, locale, payload
       FROM notifications WHERE source_event_id = $1`,
      [event.id],
    );
    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0]?.recipient_user_id).toBe(applicantUser);
    // Applicant payload locale wins the snapshot precedence.
    expect(rows.rows[0]?.locale).toBe("ar");
    expect(rows.rows[0]?.payload).toEqual({
      applicantId,
      transition: "pending_review->rejected",
    });
    // Phase C: the dispatcher is the single owner of applicant email. With
    // email enabled it creates exactly one email delivery job per inbox row;
    // with email disabled it creates none. The legacy ApplicantService direct
    // sender was removed, so no second owner can duplicate delivery.
    const previousEmail = process.env.NOTIFICATIONS_EMAIL_ENABLED;
    process.env.NOTIFICATIONS_EMAIL_ENABLED = "true";
    try {
      const enabledEvent = await inRequestScope(() =>
        outbox.enqueue({
          topic: "applicant.rejected",
          aggregateType: "applicant",
          aggregateId: applicantId,
          actorUserId: actorUser,
          payload: { applicantId, transition: "pending_review->rejected", locale: "ar" },
        }),
      );
      const enabledJob = await claimJobFor(enabledEvent.id);
      await inRequestScope(() =>
        dispatcher.dispatchConsumerJob(enabledJob as { id: string; outboxEventId: string; attempts: number }),
      );
      const enabledDeliveries = await pool.query<{ channel: string; target_key: string }>(
        `SELECT channel, target_key FROM notification_deliveries WHERE notification_id IN (
           SELECT id FROM notifications WHERE source_event_id = $1
         )`,
        [enabledEvent.id],
      );
      expect(enabledDeliveries.rows).toHaveLength(1);
      expect(enabledDeliveries.rows[0]).toMatchObject({
        channel: "email",
        target_key: `user:${applicantUser}`,
      });
    } finally {
      if (previousEmail === undefined) delete process.env.NOTIFICATIONS_EMAIL_ENABLED;
      else process.env.NOTIFICATIONS_EMAIL_ENABLED = previousEmail;
    }
    const deliveries = await pool.query(
      `SELECT id FROM notification_deliveries WHERE notification_id IN (
         SELECT id FROM notifications WHERE source_event_id = $1
       )`,
      [event.id],
    );
    expect(deliveries.rows).toHaveLength(0);
  });

  it("marks reads write-once and 404s cross-user and admin reads", async () => {
    const { outbox, dispatcher, notifications } = services();
    const reader = await createUser("reader");
    extraUserIds.push(reader);
    const event = await inRequestScope(() =>
      outbox.enqueue({
        topic: "contribution.validated",
        aggregateType: "contribution",
        aggregateId: contributionId,
        actorUserId: actorUser,
        payload: { amountMinor: 12000 },
      }),
    );
    const job = await claimJobFor(event.id);
    await inRequestScope(() =>
      dispatcher.dispatchConsumerJob(job as { id: string; outboxEventId: string; attempts: number }),
    );
    const own = await pool.query<{ id: string }>(
      `SELECT id FROM notifications
       WHERE source_event_id = $1 AND recipient_user_id = $2`,
      [event.id, sponsorUser],
    );
    const notificationId = own.rows[0]?.id as string;
    expect(notificationId).toBeDefined();

    const before = await inRequestScope(() => notifications.unreadCount(sponsorUser));
    const first = await inRequestScope(() =>
      notifications.markRead(sponsorUser, notificationId),
    );
    expect(first.updated).toBe(true);
    expect(first.readAt).not.toBeNull();
    // Replay performs no second update and keeps the original timestamp.
    const second = await inRequestScope(() =>
      notifications.markRead(sponsorUser, notificationId),
    );
    expect(second.updated).toBe(false);
    expect(second.readAt).toBe(first.readAt);
    const after = await inRequestScope(() => notifications.unreadCount(sponsorUser));
    expect(after.count).toBe(before.count - 1);

    // Cross-user IDs 404, including for the administrator: every role,
    // admin included, sees only its own inbox.
    const crossUser = (await expectRejected(
      inRequestScope(() => notifications.markRead(reader, notificationId)),
    )) as { status?: number };
    expect(crossUser?.status).toBe(404);
    const adminRead = (await expectRejected(
      inRequestScope(() => notifications.markRead(adminUser, notificationId)),
    )) as { status?: number };
    expect(adminRead?.status).toBe(404);

    const listed = await inRequestScope(() =>
      notifications.listMine(sponsorUser, { limit: 20 }),
    );
    expect(
      listed.rows.find((row) => row.id === notificationId)?.readAt,
    ).toBe(first.readAt);
    const unreadOnly = await inRequestScope(() =>
      notifications.listMine(sponsorUser, { limit: 20, unread: true }),
    );
    expect(unreadOnly.rows.find((row) => row.id === notificationId)).toBeUndefined();
  });

  it("marks all read in one snapshot and keeps later inserts unread", async () => {
    const { outbox, dispatcher, notifications } = services();
    const event = await inRequestScope(() =>
      outbox.enqueue({
        topic: "contribution.validated",
        aggregateType: "contribution",
        aggregateId: contributionId,
        actorUserId: actorUser,
        payload: { amountMinor: 12000 },
      }),
    );
    const job = await claimJobFor(event.id);
    await inRequestScope(() =>
      dispatcher.dispatchConsumerJob(job as { id: string; outboxEventId: string; attempts: number }),
    );
    const before = await inRequestScope(() => notifications.unreadCount(familyUser));
    expect(before.count).toBeGreaterThanOrEqual(1);

    const marked = await inRequestScope(() => notifications.markAllRead(familyUser));
    expect(marked.read).toBe(before.count);
    expect(
      (await inRequestScope(() => notifications.unreadCount(familyUser))).count,
    ).toBe(0);

    const later = await inRequestScope(() =>
      outbox.enqueue({
        topic: "contribution.validated",
        aggregateType: "contribution",
        aggregateId: contributionId,
        actorUserId: actorUser,
        payload: { amountMinor: 12000 },
      }),
    );
    const laterJob = await claimJobFor(later.id);
    await inRequestScope(() =>
      dispatcher.dispatchConsumerJob(laterJob as { id: string; outboxEventId: string; attempts: number }),
    );
    expect(
      (await inRequestScope(() => notifications.unreadCount(familyUser))).count,
    ).toBe(1);

    // Concurrent mark-all calls converge: every row ends read.
    const concurrent = await Promise.all([
      inRequestScope(() => notifications.markAllRead(familyUser)),
      inRequestScope(() => notifications.markAllRead(familyUser)),
    ]);
    expect(concurrent[0]?.read).toBeGreaterThanOrEqual(1);
    expect(
      (await inRequestScope(() => notifications.unreadCount(familyUser))).count,
    ).toBe(0);
  });

  it("manages settings and push subscriptions through transactional service commands", async () => {
    const { notifications } = services();

    expect(await inRequestScope(() => notifications.getSettings(sponsorUser))).toEqual({
      locale: "en",
    });
    expect(
      await inRequestScope(() =>
        notifications.updateSettings(sponsorUser, { locale: "fr" }),
      ),
    ).toEqual({ locale: "fr" });
    expect(await inRequestScope(() => notifications.getSettings(sponsorUser))).toEqual({
      locale: "fr",
    });

    const endpoint = `https://push.example.test/sub/${suffix}`;
    const keys = { p256dh: "dGVzdHB1YmxpY2tleQ", auth: "dGVzdGF1dGg" };
    // Concurrent subscribes from two users race on the globally unique
    // endpoint hash; afterwards one deterministic transfer owns it.
    await Promise.all([
      inRequestScope(() =>
        notifications.subscribe(sponsorUser, { endpoint, ...keys }),
      ),
      inRequestScope(() =>
        notifications.subscribe(familyUser, { endpoint, ...keys }),
      ),
    ]);
    const owned = await inRequestScope(() =>
      notifications.subscribe(familyUser, { endpoint, ...keys }),
    );
    expect(owned.endpointFingerprint).toHaveLength(16);
    const endpointHash = createHash("sha256").update(endpoint, "utf8").digest("hex");
    const subs = await pool.query<{ user_id: string }>(
      `SELECT user_id FROM push_subscriptions WHERE endpoint_hash = $1`,
      [endpointHash],
    );
    expect(subs.rows).toHaveLength(1);
    expect(subs.rows[0]?.user_id).toBe(familyUser);

    // Ciphertext at rest never contains the plaintext endpoint or key material.
    const stored = await pool.query<{
      endpoint_ciphertext: string;
      p256dh_ciphertext: string;
      auth_ciphertext: string;
    }>(
      `SELECT endpoint_ciphertext, p256dh_ciphertext, auth_ciphertext
       FROM push_subscriptions WHERE user_id = $1`,
      [familyUser],
    );
    for (const row of stored.rows) {
      expect(row.endpoint_ciphertext).not.toContain("push.example.test");
      expect(row.endpoint_ciphertext).not.toContain(endpoint);
    }

    // Only the owning user can remove the subscription by exact endpoint.
    const removed = await inRequestScope(() =>
      notifications.unsubscribe(familyUser, { endpoint }),
    );
    expect(removed).toEqual({ removed: true });
    const missing = (await expectRejected(
      inRequestScope(() => notifications.unsubscribe(familyUser, { endpoint })),
    )) as { status?: number };
    expect(missing?.status).toBe(404);

    // Every mutation above wrote an audit row with a safe fingerprint.
    const audits = await pool.query<{ action: string }>(
      `SELECT action FROM audit_events
       WHERE actor_user_id = $1 AND resource = 'notifications'
       ORDER BY created_at`,
      [familyUser],
    );
    const actions = audits.rows.map((row) => row.action);
    expect(actions).toContain("notifications.subscribePush");
    expect(actions).toContain("notifications.unsubscribePush");
  });

  it("rolls back notification mutations when the audit write fails", async () => {
    const { outbox, dispatcher, notifications } = services();
    const functionName = `kafil_test_fail_notif_audit_${suffix}`;
    const triggerName = `kafil_test_fail_notif_audit_${suffix}`;
    const event = await inRequestScope(() =>
      outbox.enqueue({
        topic: "contribution.validated",
        aggregateType: "contribution",
        aggregateId: contributionId,
        actorUserId: actorUser,
        payload: { amountMinor: 12000 },
      }),
    );
    const job = await claimJobFor(event.id);
    await inRequestScope(() =>
      dispatcher.dispatchConsumerJob(job as { id: string; outboxEventId: string; attempts: number }),
    );
    const own = await pool.query<{ id: string }>(
      `SELECT id FROM notifications
       WHERE source_event_id = $1 AND recipient_user_id = $2`,
      [event.id, familyUser],
    );
    const notificationId = own.rows[0]?.id as string;

    await pool.query(
      `CREATE OR REPLACE FUNCTION ${functionName}() RETURNS trigger AS $$
       BEGIN
         IF NEW.resource = 'notifications' THEN
           RAISE EXCEPTION 'forced notification audit failure';
         END IF;
         RETURN NEW;
       END;
       $$ LANGUAGE plpgsql`,
    );
    await pool.query(
      `CREATE TRIGGER ${triggerName}
       BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION ${functionName}()`,
    );
    try {
      await expectRejected(
        inRequestScope(() =>
          notifications.updateSettings(familyUser, { locale: "es" }),
        ),
        "forced notification audit failure",
      );
      // The settings change rolled back with the audit write.
      expect(
        await inRequestScope(() => notifications.getSettings(familyUser)),
      ).toEqual({ locale: "en" });

      await expectRejected(
        inRequestScope(() => notifications.markRead(familyUser, notificationId)),
        "forced notification audit failure",
      );
      // The row stays unread: no committed state without its audit record.
      const kept = await pool.query<{ read_at: Date | null }>(
        `SELECT read_at FROM notifications WHERE id = $1`,
        [notificationId],
      );
      expect(kept.rows[0]?.read_at).toBeNull();
    } finally {
      await pool.query(`DROP TRIGGER IF EXISTS ${triggerName} ON audit_events`);
      await pool.query(`DROP FUNCTION IF EXISTS ${functionName}()`);
    }

    // Recovery works once auditing is healthy again.
    expect(
      await inRequestScope(() =>
        notifications.updateSettings(familyUser, { locale: "es" }),
      ),
    ).toEqual({ locale: "es" });
  });

  it("completes the consumer job and outbox event together or not at all", async () => {
    const { outbox, repository } = services();
    const functionName = `kafil_test_fail_outbox_sent_${suffix}`;
    const triggerName = `kafil_test_fail_outbox_sent_${suffix}`;
    const event = await inRequestScope(() =>
      outbox.enqueue({
        topic: "order.delivered",
        aggregateType: "order",
        aggregateId: `notif-${suffix}-atomic`,
        payload: { orderNumber: "KFL-atomic" },
      }),
    );
    const job = await claimJobFor(event.id);
    expect(job.status).toBe("processing");

    await pool.query(
      `CREATE OR REPLACE FUNCTION ${functionName}() RETURNS trigger AS $$
       BEGIN
         IF NEW.status = 'sent' THEN
           RAISE EXCEPTION 'forced outbox completion failure';
         END IF;
         RETURN NEW;
       END;
       $$ LANGUAGE plpgsql`,
    );
    await pool.query(
      `CREATE TRIGGER ${triggerName}
       BEFORE UPDATE ON outbox_events FOR EACH ROW EXECUTE FUNCTION ${functionName}()`,
    );
    try {
      await expectRejected(
        inRequestScope(() =>
          repository.markConsumerSent(job?.id as string, new Date()),
        ),
        "forced outbox completion failure",
      );
      // Single-statement completion: the job is still processing and the
      // event still pending, so lease recovery can retry instead of leaving
      // a sent job attached to a permanently pending event.
      const kept = await pool.query<{ status: string }>(
        `SELECT status FROM outbox_consumer_jobs WHERE id = $1`,
        [job?.id as string],
      );
      expect(kept.rows[0]?.status).toBe("processing");
      const pending = await pool.query<{ status: string }>(
        `SELECT status FROM outbox_events WHERE id = $1`,
        [event.id],
      );
      expect(pending.rows[0]?.status).toBe("pending");
    } finally {
      await pool.query(`DROP TRIGGER IF EXISTS ${triggerName} ON outbox_events`);
      await pool.query(`DROP FUNCTION IF EXISTS ${functionName}()`);
    }

    await inRequestScope(() =>
      repository.markConsumerSent(job?.id as string, new Date()),
    );
    const done = await pool.query<{ status: string }>(
      `SELECT status FROM outbox_consumer_jobs WHERE id = $1`,
      [job?.id as string],
    );
    expect(done.rows[0]?.status).toBe("sent");
  });

  it("cascades recipient deletion and nulls actor attribution", async () => {
    const { notifications } = services();
    const leaver = await createUser("leaver");
    extraUserIds.push(leaver);
    const endpoint = `https://push.example.test/sub/${suffix}-leaver`;
    await inRequestScope(() =>
      notifications.subscribe(leaver, {
        endpoint,
        p256dh: "dGVzdHB1YmxpY2tleQ",
        auth: "dGVzdGF1dGg",
      }),
    );
    await inRequestScope(() => notifications.updateSettings(leaver, { locale: "fr" }));
    const event = await pool.query<{ id: string }>(
      `INSERT INTO outbox_events (topic, aggregate_type, aggregate_id, payload, status)
       VALUES ('order.delivered', 'order', $1, '{}'::jsonb, 'pending')
       RETURNING id`,
      [`notif-${suffix}-leaver`],
    );
    await pool.query(
      `INSERT INTO notifications
         (source_event_id, recipient_user_id, actor_user_id, topic,
          aggregate_type, aggregate_id, locale, payload)
       VALUES ($1, $2, $3, 'order.delivered', 'order', $4, 'en', '{}'::jsonb)`,
      [event.rows[0]?.id as string, leaver, actorUser, `notif-${suffix}-leaver`],
    );

    await pool.query(`DELETE FROM users WHERE id = $1`, [leaver]);
    const gone = await pool.query(
      `SELECT id FROM notifications WHERE recipient_user_id = $1`,
      [leaver],
    );
    expect(gone.rows).toHaveLength(0);
    const goneSettings = await pool.query(
      `SELECT user_id FROM notification_settings WHERE user_id = $1`,
      [leaver],
    );
    expect(goneSettings.rows).toHaveLength(0);
    const goneSubs = await pool.query(
      `SELECT id FROM push_subscriptions WHERE user_id = $1`,
      [leaver],
    );
    expect(goneSubs.rows).toHaveLength(0);

    // Actor deletion nulls the attribution without deleting recipient history.
    const tempActor = await createUser("temp-actor");
    const actorEvent = await pool.query<{ id: string }>(
      `INSERT INTO outbox_events (topic, aggregate_type, aggregate_id, actor_user_id, payload, status)
       VALUES ('order.delivered', 'order', $1, $2, '{}'::jsonb, 'pending')
       RETURNING id`,
      [`notif-${suffix}-actor-tmp`, tempActor],
    );
    await pool.query(
      `INSERT INTO notifications
         (source_event_id, recipient_user_id, actor_user_id, topic,
          aggregate_type, aggregate_id, locale, payload)
       VALUES ($1, $2, $3, 'order.delivered', 'order', $4, 'en', '{}'::jsonb)`,
      [actorEvent.rows[0]?.id as string, familyUser, tempActor, `notif-${suffix}-actor-tmp`],
    );
    await pool.query(`DELETE FROM users WHERE id = $1`, [tempActor]);
    const nulled = await pool.query<{ actor_user_id: string | null }>(
      `SELECT actor_user_id FROM notifications
       WHERE source_event_id = $1 AND recipient_user_id = $2`,
      [actorEvent.rows[0]?.id as string, familyUser],
    );
    expect(nulled.rows[0]?.actor_user_id).toBeNull();
  });

  it("enforces database ceilings on aggregate IDs, payloads, and ciphertext", async () => {
    const { outbox } = services();
    const event = await inRequestScope(() =>
      outbox.enqueue({
        topic: "order.delivered",
        aggregateType: "order",
        aggregateId: `notif-${suffix}-ceil`,
        payload: { orderNumber: "KFL-ceil" },
      }),
    );
    await expectRejected(
      pool.query(
        `INSERT INTO notifications
           (source_event_id, recipient_user_id, topic, aggregate_type, aggregate_id, locale, payload)
         VALUES ($1, $2, 'order.delivered', 'order', $3, 'en', '{}'::jsonb)`,
        [event.id, sponsorUser, "x".repeat(501)],
      ),
      "notifications_aggregate_id_check",
    );
    await expectRejected(
      pool.query(
        `INSERT INTO notifications
           (source_event_id, recipient_user_id, topic, aggregate_type, aggregate_id, locale, payload)
         VALUES ($1, $2, 'order.delivered', 'order', 'agg', 'en', $3::jsonb)`,
        [event.id, sponsorUser, JSON.stringify({ blob: "x".repeat(25000) })],
      ),
      "notifications_payload_size_check",
    );
    await expectRejected(
      pool.query(
        `INSERT INTO push_subscriptions
           (user_id, endpoint_hash, endpoint_ciphertext, p256dh_ciphertext, auth_ciphertext, endpoint_fingerprint)
         VALUES ($1, $2, $3, 'k', 'k', 'fp')`,
        [sponsorUser, "h".repeat(64), "x".repeat(8001)],
      ),
      "push_subscriptions_endpoint_ciphertext_check",
    );
  });

  it("returns 401 to an anonymous inbox request and keeps locale fallbacks", async () => {
    const { notifications, locales } = services();
    // Exercise the composed Najm HTTP pipeline, not the guard in isolation.
    const anonymous = await server.fetch(
      new Request("http://localhost/api/notifications"),
    );
    expect(anonymous.status).toBe(401);

    // Locale precedence through the real resolver and real settings rows:
    // applicant payload first, then explicit settings, then the family
    // Arabic default, then English.
    const localeUser = await createUser("locale");
    extraUserIds.push(localeUser);
    expect(
      await inRequestScope(() => locales.resolve(localeUser, "other", {})),
    ).toBe("en");
    await inRequestScope(() =>
      notifications.updateSettings(localeUser, { locale: "fr" }),
    );
    expect(
      await inRequestScope(() => locales.resolve(localeUser, "other", {})),
    ).toBe("fr");
    expect(
      await inRequestScope(() => locales.resolve(localeUser, "other", { locale: "ar" })),
    ).toBe("ar");

    const localeFamily = await createUser("locale-family");
    extraUserIds.push(localeFamily);
    await pool.query(
      `INSERT INTO family_profiles
         (user_id, guardian_legal_name, guardian_cin, exact_address,
          housing_situation, registration_date, created_by_user_id, funding_target_minor)
       VALUES ($1, 'Locale Fixture', $2, 'Locale address', 'rented', '2025-02-01', $3, 100000)`,
      [localeFamily, `GL${suffix}`, actorUser],
    );
    expect(
      await inRequestScope(() => locales.resolve(localeFamily, "family", {})),
    ).toBe("ar");
    expect(
      await inRequestScope(() => notifications.getSettings("guard-missing-user")),
    ).toEqual({ locale: "en" });
  });
});
