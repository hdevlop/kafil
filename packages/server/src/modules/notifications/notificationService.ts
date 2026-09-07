import { HttpError, Service } from "najm-core";
import { Transaction } from "najm-database";

import { vapidConfig } from "./notificationConfig";
import {
  type NotificationListQuery,
  notificationListQuery,
  type NotificationSettingsDto,
  notificationSettingsDto,
  type PushSubscriptionDto,
  pushSubscriptionDto,
  type PushUnsubscribeDto,
  pushUnsubscribeDto,
} from "./notificationDto";
import { NotificationRepository } from "./notificationRepository";
import { NotificationValidator } from "./notificationValidator";
import {
  fingerprintForEndpoint,
  hashEndpoint,
  normalizeUserAgentFamily,
  PushCryptoService,
} from "./pushCrypto";
import { AuditService } from "../audit/auditService";

function toProjection(row: {
  id: string;
  topic: string;
  aggregateType: string;
  aggregateId: string;
  locale: string;
  payload: Record<string, string | number | boolean | null>;
  readAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    topic: row.topic,
    aggregateType: row.aggregateType,
    aggregateId: row.aggregateId,
    locale: row.locale,
    payload: row.payload,
    readAt: row.readAt ? row.readAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Service()
export class NotificationService {
  constructor(
    private readonly notifications: NotificationRepository,
    private readonly validator: NotificationValidator,
    private readonly crypto: PushCryptoService,
    private readonly audits: AuditService,
  ) {}

  async listMine(userId: string, query: NotificationListQuery) {
    const parsed = notificationListQuery.parse(query ?? {});
    if (parsed.topic) this.validator.ensureTopicBounded(parsed.topic);
    const { rows, nextCursor } = await this.notifications.listMine(userId, {
      limit: parsed.limit,
      cursor: parsed.cursor,
      unread: parsed.unread,
      topic: parsed.topic,
    });
    return { rows: rows.map(toProjection), nextCursor };
  }

  async unreadCount(userId: string) {
    return { count: await this.notifications.unreadCount(userId) };
  }

  // Every mutation below shares one transaction with its audit write: if
  // auditing fails, the state change rolls back instead of committing
  // silently while the request reports failure.
  @Transaction({ retries: 2 })
  async markRead(userId: string, id: string) {
    const { row, updated, missing } = await this.notifications.markRead(
      id,
      userId,
      new Date(),
    );
    if (missing || !row) HttpError.notFound("Notification not found");
    if (updated) {
      await this.audits.record({
        action: "notifications.markRead",
        actorUserId: userId,
        metadata: { notificationId: row.id, topic: row.topic },
        resource: "notifications",
        resourceId: row.id,
      });
    }
    return { ...toProjection(row), updated };
  }

  @Transaction({ retries: 2 })
  async markAllRead(userId: string) {
    const read = await this.notifications.markAllRead(userId, new Date());
    await this.audits.record({
      action: "notifications.markAllRead",
      actorUserId: userId,
      metadata: { read },
      resource: "notifications",
      resourceId: userId,
    });
    return { read };
  }

  async getSettings(userId: string) {
    const row = await this.notifications.getSettings(userId);
    return { locale: row?.locale ?? "en" };
  }

  @Transaction({ retries: 2 })
  async updateSettings(userId: string, input: NotificationSettingsDto) {
    const parsed = notificationSettingsDto.parse(input);
    const row = await this.notifications.upsertSettings(
      userId,
      parsed.locale,
      new Date(),
    );
    await this.audits.record({
      action: "notifications.updateSettings",
      actorUserId: userId,
      metadata: { locale: row.locale },
      resource: "notifications",
      resourceId: userId,
    });
    return { locale: row.locale };
  }

  pushConfig() {
    return {
      enabled: vapidConfig.configured,
      publicKey: vapidConfig.configured ? vapidConfig.publicKey! : null,
    };
  }

  @Transaction({ retries: 2 })
  async subscribe(userId: string, input: PushSubscriptionDto, userAgent?: string) {
    const parsed = pushSubscriptionDto.parse(input);
    const endpoint = parsed.endpoint;
    const at = new Date();
    const fingerprint = fingerprintForEndpoint(endpoint);
    const row = await this.notifications.upsertSubscription(
      {
        userId,
        endpointHash: hashEndpoint(endpoint),
        endpointCiphertext: this.crypto.encryptField(endpoint),
        p256dhCiphertext: this.crypto.encryptField(parsed.p256dh),
        authCiphertext: this.crypto.encryptField(parsed.auth),
        endpointFingerprint: fingerprint,
        userAgentFamily:
          parsed.userAgentFamily?.slice(0, 80) ??
          normalizeUserAgentFamily(userAgent),
      },
      at,
    );
    await this.audits.record({
      action: "notifications.subscribePush",
      actorUserId: userId,
      metadata: { endpointFingerprint: fingerprint },
      resource: "notifications",
      resourceId: row.id,
    });
    return {
      id: row.id,
      endpointFingerprint: row.endpointFingerprint,
      createdAt: row.createdAt.toISOString(),
    };
  }

  @Transaction({ retries: 2 })
  async unsubscribe(userId: string, input: PushUnsubscribeDto) {
    const parsed = pushUnsubscribeDto.parse(input);
    const fingerprint = fingerprintForEndpoint(parsed.endpoint);
    const removed = await this.notifications.removeSubscriptionByEndpoint(
      userId,
      hashEndpoint(parsed.endpoint),
    );
    if (!removed) HttpError.notFound("Push subscription not found");
    await this.audits.record({
      action: "notifications.unsubscribePush",
      actorUserId: userId,
      metadata: { endpointFingerprint: fingerprint },
      resource: "notifications",
      resourceId: removed.id,
    });
    return { removed: true as const };
  }
}
