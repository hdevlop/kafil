import { index, integer, jsonb, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import { timestamps } from "../../database/columns";
import { outboxEventStatusEnum } from "../../database/enums";

export const outboxEvents = pgTable(
  "outbox_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    topic: varchar("topic", { length: 120 }).notNull(),
    aggregateType: varchar("aggregate_type", { length: 80 }).notNull(),
    aggregateId: text("aggregate_id").notNull(),
    payload: jsonb("payload").$type<Record<string, string | number | boolean | null>>().notNull(),
    status: outboxEventStatusEnum("status").default("pending").notNull(),
    attempts: integer("attempts").default(0).notNull(),
    availableAt: timestamp("available_at", { withTimezone: true }).defaultNow().notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    lastError: text("last_error"),
    ...timestamps(),
  },
  (table) => [
    index("outbox_events_status_available_at_idx").on(table.status, table.availableAt),
    index("outbox_events_aggregate_idx").on(table.aggregateType, table.aggregateId),
  ],
);

export type NewOutboxEvent = typeof outboxEvents.$inferInsert;

export const outboxSchema = { outboxEvents };
