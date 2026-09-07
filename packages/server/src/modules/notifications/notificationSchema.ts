import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { usersTable } from "najm-auth/pg";

import { timestamps } from "../../database/columns";
import { outboxEvents } from "../outbox/outboxSchema";

export const outboxConsumerJobs = pgTable(
  "outbox_consumer_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    outboxEventId: uuid("outbox_event_id")
      .notNull()
      .references(() => outboxEvents.id, { onDelete: "cascade" }),
    consumerKey: varchar("consumer_key", { length: 80 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    attempts: integer("attempts").default(0).notNull(),
    availableAt: timestamp("available_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    leasedAt: timestamp("leased_at", { withTimezone: true }),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    lastErrorCode: varchar("last_error_code", { length: 120 }),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("outbox_consumer_jobs_event_consumer_unique").on(
      table.outboxEventId,
      table.consumerKey,
    ),
    index("outbox_consumer_jobs_status_available_at_idx").on(
      table.status,
      table.availableAt,
    ),
    check(
      "outbox_consumer_jobs_status_check",
      sql`${table.status} IN ('pending','processing','sent','failed','dead')`,
    ),
    check(
      "outbox_consumer_jobs_attempts_check",
      sql`${table.attempts} >= 0`,
    ),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceEventId: uuid("source_event_id")
      .notNull()
      .references(() => outboxEvents.id, { onDelete: "cascade" }),
    recipientUserId: text("recipient_user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    actorUserId: text("actor_user_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    topic: varchar("topic", { length: 120 }).notNull(),
    aggregateType: varchar("aggregate_type", { length: 80 }).notNull(),
    aggregateId: text("aggregate_id").notNull(),
    locale: varchar("locale", { length: 2 }).notNull(),
    payload: jsonb("payload")
      .$type<Record<string, string | number | boolean | null>>()
      .notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("notifications_source_recipient_unique").on(
      table.sourceEventId,
      table.recipientUserId,
    ),
    index("notifications_recipient_read_created_idx").on(
      table.recipientUserId,
      table.readAt,
      table.createdAt,
      table.id,
    ),
    index("notifications_aggregate_idx").on(
      table.aggregateType,
      table.aggregateId,
    ),
    check(
      "notifications_locale_check",
      sql`${table.locale} IN ('en','fr','ar','es')`,
    ),
    check(
      "notifications_read_at_check",
      sql`${table.readAt} IS NULL OR ${table.readAt} >= ${table.createdAt}`,
    ),
    check(
      "notifications_aggregate_id_check",
      sql`char_length(${table.aggregateId}) >= 1 AND char_length(${table.aggregateId}) <= 500`,
    ),
    check(
      "notifications_payload_size_check",
      sql`octet_length((${table.payload})::text) <= 20000`,
    ),
  ],
);

export const notificationDeliveries = pgTable(
  "notification_deliveries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    notificationId: uuid("notification_id")
      .notNull()
      .references(() => notifications.id, { onDelete: "cascade" }),
    channel: varchar("channel", { length: 20 }).notNull(),
    targetKey: varchar("target_key", { length: 160 }).notNull(),
    pushSubscriptionId: uuid("push_subscription_id").references(
      () => pushSubscriptions.id,
      { onDelete: "set null" },
    ),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    attempts: integer("attempts").default(0).notNull(),
    availableAt: timestamp("available_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    leasedAt: timestamp("leased_at", { withTimezone: true }),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    lastErrorCode: varchar("last_error_code", { length: 120 }),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("notification_deliveries_notification_channel_target_unique").on(
      table.notificationId,
      table.channel,
      table.targetKey,
    ),
    index("notification_deliveries_status_available_at_idx").on(
      table.status,
      table.availableAt,
    ),
    check(
      "notification_deliveries_channel_check",
      sql`${table.channel} IN ('email','push')`,
    ),
    check(
      "notification_deliveries_status_check",
      sql`${table.status} IN ('pending','processing','sent','failed','skipped','dead')`,
    ),
    check(
      "notification_deliveries_attempts_check",
      sql`${table.attempts} >= 0`,
    ),
  ],
);

export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    endpointHash: varchar("endpoint_hash", { length: 64 }).notNull().unique(),
    endpointCiphertext: text("endpoint_ciphertext").notNull(),
    p256dhCiphertext: text("p256dh_ciphertext").notNull(),
    authCiphertext: text("auth_ciphertext").notNull(),
    endpointFingerprint: varchar("endpoint_fingerprint", {
      length: 16,
    }).notNull(),
    userAgentFamily: varchar("user_agent_family", { length: 80 }),
    lastSuccessAt: timestamp("last_success_at", { withTimezone: true }),
    lastFailureAt: timestamp("last_failure_at", { withTimezone: true }),
    disabledAt: timestamp("disabled_at", { withTimezone: true }),
    ...timestamps(),
  },
  (table) => [
    index("push_subscriptions_user_disabled_idx").on(
      table.userId,
      table.disabledAt,
    ),
    check(
      "push_subscriptions_endpoint_ciphertext_check",
      sql`char_length(${table.endpointCiphertext}) >= 1 AND char_length(${table.endpointCiphertext}) <= 8000`,
    ),
    check(
      "push_subscriptions_p256dh_ciphertext_check",
      sql`char_length(${table.p256dhCiphertext}) >= 1 AND char_length(${table.p256dhCiphertext}) <= 4000`,
    ),
    check(
      "push_subscriptions_auth_ciphertext_check",
      sql`char_length(${table.authCiphertext}) >= 1 AND char_length(${table.authCiphertext}) <= 4000`,
    ),
  ],
);

export const notificationSettings = pgTable(
  "notification_settings",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    locale: varchar("locale", { length: 2 }).notNull(),
    ...timestamps(),
  },
  (table) => [
    check(
      "notification_settings_locale_check",
      sql`${table.locale} IN ('en','fr','ar','es')`,
    ),
  ],
);

export type OutboxConsumerJob = typeof outboxConsumerJobs.$inferSelect;
export type NewOutboxConsumerJob = typeof outboxConsumerJobs.$inferInsert;
export type NotificationRecord = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type NotificationDelivery = typeof notificationDeliveries.$inferSelect;
export type NewNotificationDelivery =
  typeof notificationDeliveries.$inferInsert;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type NewPushSubscription = typeof pushSubscriptions.$inferInsert;
export type NotificationSetting = typeof notificationSettings.$inferSelect;

export const notificationSchema = {
  outboxConsumerJobs,
  notifications,
  notificationDeliveries,
  pushSubscriptions,
  notificationSettings,
};
