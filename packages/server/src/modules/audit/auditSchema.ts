import { index, jsonb, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "najm-auth/pg";

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorUserId: text("actor_user_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    action: varchar("action", { length: 120 }).notNull(),
    resource: varchar("resource", { length: 120 }).notNull(),
    resourceId: text("resource_id").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull(),
    requestId: varchar("request_id", { length: 120 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("audit_events_actor_user_id_idx").on(table.actorUserId),
    index("audit_events_resource_resource_id_idx").on(
      table.resource,
      table.resourceId,
    ),
  ],
);

export type AuditEvent = typeof auditEvents.$inferSelect;
export type NewAuditEvent = typeof auditEvents.$inferInsert;

export const auditSchema = {
  auditEvents,
};
