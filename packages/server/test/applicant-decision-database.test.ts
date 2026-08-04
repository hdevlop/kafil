import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { AuthService } from "najm-auth";
import { Client, Pool } from "pg";

import { server } from "../src";
import { ApplicantService } from "../src/modules/applicants";

const databaseDescribe =
  process.env.KAFIL_RUN_DB_INTEGRATION === "1" ? describe : describe.skip;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 8 });

const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
const password = "Applicant-test-42";
let actorUserId = "";
let seededUserIds: string[] = [];
let seededApplicantIds: string[] = [];

function inRequestScope<T>(operation: () => Promise<T>) {
  return server.container.run({}, operation);
}

async function cleanup() {
  if (seededApplicantIds.length > 0) {
    await pool.query(
      `DELETE FROM outbox_events
       WHERE aggregate_type = 'applicant' AND aggregate_id = ANY($1::text[])`,
      [seededApplicantIds],
    );
    await pool.query(
      `DELETE FROM audit_events
       WHERE resource = 'applicants' AND resource_id = ANY($1::text[])`,
      [seededApplicantIds],
    );
  }
  if (seededUserIds.length > 0) {
    await pool.query(`DELETE FROM oauth_accounts WHERE user_id = ANY($1::text[])`, [
      seededUserIds,
    ]);
    await pool.query(
      `DELETE FROM credential_setup_sessions WHERE user_id = ANY($1::text[])`,
      [seededUserIds],
    );
    await pool.query(`DELETE FROM tokens WHERE user_id = ANY($1::text[])`, [
      seededUserIds,
    ]);
  }
  for (const userId of seededUserIds) {
    await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);
  }
  seededApplicantIds = [];
  seededUserIds = [];
}

async function seedPendingApplicant(locale: "en" | "fr" | "ar" | "es" = "en") {
  const unique = crypto.randomUUID().replaceAll("-", "").slice(0, 14);
  const email = `decision-${suffix}-${unique}@example.test`;
  const phoneDigits = [...unique]
    .map((character) => String(character.charCodeAt(0) % 10))
    .join("")
    .slice(0, 8);
  const phone = `+2127${phoneDigits}`;
  const cin = `DZ${unique.slice(0, 8).toUpperCase()}`;
  const auth = server.container.get(AuthService);
  const user = await inRequestScope(() =>
    auth.registerUser({
      name: `Decision Applicant ${unique.slice(-5)}`,
      email,
      password,
    }),
  );
  seededUserIds.push(user.id);

  await pool.query(
    `UPDATE users
     SET status = 'pending', email_verified = true, phone = $2,
         phone_verified = true, role_id = NULL
     WHERE id = $1`,
    [user.id, phone],
  );
  const inserted = await pool.query<{ id: string }>(
    `INSERT INTO applicants
       (auth_user_id, name, email, phone, cin, gender, status)
     VALUES ($1, $2, $3, $4, $5, 'F', 'pending_review')
     RETURNING id`,
    [user.id, user.name, email, phone, cin],
  );
  const applicantId = inserted.rows[0]?.id;
  if (!applicantId) throw new Error("Could not seed decision applicant");
  seededApplicantIds.push(applicantId);
  await pool.query(
    `INSERT INTO applicant_email_otp_challenges
       (applicant_id, auth_user_id, code_hash, expires_at,
        resend_available_at, attempts_remaining, email_sent, locale)
     VALUES ($1, $2, $3, now() + interval '10 minutes', now(), 5, true, $4)`,
    [applicantId, user.id, "ab".repeat(32), locale],
  );
  return { applicantId, userId: user.id, email, phone, cin };
}

async function graph(applicantId: string, userId: string) {
  const [applicant, user, profiles, audits, outbox, assignments] =
    await Promise.all([
      pool.query<{ status: string; rejection_reason: string | null }>(
        `SELECT status, rejection_reason FROM applicants WHERE id = $1`,
        [applicantId],
      ),
      pool.query<{ status: string; role: string | null }>(
        `SELECT users.status, roles.name AS role
         FROM users LEFT JOIN roles ON roles.id = users.role_id
         WHERE users.id = $1`,
        [userId],
      ),
      pool.query<{ id: string }>(
        `SELECT id FROM sponsor_profiles WHERE user_id = $1`,
        [userId],
      ),
      pool.query<{ action: string }>(
        `SELECT action FROM audit_events
         WHERE resource = 'applicants' AND resource_id = $1`,
        [applicantId],
      ),
      pool.query<{ topic: string; status: string; payload: Record<string, unknown> }>(
        `SELECT topic, status, payload FROM outbox_events
         WHERE aggregate_type = 'applicant' AND aggregate_id = $1`,
        [applicantId],
      ),
      pool.query<{ count: string }>(
        `SELECT count(*)::text AS count
         FROM support_assignments
         WHERE sponsor_profile_id IN (
           SELECT id FROM sponsor_profiles WHERE user_id = $1
         )`,
        [userId],
      ),
    ]);
  return {
    applicant: applicant.rows[0],
    user: user.rows[0],
    profiles: profiles.rows,
    audits: audits.rows,
    outbox: outbox.rows,
    assignmentCount: Number(assignments.rows[0]?.count ?? 0),
  };
}

async function expectOAuthLinkRejected(userId: string, providerAccountId: string) {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(
      `SELECT set_config('kafil.test_oauth_user_id', $1, false),
              set_config('kafil.test_oauth_provider_id', $2, false)`,
      [userId, providerAccountId],
    );
    await client.query(
      `DO $oauth_test$
       BEGIN
         BEGIN
           INSERT INTO oauth_accounts (id, user_id, provider, provider_account_id)
           VALUES (
             'oauth_test_' || current_setting('kafil.test_oauth_provider_id'),
             current_setting('kafil.test_oauth_user_id'),
             'google',
             current_setting('kafil.test_oauth_provider_id')
           );
           RAISE EXCEPTION 'inactive OAuth link unexpectedly succeeded';
         EXCEPTION
           WHEN check_violation THEN NULL;
         END;
       END
       $oauth_test$`,
    );
    const links = await client.query(
      `SELECT id FROM oauth_accounts
       WHERE provider = 'google' AND provider_account_id = $1`,
      [providerAccountId],
    );
    expect(links.rows).toHaveLength(0);
  } finally {
    await client.end();
  }
}

async function createAndReadOAuthLink(userId: string, providerAccountId: string) {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(
      `INSERT INTO oauth_accounts (id, user_id, provider, provider_account_id)
       VALUES ($1, $2, 'google', $3)`,
      [crypto.randomUUID(), userId, providerAccountId],
    );
    const linked = await client.query<{ user_id: string }>(
      `SELECT user_id FROM oauth_accounts
       WHERE provider = 'google' AND provider_account_id = $1`,
      [providerAccountId],
    );
    return linked.rows;
  } finally {
    await client.end();
  }
}

databaseDescribe("applicant decision PostgreSQL integration", () => {
  beforeAll(async () => {
    if (!process.env.DATABASE_URL || !process.env.KAFIL_ADMIN_EMAIL) {
      throw new Error(
        "DATABASE_URL and KAFIL_ADMIN_EMAIL are required for decision tests.",
      );
    }
    await server.init();
    const actor = await pool.query<{ id: string }>(
      `SELECT id FROM users WHERE lower(email) = lower($1) LIMIT 1`,
      [process.env.KAFIL_ADMIN_EMAIL],
    );
    actorUserId = actor.rows[0]?.id ?? "";
    if (!actorUserId) {
      throw new Error("Run `bun run seed -- setup --yes` before DB tests.");
    }
    const sponsorRole = await pool.query(
      `SELECT id FROM roles WHERE name = 'sponsor' LIMIT 1`,
    );
    if (!sponsorRole.rows[0]) {
      throw new Error("The seeded sponsor role is required for DB tests.");
    }
  });

  afterAll(async () => {
    await cleanup();
    await pool.end();
  });

  it("serializes approval versus approval to one complete sponsor graph", async () => {
    await cleanup();
    const seeded = await seedPendingApplicant("fr");
    const service = server.container.get(ApplicantService);
    const auth = server.container.get(AuthService);
    await expect(
      inRequestScope(() =>
        auth.verifyCredentials({ identifier: seeded.email, password }),
      ),
    ).rejects.toMatchObject({ status: 403 });
    const decisions = await Promise.allSettled([
      inRequestScope(() => service.approve(seeded.applicantId, actorUserId)),
      inRequestScope(() => service.approve(seeded.applicantId, actorUserId)),
    ]);

    expect(decisions.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(decisions.filter((result) => result.status === "rejected")).toHaveLength(1);
    const persisted = await graph(seeded.applicantId, seeded.userId);
    expect(persisted.applicant?.status).toBe("approved");
    expect(persisted.user).toMatchObject({ status: "active", role: "sponsor" });
    expect(persisted.profiles).toHaveLength(1);
    expect(persisted.audits).toEqual([{ action: "applicant.approved" }]);
    expect(persisted.outbox).toHaveLength(1);
    expect(persisted.outbox[0]).toMatchObject({
      topic: "applicant.approved",
      status: "sent",
    });
    expect(persisted.outbox[0]?.payload).not.toHaveProperty("email");
    expect(persisted.outbox[0]?.payload).not.toHaveProperty("phone");
    expect(persisted.outbox[0]?.payload).not.toHaveProperty("cin");
    expect(persisted.assignmentCount).toBe(0);
    const [emailLogin, phoneLogin] = await Promise.all([
      inRequestScope(() =>
        auth.verifyCredentials({ identifier: seeded.email, password }),
      ),
      inRequestScope(() =>
        auth.verifyCredentials({ identifier: seeded.phone, password }),
      ),
    ]);
    expect(emailLogin.id).toBe(seeded.userId);
    expect(phoneLogin.id).toBe(seeded.userId);
    expect(emailLogin.role).toBe("sponsor");
  });

  it("serializes approval versus rejection to one terminal winner", async () => {
    await cleanup();
    const seeded = await seedPendingApplicant();
    const service = server.container.get(ApplicantService);
    const decisions = await Promise.allSettled([
      inRequestScope(() => service.approve(seeded.applicantId, actorUserId)),
      inRequestScope(() =>
        service.reject(
          seeded.applicantId,
          { reason: "Decision race rejection" },
          actorUserId,
        ),
      ),
    ]);

    expect(decisions.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(decisions.filter((result) => result.status === "rejected")).toHaveLength(1);
    const persisted = await graph(seeded.applicantId, seeded.userId);
    expect(["approved", "rejected"]).toContain(persisted.applicant?.status);
    expect(persisted.audits).toHaveLength(1);
    expect(persisted.outbox).toHaveLength(1);
    expect(persisted.profiles).toHaveLength(
      persisted.applicant?.status === "approved" ? 1 : 0,
    );
    expect(persisted.user?.status).toBe(
      persisted.applicant?.status === "approved" ? "active" : "inactive",
    );
  });

  it("rolls back applicant, role, profile, and audit when activation fails late", async () => {
    await cleanup();
    const seeded = await seedPendingApplicant();
    const service = server.container.get(ApplicantService);
    const functionName = `kafil_test_fail_activation_${suffix}`;
    const triggerName = `kafil_test_fail_activation_${suffix}`;
    await pool.query(
      `CREATE OR REPLACE FUNCTION ${functionName}() RETURNS trigger AS $$
       BEGIN
         IF NEW.id = '${seeded.userId}' AND NEW.status = 'active' THEN
           RAISE EXCEPTION 'forced applicant activation rollback';
         END IF;
         RETURN NEW;
       END;
       $$ LANGUAGE plpgsql`,
    );
    await pool.query(
      `CREATE TRIGGER ${triggerName}
       BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION ${functionName}()`,
    );
    try {
      await expect(
        inRequestScope(() => service.approve(seeded.applicantId, actorUserId)),
      ).rejects.toBeDefined();
    } finally {
      await pool.query(`DROP TRIGGER IF EXISTS ${triggerName} ON users`);
      await pool.query(`DROP FUNCTION IF EXISTS ${functionName}()`);
    }

    const persisted = await graph(seeded.applicantId, seeded.userId);
    expect(persisted.applicant?.status).toBe("pending_review");
    expect(persisted.user).toMatchObject({ status: "pending", role: null });
    expect(persisted.profiles).toHaveLength(0);
    expect(persisted.audits).toHaveLength(0);
    expect(persisted.outbox).toHaveLength(0);
  });

  it("rejects and revokes real tokens, setup sessions, and OTP state", async () => {
    await cleanup();
    const seeded = await seedPendingApplicant("ar");
    await pool.query(
      `INSERT INTO tokens (id, user_id, token, token_family, expires_at)
       VALUES ($1, $2, $3, $4, now() + interval '1 hour')`,
      [crypto.randomUUID(), seeded.userId, `token-${suffix}`, `family-${suffix}`],
    );
    await pool.query(
      `INSERT INTO credential_setup_sessions
         (id, user_id, purpose, token_hash, expires_at)
       VALUES ($1, $2, 'applicant-email-otp', $3, now() + interval '10 minutes')`,
      [crypto.randomUUID(), seeded.userId, "cd".repeat(32)],
    );

    const service = server.container.get(ApplicantService);
    await inRequestScope(() =>
      service.reject(
        seeded.applicantId,
        { reason: "Identity could not be approved" },
        actorUserId,
      ),
    );

    const persisted = await graph(seeded.applicantId, seeded.userId);
    expect(persisted.applicant).toMatchObject({
      status: "rejected",
      rejection_reason: "Identity could not be approved",
    });
    expect(persisted.user).toMatchObject({ status: "inactive", role: null });
    expect(persisted.profiles).toHaveLength(0);
    expect(persisted.audits).toEqual([{ action: "applicant.rejected" }]);
    expect(persisted.outbox[0]).toMatchObject({
      topic: "applicant.rejected",
      status: "sent",
    });
    const [tokens, setup, challenge] = await Promise.all([
      pool.query(`SELECT id FROM tokens WHERE user_id = $1`, [seeded.userId]),
      pool.query<{ revoked_at: Date | null }>(
        `SELECT revoked_at FROM credential_setup_sessions WHERE user_id = $1`,
        [seeded.userId],
      ),
      pool.query<{ consumed_at: Date | null }>(
        `SELECT consumed_at FROM applicant_email_otp_challenges WHERE applicant_id = $1`,
        [seeded.applicantId],
      ),
    ]);
    expect(tokens.rows).toHaveLength(0);
    expect(setup.rows[0]?.revoked_at).not.toBeNull();
    expect(challenge.rows[0]?.consumed_at).not.toBeNull();
    const auth = server.container.get(AuthService);
    await expect(
      inRequestScope(() =>
        auth.verifyCredentials({ identifier: seeded.email, password }),
      ),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("persists a Google link only for the exact approved active identity", async () => {
    await cleanup();
    const seeded = await seedPendingApplicant();
    const providerAccountId = `google-approved-${suffix}`;
    await expectOAuthLinkRejected(seeded.userId, providerAccountId);

    const service = server.container.get(ApplicantService);
    await inRequestScope(() => service.approve(seeded.applicantId, actorUserId));
    const linked = await createAndReadOAuthLink(
      seeded.userId,
      providerAccountId,
    );
    expect(linked).toEqual([{ user_id: seeded.userId }]);
  });

  it("does not persist a Google link for a rejected identity", async () => {
    await cleanup();
    const seeded = await seedPendingApplicant();
    const service = server.container.get(ApplicantService);
    await inRequestScope(() =>
      service.reject(
        seeded.applicantId,
        { reason: "Rejected identities cannot link OAuth accounts" },
        actorUserId,
      ),
    );

    await expectOAuthLinkRejected(
      seeded.userId,
      `google-rejected-${suffix}`,
    );
    const links = await pool.query(
      `SELECT id FROM oauth_accounts WHERE user_id = $1`,
      [seeded.userId],
    );
    expect(links.rows).toHaveLength(0);
  });
});
