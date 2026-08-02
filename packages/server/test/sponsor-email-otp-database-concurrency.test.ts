import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { createHash, randomBytes } from "node:crypto";
import { Pool, type PoolClient } from "pg";

const databaseDescribe =
  process.env.KAFIL_RUN_DB_INTEGRATION === "1" ? describe : describe.skip;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 4 });

const codeHash = "ab".repeat(32);
const setupToken = randomBytes(32).toString("base64url");
const setupHash = createHash("sha256").update(setupToken).digest("hex");
let userId = "";

async function confirmAtomically() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const setup = await client.query<{ user_id: string }>(
      `UPDATE credential_setup_sessions
       SET consumed_at = now(), updated_at = now()
       WHERE token_hash = $1
         AND purpose = 'sponsor-email-otp'
         AND consumed_at IS NULL
         AND revoked_at IS NULL
         AND expires_at > now()
       RETURNING user_id`,
      [setupHash],
    );
    if (!setup.rows[0]) {
      await client.query("ROLLBACK");
      return false;
    }
    const challenge = await client.query(
      `UPDATE sponsor_email_otp_challenges
       SET consumed_at = now(), updated_at = now()
       WHERE user_id = $1
         AND code_hash = $2
         AND consumed_at IS NULL
         AND expires_at > now()
         AND attempts_remaining > 0
       RETURNING user_id`,
      [setup.rows[0].user_id, codeHash],
    );
    if (!challenge.rows[0]) {
      await client.query("ROLLBACK");
      return false;
    }
    await client.query("COMMIT");
    return true;
  } catch (error) {
    await rollback(client);
    throw error;
  } finally {
    client.release();
  }
}

databaseDescribe("sponsor email OTP PostgreSQL consumption", () => {
  beforeAll(async () => {
    if (!process.env.DATABASE_URL || !process.env.KAFIL_ADMIN_EMAIL) {
      throw new Error("DATABASE_URL and KAFIL_ADMIN_EMAIL are required for DB tests.");
    }
    const user = await pool.query<{ id: string }>(
      "SELECT id FROM users WHERE lower(email) = lower($1) LIMIT 1",
      [process.env.KAFIL_ADMIN_EMAIL],
    );
    userId = user.rows[0]?.id ?? "";
    if (!userId) throw new Error("Run `bun run seed -- setup --yes` before DB tests.");
    await pool.query("DELETE FROM sponsor_email_otp_challenges WHERE user_id = $1", [userId]);
    await pool.query("DELETE FROM credential_setup_sessions WHERE token_hash = $1", [setupHash]);
  });

  afterAll(async () => {
    await pool.query("DELETE FROM sponsor_email_otp_challenges WHERE user_id = $1", [userId]).catch(() => undefined);
    await pool.query("DELETE FROM credential_setup_sessions WHERE token_hash = $1", [setupHash]).catch(() => undefined);
    await pool.end();
  });

  it("allows one active challenge and exactly one concurrent confirmation", async () => {
    await pool.query(
      `INSERT INTO sponsor_email_otp_challenges
         (user_id, code_hash, expires_at, resend_available_at, attempts_remaining)
       VALUES ($1, $2, now() + interval '10 minutes', now(), 5)`,
      [userId, codeHash],
    );
    let uniqueViolation: unknown;
    try {
      await pool.query(
        `INSERT INTO sponsor_email_otp_challenges
           (user_id, code_hash, expires_at, resend_available_at, attempts_remaining)
         VALUES ($1, $2, now() + interval '10 minutes', now(), 5)`,
        [userId, "cd".repeat(32)],
      );
    } catch (error) {
      uniqueViolation = error;
    }
    expect(uniqueViolation).toMatchObject({ code: "23505" });
    await pool.query(
      `INSERT INTO credential_setup_sessions
         (id, user_id, purpose, token_hash, expires_at)
       VALUES ($1, $2, 'sponsor-email-otp', $3, now() + interval '10 minutes')`,
      [randomBytes(12).toString("base64url"), userId, setupHash],
    );

    const results = await Promise.all([confirmAtomically(), confirmAtomically()]);
    expect(results.sort()).toEqual([false, true]);
    const persisted = await pool.query<{ consumed: boolean; code_hash: string }>(
      `SELECT consumed_at IS NOT NULL AS consumed, code_hash
       FROM sponsor_email_otp_challenges WHERE user_id = $1`,
      [userId],
    );
    expect(persisted.rows).toEqual([{ consumed: true, code_hash: codeHash }]);
  });
});

async function rollback(client: PoolClient) {
  await client.query("ROLLBACK").catch(() => undefined);
}
