import { and, eq, gt, isNull } from "drizzle-orm";
import { Repository } from "najm-core";
import { DB } from "najm-database";

import type { KafilDatabase } from "../../database/types";
import {
  emailVerificationTokens,
  familyPasswordRequirements,
  type NewEmailVerificationToken,
} from "./accessSchema";

@Repository("default")
export class AccessRepository {
  @DB() private db!: KafilDatabase;

  async replaceVerificationToken(data: NewEmailVerificationToken) {
    await this.db
      .update(emailVerificationTokens)
      .set({ usedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(emailVerificationTokens.userId, data.userId),
          isNull(emailVerificationTokens.usedAt),
        ),
      );

    const [token] = await this.db
      .insert(emailVerificationTokens)
      .values(data)
      .returning();
    return token;
  }

  async consumeVerificationToken(tokenHash: string) {
    const now = new Date();
    const [token] = await this.db
      .update(emailVerificationTokens)
      .set({ usedAt: now, updatedAt: now })
      .where(
        and(
          eq(emailVerificationTokens.tokenHash, tokenHash),
          isNull(emailVerificationTokens.usedAt),
          gt(emailVerificationTokens.expiresAt, now),
        ),
      )
      .returning({ userId: emailVerificationTokens.userId });
    return token;
  }

  async findVerificationToken(tokenHash: string) {
    const [token] = await this.db
      .select()
      .from(emailVerificationTokens)
      .where(eq(emailVerificationTokens.tokenHash, tokenHash))
      .limit(1);
    return token;
  }

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
