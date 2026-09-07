import { EmailService } from "najm-email";
import { HttpError, Service } from "najm-core";

import { envConfig } from "../../config/envConfig";
import { notificationFlags } from "./notificationConfig";
import { NotificationLocaleResolver } from "./localeResolver";
import { NotificationRecipientResolver } from "./recipientResolver";
import { NotificationRepository } from "./notificationRepository";
import { buildEmail, buildPushBody } from "./notificationTemplates";
import {
  CHANNEL_MATRIX,
  buildTopicPayload,
  isSupportedNotificationTopic,
  type NotificationTopic,
} from "./notificationTopics";
import { PushSender } from "./pushSender";
import { PushCryptoService } from "./pushCrypto";

@Service()
export class NotificationDispatcher {
  constructor(
    private readonly notifications: NotificationRepository,
    private readonly recipients: NotificationRecipientResolver,
    private readonly locales: NotificationLocaleResolver,
    private readonly email: EmailService,
    private readonly push: PushSender,
    private readonly crypto: PushCryptoService,
  ) {}

  async dispatchConsumerJob(job: {
    id: string;
    outboxEventId: string;
    attempts: number;
  }) {
    const at = new Date();
    const event = await this.notifications.loadOutboxEvent(job.outboxEventId);
    if (!event) {
      await this.notifications.markConsumerDead(job.id, "missing_event", at);
      return;
    }
    if (!isSupportedNotificationTopic(event.topic)) {
      await this.notifications.markConsumerDead(job.id, "unsupported_topic", at);
      return;
    }
    const topic = event.topic as NotificationTopic;
    const rawPayload = (event.payload ?? {}) as Record<
      string,
      string | number | boolean | null
    >;
    // Applicant locale travels on the event payload (captured at OTP time).
    const resolved = await this.recipients.resolve(
      topic,
      event.aggregateType,
      event.aggregateId,
      event.createdAt ?? at,
    );
    if (resolved.all.length === 0) {
      await this.notifications.markConsumerDead(job.id, "no_recipients", at);
      return;
    }

    const topicPayload = buildTopicPayload(topic, {
      ...rawPayload,
      ...(typeof rawPayload["locale"] === "string"
        ? { locale: rawPayload["locale"] }
        : {}),
    });

    const inboxRows = [];
    for (const recipientUserId of resolved.all) {
      const kind =
        resolved.familyUserId === recipientUserId
          ? "family"
          : resolved.applicantUserId === recipientUserId
            ? "applicant"
            : "other";
      const locale = await this.locales.resolve(recipientUserId, kind, {
        ...rawPayload,
        ...topicPayload,
      });
      inboxRows.push({
        sourceEventId: event.id,
        recipientUserId,
        actorUserId: event.actorUserId ?? null,
        topic,
        aggregateType: event.aggregateType.slice(0, 80),
        aggregateId: event.aggregateId.slice(0, 500),
        locale,
        payload: topicPayload,
        createdAt: at,
        updatedAt: at,
      });
    }

    // Idempotent fan-out: replaying the same event never duplicates inbox rows.
    // One failed recipient channel never rolls back another recipient's inbox.
    let created: Array<{ id: string; recipientUserId: string; locale: string }> = [];
    try {
      created = await this.notifications.createNotifications(inboxRows);
    } catch {
      await this.notifications.markConsumerFailed(job.id, "fanout_failed", at);
      return;
    }

    // Rows that already existed (replay) still need channel jobs when the
    // matrix requires them, so reload the full event set.
    const existing = await this.notifications.findNotificationsByEvent(event.id);
    const byRecipient = new Map<string, { id: string; recipientUserId: string; locale: string }>(
      existing.map((row) => [row.recipientUserId, { id: row.id, recipientUserId: row.recipientUserId, locale: row.locale }]),
    );
    for (const row of created) byRecipient.set(row.recipientUserId, row);

    try {
      await this.createChannelJobs(topic, [...byRecipient.values()]);
    } catch {
      await this.notifications.markConsumerFailed(job.id, "channel_failed", at);
      return;
    }

    await this.notifications.markConsumerSent(job.id, new Date());
  }

  private async createChannelJobs(
    topic: NotificationTopic,
    rows: Array<{ id: string; recipientUserId: string; locale: string }>,
  ) {
    const matrix = CHANNEL_MATRIX[topic];
    const at = new Date();
    const deliveries: Array<{
      notificationId: string;
      channel: "email" | "push";
      targetKey: string;
      pushSubscriptionId: string | null;
      createdAt: Date;
      updatedAt: Date;
    }> = [];

    for (const row of rows) {
      const kind = await this.locales.kindForRecipient(row.recipientUserId);
      const isFamily = kind === "family";
      const isApplicantRow = topic.startsWith("applicant.");

      // Phase C: the dispatcher owns applicant decision email. The legacy
      // ApplicantService direct sender was removed in the same change, so
      // exactly one owner creates applicant email jobs. Families are never
      // emailed in v1: every email job requires a non-family recipient.
      if (notificationFlags.emailEnabled && !isFamily) {
        const wantsEmail =
          (!isApplicantRow && matrix.sponsorEmail) ||
          (isApplicantRow && matrix.applicantEmail);
        if (wantsEmail) {
          deliveries.push({
            notificationId: row.id,
            channel: "email",
            targetKey: `user:${row.recipientUserId}`,
            pushSubscriptionId: null,
            createdAt: at,
            updatedAt: at,
          });
        }
      }

      if (notificationFlags.pushEnabled) {
        const wantsPush =
          (isFamily && matrix.familyPush) ||
          (!isFamily && !isApplicantRow && matrix.sponsorPush) ||
          (isApplicantRow && matrix.sponsorPush && kind !== "family");
        if (wantsPush) {
          const subscriptions = await this.notifications.listActiveSubscriptions(
            row.recipientUserId,
          );
          for (const sub of subscriptions) {
            deliveries.push({
              notificationId: row.id,
              channel: "push",
              targetKey: `sub:${sub.id}`,
              pushSubscriptionId: sub.id,
              createdAt: at,
              updatedAt: at,
            });
          }
        }
      }
    }

    await this.notifications.createDeliveries(deliveries);
  }

  async dispatchDeliveryJob(job: {
    id: string;
    notificationId: string;
    channel: string;
    targetKey: string;
    pushSubscriptionId: string | null;
  }) {
    const at = new Date();
    if (job.channel !== "email" && job.channel !== "push") {
      await this.notifications.markDeliveryDead(job.id, "unsupported_channel", at);
      return;
    }
    const notification = await this.notifications.loadNotification(job.notificationId);
    if (!notification) {
      await this.notifications.markDeliveryDead(job.id, "missing_notification", at);
      return;
    }
    if (!isSupportedNotificationTopic(notification.topic)) {
      await this.notifications.markDeliveryDead(job.id, "unsupported_topic", at);
      return;
    }
    const topic = notification.topic as NotificationTopic;

    if (job.channel === "email") {
      await this.sendEmail(job.id, topic, notification);
      return;
    }
    await this.sendPush(job.id, topic, notification, job.pushSubscriptionId);
  }

  private async sendEmail(
    deliveryId: string,
    topic: NotificationTopic,
    notification: {
      id: string;
      recipientUserId: string;
      locale: string;
      payload: Record<string, string | number | boolean | null>;
    },
  ) {
    const at = new Date();
    const user = await this.notifications.findUserForDelivery(
      notification.recipientUserId,
    );
    // Rejected applicants are inactive but email remains the usable decision
    // channel (plan §3.5). Applicant topics therefore require a verified
    // address but bypass the active-status gate; all other topics still
    // require an active account.
    const isApplicantTopic = topic.startsWith("applicant.");
    const statusOk = isApplicantTopic
      ? user?.status === "active" ||
        user?.status === "inactive" ||
        user?.status === "pending"
      : user?.status === "active";
    if (!user || !user.emailVerified || !statusOk || !user.email) {
      await this.notifications.markDeliverySkipped(deliveryId, "no_verified_email", at);
      return;
    }
    const locale = (["en", "fr", "ar", "es"] as const).includes(
      notification.locale as "en",
    )
      ? (notification.locale as "en" | "fr" | "ar" | "es")
      : "en";
    // Resolve the current display name at delivery time so decision emails
    // keep the legacy direct sender's personal greeting without snapshotting
    // stale applicant-form data onto the notification row.
    const recipientName =
      typeof user.name === "string" && user.name.length > 0 ? user.name : null;
    const email = buildEmail(
      topic,
      locale,
      notification.payload,
      recipientName,
      approvalLoginUrl(),
    );
    try {
      // External email is at-least-once, not exactly-once: a worker crash
      // between the provider send and markDeliverySent leaves a processing
      // job that the five-minute stale-lease reclaim will redeliver. The
      // unique (notification_id, channel, target_key) key prevents duplicate
      // jobs, not duplicate transport. The stable X-Kafil-Delivery-Id header
      // lets operators correlate a redelivery with its first attempt. Never
      // persist the recipient address outside the provider call.
      const result = await this.email.send({
        to: user.email,
        subject: email.subject,
        text: email.text,
        html: email.html,
        headers: { "X-Kafil-Delivery-Id": deliveryId },
      });
      if (!result.success) {
        const failure = classifyEmailFailure(result.error, result.response);
        if (failure.transient) {
          await this.notifications.markDeliveryFailed(deliveryId, failure.code, new Date());
        } else {
          await this.notifications.markDeliveryDead(deliveryId, failure.code, new Date());
        }
        return;
      }
      await this.notifications.markDeliverySent(deliveryId, new Date());
    } catch (error) {
      const failure = classifyEmailFailure(error, undefined);
      if (failure.transient) {
        await this.notifications.markDeliveryFailed(deliveryId, failure.code, new Date());
      } else {
        await this.notifications.markDeliveryDead(deliveryId, failure.code, new Date());
      }
    }
  }

  private async sendPush(
    deliveryId: string,
    topic: NotificationTopic,
    notification: {
      id: string;
      recipientUserId: string;
      locale: string;
      payload: Record<string, string | number | boolean | null>;
    },
    pushSubscriptionId: string | null,
  ) {
    const at = new Date();
    if (!pushSubscriptionId) {
      await this.notifications.markDeliverySkipped(deliveryId, "no_subscription", at);
      return;
    }
    const subscription = await this.notifications.findSubscription(pushSubscriptionId);
    if (
      !subscription ||
      subscription.disabledAt ||
      subscription.userId !== notification.recipientUserId
    ) {
      await this.notifications.markDeliverySkipped(deliveryId, "no_subscription", at);
      return;
    }
    let target;
    try {
      target = {
        endpoint: this.crypto.decryptField(subscription.endpointCiphertext),
        p256dh: this.crypto.decryptField(subscription.p256dhCiphertext),
        auth: this.crypto.decryptField(subscription.authCiphertext),
      };
    } catch {
      await this.notifications.markDeliveryDead(deliveryId, "push_decrypt_failed", at);
      return;
    }
    const locale = (["en", "fr", "ar", "es"] as const).includes(
      notification.locale as "en",
    )
      ? (notification.locale as "en" | "fr" | "ar" | "es")
      : "en";
    const body = buildPushBody(topic, locale);
    const outcome = await this.push.send(target, {
      notificationId: notification.id,
      title: body.title,
      body: body.body,
    });
    if (outcome.result === "sent") {
      await this.notifications.markSubscriptionSuccess(subscription.id, new Date());
      await this.notifications.markDeliverySent(deliveryId, new Date());
      return;
    }
    if (outcome.result === "gone") {
      // 404/410 disables the subscription; that target completes as skipped.
      await this.notifications.disableSubscription(subscription.id, new Date());
      await this.notifications.markDeliverySkipped(deliveryId, "push_gone", new Date());
      return;
    }
    if (outcome.result === "transient") {
      await this.notifications.markSubscriptionFailure(subscription.id, new Date());
      await this.notifications.markDeliveryFailed(deliveryId, outcome.code, new Date());
      return;
    }
    await this.notifications.markDeliveryDead(deliveryId, outcome.code, new Date());
  }

  ensureOwnership(_userId: string) {
    throw HttpError.notFound("Notification not found");
  }
}

/**
 * Approval login link, resolved at delivery time from the public frontend
 * origin. Returns null when no origin is configured (tests, misconfigured
 * environments) so the template omits the link instead of rendering a
 * broken relative URL.
 */
export function approvalLoginUrl(): string | null {
  const base = envConfig.auth.frontendUrl?.trim().replace(/\/$/, "");
  return base ? `${base}/login` : null;
}

function sanitizeDeliveryCode(value: unknown) {
  const raw =
    value instanceof Error
      ? value.message
      : typeof value === "string"
        ? value
        : String(value ?? "delivery_failed");
  return (
    raw
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 120) || "delivery_failed"
  );
}

function numericHttpStatus(value: unknown): number | null {
  const candidate =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value.trim())
        : null;
  if (
    candidate === null ||
    !Number.isInteger(candidate) ||
    candidate < 100 ||
    candidate > 599
  ) {
    return null;
  }
  return candidate;
}

function providerHttpStatus(response: unknown): number | null {
  if (!response || typeof response !== "object") return null;
  const record = response as Record<string, unknown>;
  for (const key of ["statusCode", "status", "code", "status_code"]) {
    const status = numericHttpStatus(record[key]);
    if (status !== null) return status;
  }
  return null;
}

function providerNameHints(response: unknown): string[] {
  if (!response || typeof response !== "object") return [];
  const record = response as Record<string, unknown>;
  const hints: string[] = [];
  for (const key of ["name", "error", "code", "type"]) {
    const value = record[key];
    if (typeof value === "string" && value.length > 0) hints.push(value);
  }
  return hints;
}

const TRANSIENT_EMAIL_SIGNALS = [
  "timeout",
  "timed_out",
  "timed out",
  "temporar",
  "try_again",
  "try again",
  "retry",
  "retries",
  "rate_limit",
  "ratelimit",
  "too_many",
  "too many",
  "429",
  "5xx",
  "500",
  "502",
  "503",
  "504",
  "network",
  "econn",
  "eai_again",
  "socket",
  "fetch_failed",
  "fetch failed",
  "failed_to_fetch",
  "failed to fetch",
  "connection",
  "unavailable",
  "overloaded",
  "internal_server",
  "internal server",
  "server_error",
  "server error",
  "service_unavailable",
  "service unavailable",
  "bad_gateway",
  "bad gateway",
  "gateway_timeout",
  "gateway timeout",
  "delivery_failed",
];

/**
 * Classify a failed provider send as transient (bounded retry) or permanent
 * (dead-letter). The installed Resend adapter surfaces failures as
 * `{ success: false, error: data.message, response: data }`: the message
 * alone ("Too many requests", "Internal server error") carries no numeric
 * status, so classification must consult the structured `response`
 * (`statusCode`/`name`) before falling back to message substrings. Unknown
 * failures without any transient signal stay permanent, matching the
 * pre-existing contract; the six-attempt ceiling still bounds retries.
 */
export function classifyEmailFailure(
  failure: unknown,
  response: unknown,
): { code: string; transient: boolean } {
  const message =
    failure instanceof Error
      ? failure.message
      : typeof failure === "string"
        ? failure
        : String(failure ?? "delivery_failed");
  const status = providerHttpStatus(response);
  const hints = providerNameHints(response);
  const combined = [message, ...hints].join(" ").toLowerCase();
  if (status !== null) {
    const slug = sanitizeDeliveryCode([message, ...hints].join(" "));
    const code = `http_${status}_${slug}`.slice(0, 120) || `http_${status}`;
    return { code, transient: status === 429 || status >= 500 };
  }
  const transient = TRANSIENT_EMAIL_SIGNALS.some((signal) =>
    combined.includes(signal),
  );
  return { code: sanitizeDeliveryCode(message), transient };
}
