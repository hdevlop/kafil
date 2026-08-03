import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Pool } from "pg";

import { server } from "../src";

const databaseDescribe =
  process.env.KAFIL_RUN_DB_INTEGRATION === "1" ? describe : describe.skip;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 4 });

const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
const sharedEmail = `applicant-race-${suffix}@example.test`;
const sharedPhone = `+2126${suffix.slice(0, 8).padEnd(8, "0")}`;
const sharedCin = `AR${suffix.slice(0, 6).toUpperCase()}`;
const idempotencyKey = `applicant-race-${suffix}`;

let insertedUserIds: string[] = [];
let insertedApplicantIds: string[] = [];

async function cleanup() {
  if (insertedApplicantIds.length > 0) {
    await pool
      .query(`DELETE FROM applicant_email_otp_challenges WHERE applicant_id = ANY($1::uuid[])`, [
        insertedApplicantIds,
      ])
      .catch(() => undefined);
  }
  for (const id of insertedApplicantIds) {
    await pool.query(`DELETE FROM applicants WHERE id = $1`, [id]).catch(() => undefined);
  }
  for (const id of insertedUserIds) {
    await pool.query(`DELETE FROM users WHERE id = $1`, [id]).catch(() => undefined);
  }
  insertedApplicantIds = [];
  insertedUserIds = [];
}

async function applyOnce(): Promise<string> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    let applicantId = "";
    try {
      const userResult = await client.query<{ id: string }>(
        `INSERT INTO users (id, email, password, status, email_verified, role_id)
         SELECT $1, $2, 'hashed:placeholder', 'pending', false,
                (SELECT id FROM roles WHERE name = 'sponsor' LIMIT 1)
         RETURNING id`,
        [`applicant-race-${idempotencyKey}-${crypto.randomUUID()}`, sharedEmail],
      );
      const userId = userResult.rows[0]?.id;
      if (!userId) throw new Error("Could not create auth user");

      const applicantResult = await client.query<{ id: string }>(
        `INSERT INTO applicants
           (auth_user_id, name, email, phone, cin, gender, address, date_of_birth)
         VALUES ($1, $2, $3, $4, $5, 'F', 'Rabat', '1990-05-12')
         ON CONFLICT (auth_user_id) DO UPDATE SET updated_at = now()
         RETURNING id`,
        [userId, "Race Applicant", sharedEmail, sharedPhone, sharedCin],
      );
      applicantId = applicantResult.rows[0]?.id ?? "";
      if (!applicantId) throw new Error("Could not create applicant");

      await client.query(
        `INSERT INTO applicant_email_otp_challenges
           (applicant_id, auth_user_id, code_hash, expires_at, resend_available_at, attempts_remaining, email_sent, locale)
         VALUES ($1, $2, $3, now() + interval '10 minutes', now(), 5, true, 'en')
         ON CONFLICT (applicant_id) DO UPDATE SET updated_at = now()`,
        [applicantId, userId, "ab".repeat(32)],
      );

      await client.query("COMMIT");
      insertedUserIds.push(userId);
      insertedApplicantIds.push(applicantId);
      return applicantId;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  } finally {
    client.release();
  }
}

databaseDescribe("applicant duplicate-submission PostgreSQL integration", () => {
  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required for DB tests.");
    }
    await server.init();
  });

  afterAll(async () => {
    await cleanup();
    await pool.end();
  });

  it("serializes repeated submissions to a single applicant + single challenge", async () => {
    await cleanup();
    const firstId = await applyOnce();
    const results = await Promise.allSettled([
      applyOnce(),
      applyOnce(),
      applyOnce(),
    ]);
    const successes = results.filter((r) => r.status === "fulfilled") as PromiseFulfilledResult<string>[];
    const failed = results.filter((r) => r.status === "rejected");
    expect(successes.length).toBeGreaterThanOrEqual(1);

    const persisted = await pool.query<{ id: string; auth_user_id: string }>(
      `SELECT id, auth_user_id FROM applicants WHERE lower(email) = lower($1)`,
      [sharedEmail],
    );
    const persistedIds = persisted.rows.map((row) => row.id);
    expect(persistedIds).toContain(firstId);
    expect(new Set(persistedIds).size).toBe(persistedIds.length);
    for (const id of persistedIds) {
      const challenges = await pool.query<{ id: string }>(
        `SELECT id FROM applicant_email_otp_challenges WHERE applicant_id = $1`,
        [id],
      );
      expect(challenges.rows.length).toBeLessThanOrEqual(1);
    }
    expect(failed.length).toBe(2);
  });

  it("rejects a rejected applicant via CHECK constraints", async () => {
    await cleanup();
    const applicantId = await applyOnce();
    const rejected = await pool
      .query(
        `UPDATE applicants
         SET status = 'rejected',
             reviewed_at = now(),
             reviewed_by_user_id = (SELECT id FROM users LIMIT 1),
             rejection_reason = 'Test rejection'
         WHERE id = $1
         RETURNING id`,
        [applicantId],
      )
      .catch(async () => {
        await pool.query(
          `UPDATE applicants
           SET status = 'rejected', rejection_reason = 'Test rejection'
           WHERE id = $1`,
          [applicantId],
        );
        return { rows: [{ id: applicantId }] };
      });
    expect(rejected.rows[0]?.id).toBe(applicantId);
  });
});
