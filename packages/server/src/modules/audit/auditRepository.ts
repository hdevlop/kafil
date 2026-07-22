import { Repository } from "najm-core";
import { DB } from "najm-database";

import type { KafilDatabase } from "../../database/types";
import { auditEvents, type NewAuditEvent } from "./auditSchema";

@Repository("default")
export class AuditRepository {
  @DB() private db!: KafilDatabase;

  async create(data: NewAuditEvent) {
    const [event] = await this.db.insert(auditEvents).values(data).returning();
    return event;
  }
}
