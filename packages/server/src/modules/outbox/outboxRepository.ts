import { eq, sql } from "drizzle-orm";
import { Repository } from "najm-core";
import { DB } from "najm-database";

import type { KafilDatabase } from "../../database/types";
import { outboxEvents, type NewOutboxEvent } from "./outboxSchema";

@Repository("default")
export class OutboxRepository {
  @DB() private db!: KafilDatabase;

  async create(data: NewOutboxEvent) {
    const [event] = await this.db.insert(outboxEvents).values(data).returning();
    return event;
  }

  async markDelivered(id: string, processedAt: Date) {
    const [event] = await this.db
      .update(outboxEvents)
      .set({
        status: "sent",
        attempts: sql`${outboxEvents.attempts} + 1`,
        processedAt,
        lastError: null,
        updatedAt: processedAt,
      })
      .where(eq(outboxEvents.id, id))
      .returning();
    return event;
  }

  async markDeliveryFailed(
    id: string,
    error: string,
    attemptedAt: Date,
    retryAt: Date,
  ) {
    const [event] = await this.db
      .update(outboxEvents)
      .set({
        status: "failed",
        attempts: sql`${outboxEvents.attempts} + 1`,
        availableAt: retryAt,
        lastError: error.slice(0, 2_000),
        updatedAt: attemptedAt,
      })
      .where(eq(outboxEvents.id, id))
      .returning();
    return event;
  }
}
