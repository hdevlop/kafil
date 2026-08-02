import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { Repository } from "najm-core";
import { DB } from "najm-database";

import type { KafilDatabase } from "../../database/types";
import {
  familyPasswordRequirements,
  sponsorEmailOtpChallenges,
  type NewSponsorEmailOtpChallenge,
} from "./accessSchema";

@Repository("default")
export class AccessRepository {
  @DB() private db!: KafilDatabase;

  async replaceSponsorEmailOtpChallenge(data: NewSponsorEmailOtpChallenge) {
    const [challenge] = await this.db
      .insert(sponsorEmailOtpChallenges)
      .values(data)
      .onConflictDoUpdate({
        target: sponsorEmailOtpChallenges.userId,
        set: {
          codeHash: data.codeHash,
          expiresAt: data.expiresAt,
          resendAvailableAt: data.resendAvailableAt,
          attemptsRemaining: data.attemptsRemaining,
          rememberMe: data.rememberMe,
          emailSent: data.emailSent,
          locale: data.locale,
          consumedAt: null,
          updatedAt: new Date(),
        },
      })
      .returning();
    return challenge;
  }

  async findSponsorEmailOtpChallenge(userId: string) {
    const [challenge] = await this.db
      .select()
      .from(sponsorEmailOtpChallenges)
      .where(eq(sponsorEmailOtpChallenges.userId, userId))
      .limit(1);
    return challenge;
  }

  async setSponsorEmailOtpDelivery(userId: string, codeHash: string, emailSent: boolean) {
    const [challenge] = await this.db
      .update(sponsorEmailOtpChallenges)
      .set({ emailSent, updatedAt: new Date() })
      .where(and(
        eq(sponsorEmailOtpChallenges.userId, userId),
        eq(sponsorEmailOtpChallenges.codeHash, codeHash),
        isNull(sponsorEmailOtpChallenges.consumedAt),
      ))
      .returning({ emailSent: sponsorEmailOtpChallenges.emailSent });
    return challenge;
  }

  async decrementSponsorEmailOtpAttempts(userId: string, codeHash: string) {
    const now = new Date();
    const [challenge] = await this.db
      .update(sponsorEmailOtpChallenges)
      .set({
        attemptsRemaining: sql`${sponsorEmailOtpChallenges.attemptsRemaining} - 1`,
        consumedAt: sql`CASE WHEN ${sponsorEmailOtpChallenges.attemptsRemaining} <= 1 THEN ${now} ELSE ${sponsorEmailOtpChallenges.consumedAt} END`,
        updatedAt: now,
      })
      .where(and(
        eq(sponsorEmailOtpChallenges.userId, userId),
        eq(sponsorEmailOtpChallenges.codeHash, codeHash),
        isNull(sponsorEmailOtpChallenges.consumedAt),
        gt(sponsorEmailOtpChallenges.expiresAt, now),
        gt(sponsorEmailOtpChallenges.attemptsRemaining, 0),
      ))
      .returning({ attemptsRemaining: sponsorEmailOtpChallenges.attemptsRemaining });
    return challenge;
  }

  async consumeSponsorEmailOtpChallenge(userId: string, codeHash: string) {
    const now = new Date();
    const [challenge] = await this.db
      .update(sponsorEmailOtpChallenges)
      .set({ consumedAt: now, updatedAt: now })
      .where(and(
        eq(sponsorEmailOtpChallenges.userId, userId),
        eq(sponsorEmailOtpChallenges.codeHash, codeHash),
        isNull(sponsorEmailOtpChallenges.consumedAt),
        gt(sponsorEmailOtpChallenges.expiresAt, now),
        gt(sponsorEmailOtpChallenges.attemptsRemaining, 0),
      ))
      .returning();
    return challenge;
  }

  async revokeSponsorEmailOtpChallenge(userId: string) {
    const now = new Date();
    const [challenge] = await this.db
      .update(sponsorEmailOtpChallenges)
      .set({ consumedAt: now, updatedAt: now })
      .where(and(
        eq(sponsorEmailOtpChallenges.userId, userId),
        isNull(sponsorEmailOtpChallenges.consumedAt),
      ))
      .returning({ userId: sponsorEmailOtpChallenges.userId });
    return challenge;
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
