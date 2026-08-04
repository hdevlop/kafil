import { and, eq } from "drizzle-orm";
import { Repository } from "najm-core";
import { DB } from "najm-database";

import type { KafilDatabase } from "../../database/types";
import { familyPasswordRequirements } from "./accessSchema";

@Repository("default")
export class AccessRepository {
  @DB() private db!: KafilDatabase;

  async requireFamilyPasswordChange(userId: string) {
    const [requirement] = await this.db
      .insert(familyPasswordRequirements)
      .values({ userId })
      .onConflictDoUpdate({
        target: familyPasswordRequirements.userId,
        set: {
          required: true,
          completedAt: null,
          updatedAt: new Date(),
        },
      })
      .returning();
    return requirement;
  }

  async requiresFamilyPasswordChange(userId: string) {
    const [requirement] = await this.db
      .select({ required: familyPasswordRequirements.required })
      .from(familyPasswordRequirements)
      .where(eq(familyPasswordRequirements.userId, userId))
      .limit(1);
    return requirement?.required ?? false;
  }

  async completeFamilyPasswordChange(userId: string) {
    const now = new Date();
    const [requirement] = await this.db
      .update(familyPasswordRequirements)
      .set({ required: false, completedAt: now, updatedAt: now })
      .where(
        and(
          eq(familyPasswordRequirements.userId, userId),
          eq(familyPasswordRequirements.required, true),
        ),
      )
      .returning();
    return requirement;
  }
}
