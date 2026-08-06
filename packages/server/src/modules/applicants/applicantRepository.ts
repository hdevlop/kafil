import { and, desc, eq, gt, ilike, isNull, or, sql } from "drizzle-orm";
import { credentialSetupSessionsTable, usersTable } from "najm-auth/pg";
import { Repository } from "najm-core";
import { DB } from "najm-database";

import type { KafilDatabase } from "../../database/types";
import {
  applicants,
  applicantEmailOtpChallenges,
  type NewApplicant,
  type NewApplicantEmailOtpChallenge,
} from "./applicantSchema";

type ApplicantStatusFilter =
  | "pending_email_verification"
  | "pending_review"
  | "approved"
  | "rejected";

const applicantSelection = {
  id: applicants.id,
  authUserId: applicants.authUserId,
  name: applicants.name,
  email: applicants.email,
  phone: applicants.phone,
  cin: applicants.cin,
  gender: applicants.gender,
  status: applicants.status,
  submittedAt: applicants.submittedAt,
  reviewedAt: applicants.reviewedAt,
  reviewedByUserId: applicants.reviewedByUserId,
  rejectionReason: applicants.rejectionReason,
  createdAt: applicants.createdAt,
  updatedAt: applicants.updatedAt,
};

const applicantListSelection = {
  ...applicantSelection,
};

const applicantChallengeSelection = {
  id: applicantEmailOtpChallenges.id,
  applicantId: applicantEmailOtpChallenges.applicantId,
  authUserId: applicantEmailOtpChallenges.authUserId,
  codeHash: applicantEmailOtpChallenges.codeHash,
  expiresAt: applicantEmailOtpChallenges.expiresAt,
  resendAvailableAt: applicantEmailOtpChallenges.resendAvailableAt,
  attemptsRemaining: applicantEmailOtpChallenges.attemptsRemaining,
  emailSent: applicantEmailOtpChallenges.emailSent,
  locale: applicantEmailOtpChallenges.locale,
  consumedAt: applicantEmailOtpChallenges.consumedAt,
  createdAt: applicantEmailOtpChallenges.createdAt,
  updatedAt: applicantEmailOtpChallenges.updatedAt,
};

export interface ApplicantRecord {
  id: string;
  authUserId: string;
  name: string;
  email: string;
  phone: string;
  cin: string;
  gender: "M" | "F";
  status: "pending_email_verification" | "pending_review" | "approved" | "rejected";
  submittedAt: Date;
  reviewedAt: Date | null;
  reviewedByUserId: string | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApplicantChallengeRecord {
  id: string;
  applicantId: string;
  authUserId: string;
  codeHash: string;
  expiresAt: Date;
  resendAvailableAt: Date;
  attemptsRemaining: number;
  emailSent: boolean;
  locale: string;
  consumedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

function mapApplicant(row: typeof applicants.$inferSelect): ApplicantRecord {
  return { ...row, gender: row.gender as "M" | "F" };
}

function mapChallenge(
  row: typeof applicantEmailOtpChallenges.$inferSelect,
): ApplicantChallengeRecord {
  return { ...row };
}

export interface ApplicantListFilters {
  status?: ApplicantStatusFilter;
  search?: string;
}

/** The one place the applicant list decides which rows it is about. */
function buildApplicantListCondition(filters: ApplicantListFilters) {
  const conditions = [];
  if (filters.status) {
    conditions.push(eq(applicants.status, filters.status));
  }
  if (filters.search) {
    const pattern = `%${filters.search.replace(/[%_]/g, (m) => `\\${m}`)}%`;
    const searchOr = or(
      ilike(applicants.name, pattern),
      ilike(applicants.email, pattern),
      ilike(applicants.phone, pattern),
    );
    if (searchOr) conditions.push(searchOr);
  }
  return conditions.length > 0 ? and(...conditions) : undefined;
}

@Repository("default")
export class ApplicantRepository {
  @DB() private db!: KafilDatabase;

  async list(
    limit: number,
    offset: number,
    filters: ApplicantListFilters = {},
  ) {
    const whereClause = buildApplicantListCondition(filters);
    const rows = await this.db
      .select(applicantListSelection)
      .from(applicants)
      .where(whereClause)
      .orderBy(desc(applicants.submittedAt), desc(applicants.id))
      .limit(limit)
      .offset(offset);
    return rows.map(mapApplicant);
  }

  /**
   * Rows matching `filters`, ignoring the page window. Shares
   * `buildApplicantListCondition` with `list` so the two cannot diverge.
   */
  async count(filters: ApplicantListFilters = {}) {
    const [row] = await this.db
      .select({ total: sql<number>`count(*)::int` })
      .from(applicants)
      .where(buildApplicantListCondition(filters));
    return Number(row?.total ?? 0);
  }

  async findById(id: string) {
    const [row] = await this.db
      .select(applicantSelection)
      .from(applicants)
      .where(eq(applicants.id, id))
      .limit(1);
    return row ? mapApplicant(row) : undefined;
  }

  async findByIdForUpdate(id: string) {
    const [row] = await this.db
      .select(applicantSelection)
      .from(applicants)
      .where(eq(applicants.id, id))
      .for("update")
      .limit(1);
    return row ? mapApplicant(row) : undefined;
  }

  async findAuthUserByIdForUpdate(id: string) {
    const [row] = await this.db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        name: usersTable.name,
        emailVerified: usersTable.emailVerified,
        status: usersTable.status,
      })
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .for("update")
      .limit(1);
    return row;
  }

  async revokeCredentialSetupSessions(authUserId: string, revokedAt: Date) {
    const revokedAtIso = revokedAt.toISOString();
    return this.db
      .update(credentialSetupSessionsTable)
      .set({ revokedAt: revokedAtIso, updatedAt: revokedAtIso })
      .where(
        and(
          eq(credentialSetupSessionsTable.userId, authUserId),
          isNull(credentialSetupSessionsTable.consumedAt),
          isNull(credentialSetupSessionsTable.revokedAt),
        ),
      )
      .returning({ id: credentialSetupSessionsTable.id });
  }

  async countByStatus(status: ApplicantStatusFilter) {
    const [row] = await this.db
      .select({ value: sql<number>`count(*)::int` })
      .from(applicants)
      .where(eq(applicants.status, status));
    return Number(row?.value ?? 0);
  }

  async findByAuthUserId(authUserId: string) {
    const [row] = await this.db
      .select(applicantSelection)
      .from(applicants)
      .where(eq(applicants.authUserId, authUserId))
      .limit(1);
    return row ? mapApplicant(row) : undefined;
  }

  async findByEmailInsensitive(email: string) {
    const [row] = await this.db
      .select(applicantSelection)
      .from(applicants)
      .where(sql`lower(${applicants.email}) = lower(${email})`)
      .limit(1);
    return row ? mapApplicant(row) : undefined;
  }

  async findByPhone(phone: string) {
    const [row] = await this.db
      .select(applicantSelection)
      .from(applicants)
      .where(eq(applicants.phone, phone))
      .limit(1);
    return row ? mapApplicant(row) : undefined;
  }

  async findByCin(cin: string) {
    const [row] = await this.db
      .select(applicantSelection)
      .from(applicants)
      .where(sql`upper(${applicants.cin}) = upper(${cin})`)
      .limit(1);
    return row ? mapApplicant(row) : undefined;
  }

  async create(data: NewApplicant) {
    const [row] = await this.db
      .insert(applicants)
      .values(data)
      .returning(applicantSelection);
    return row ? mapApplicant(row) : undefined;
  }

  async updateIdentity(
    id: string,
    data: Pick<
      NewApplicant,
      "name" | "email" | "phone" | "cin" | "gender"
    >,
  ) {
    const [row] = await this.db
      .update(applicants)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(applicants.id, id))
      .returning(applicantSelection);
    return row ? mapApplicant(row) : undefined;
  }

  async markReviewPending(id: string) {
    const now = new Date();
    const [row] = await this.db
      .update(applicants)
      .set({ status: "pending_review", updatedAt: now })
      .where(
        and(eq(applicants.id, id), eq(applicants.status, "pending_email_verification")),
      )
      .returning(applicantSelection);
    return row ? mapApplicant(row) : undefined;
  }

  async approve(
    id: string,
    reviewerUserId: string,
    expectedStatus: ApplicantStatusFilter,
    reviewedAt: Date,
  ) {
    const [row] = await this.db
      .update(applicants)
      .set({
        status: "approved",
        reviewedAt,
        reviewedByUserId: reviewerUserId,
        rejectionReason: null,
        updatedAt: reviewedAt,
      })
      .where(
        and(
          eq(applicants.id, id),
          eq(applicants.status, expectedStatus),
        ),
      )
      .returning(applicantSelection);
    return row ? mapApplicant(row) : undefined;
  }

  async reject(
    id: string,
    reviewerUserId: string,
    expectedStatus: ApplicantStatusFilter,
    reason: string,
    reviewedAt: Date,
  ) {
    const [row] = await this.db
      .update(applicants)
      .set({
        status: "rejected",
        reviewedAt,
        reviewedByUserId: reviewerUserId,
        rejectionReason: reason,
        updatedAt: reviewedAt,
      })
      .where(
        and(
          eq(applicants.id, id),
          eq(applicants.status, expectedStatus),
        ),
      )
      .returning(applicantSelection);
    return row ? mapApplicant(row) : undefined;
  }

  async findChallengeByApplicant(applicantId: string) {
    const [row] = await this.db
      .select(applicantChallengeSelection)
      .from(applicantEmailOtpChallenges)
      .where(eq(applicantEmailOtpChallenges.applicantId, applicantId))
      .limit(1);
    return row ? mapChallenge(row) : undefined;
  }

  async replaceChallenge(data: NewApplicantEmailOtpChallenge) {
    const [row] = await this.db
      .insert(applicantEmailOtpChallenges)
      .values(data)
      .onConflictDoUpdate({
        target: applicantEmailOtpChallenges.applicantId,
        set: {
          codeHash: data.codeHash,
          expiresAt: data.expiresAt,
          resendAvailableAt: data.resendAvailableAt,
          attemptsRemaining: data.attemptsRemaining,
          emailSent: data.emailSent,
          locale: data.locale,
          consumedAt: null,
          updatedAt: new Date(),
        },
      })
      .returning(applicantChallengeSelection);
    return row ? mapChallenge(row) : undefined;
  }

  async setChallengeDelivery(
    applicantId: string,
    codeHash: string,
    emailSent: boolean,
  ) {
    const [row] = await this.db
      .update(applicantEmailOtpChallenges)
      .set({ emailSent, updatedAt: new Date() })
      .where(
        and(
          eq(applicantEmailOtpChallenges.applicantId, applicantId),
          eq(applicantEmailOtpChallenges.codeHash, codeHash),
          isNull(applicantEmailOtpChallenges.consumedAt),
        ),
      )
      .returning({ emailSent: applicantEmailOtpChallenges.emailSent });
    return row;
  }

  async decrementChallengeAttempts(applicantId: string, codeHash: string) {
    const now = new Date();
    const [row] = await this.db
      .update(applicantEmailOtpChallenges)
      .set({
        attemptsRemaining: sql`greatest(${applicantEmailOtpChallenges.attemptsRemaining} - 1, 0)`,
        consumedAt: sql`CASE WHEN ${applicantEmailOtpChallenges.attemptsRemaining} <= 1 THEN ${now} ELSE ${applicantEmailOtpChallenges.consumedAt} END`,
        updatedAt: now,
      })
      .where(
        and(
          eq(applicantEmailOtpChallenges.applicantId, applicantId),
          eq(applicantEmailOtpChallenges.codeHash, codeHash),
          isNull(applicantEmailOtpChallenges.consumedAt),
          gt(applicantEmailOtpChallenges.expiresAt, now),
        ),
      )
      .returning({ attemptsRemaining: applicantEmailOtpChallenges.attemptsRemaining });
    return row;
  }

  async consumeChallenge(applicantId: string, codeHash: string) {
    const now = new Date();
    const [row] = await this.db
      .update(applicantEmailOtpChallenges)
      .set({ consumedAt: now, updatedAt: now })
      .where(
        and(
          eq(applicantEmailOtpChallenges.applicantId, applicantId),
          eq(applicantEmailOtpChallenges.codeHash, codeHash),
          isNull(applicantEmailOtpChallenges.consumedAt),
          gt(applicantEmailOtpChallenges.expiresAt, now),
        ),
      )
      .returning(applicantChallengeSelection);
    return row ? mapChallenge(row) : undefined;
  }

  async revokeChallenge(applicantId: string) {
    const now = new Date();
    await this.db
      .update(applicantEmailOtpChallenges)
      .set({ consumedAt: now, updatedAt: now })
      .where(
        and(
          eq(applicantEmailOtpChallenges.applicantId, applicantId),
          isNull(applicantEmailOtpChallenges.consumedAt),
        ),
      );
  }
}
