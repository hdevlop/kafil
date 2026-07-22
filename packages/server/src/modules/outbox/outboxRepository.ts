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
}
