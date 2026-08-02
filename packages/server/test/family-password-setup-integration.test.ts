import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { createHash, randomBytes } from "node:crypto";
import { Pool } from "pg";

const databaseDescribe =
  process.env.KAFIL_RUN_DB_INTEGRATION === "1" ? describe : describe.skip;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 4,
});

const token = randomBytes(32).toString("base64url");
const tokenHash = createHash("sha256").update(token).digest("hex");
const sessionId = randomBytes(12).toString("base64url");
let userId = "";

databaseDescribe("Najm credential setup PostgreSQL consumption", () => {
  beforeAll(async () => {
    if (!process.env.DATABASE_URL || !process.env.KAFIL_ADMIN_EMAIL) {
      throw new Error(
        "DATABASE_URL and KAFIL_ADMIN_EMAIL are required for database integration tests.",
      );
    }

    const user = await pool.query<{ id: string }>(
      "SELECT id FROM users WHERE lower(email) = lower($1) LIMIT 1",
      [process.env.KAFIL_ADMIN_EMAIL],
    );
    userId = user.rows[0]?.id ?? "";
    if (!userId) {
      throw new Error("Run `bun run seed -- setup --yes` before DB tests.");
    }
  });

  afterAll(async () => {
    await pool
      .query(
        "DELETE FROM credential_setup_sessions WHERE token_hash = $1",
        [tokenHash],
      )
      .catch(() => undefined);
    await pool.end();
  });

  it("allows exactly one consumer for an unexpired opaque setup token", async () => {
    await pool.query(
      `INSERT INTO credential_setup_sessions
         (id, user_id, purpose, token_hash, expires_at)
       VALUES ($1, $2, 'family-password', $3, now() + interval '1 minute')`,
      [sessionId, userId, tokenHash],
    );

    const consume = () =>
      pool.query<{ user_id: string }>(
        `UPDATE credential_setup_sessions
         SET consumed_at = now(), updated_at = now()
         WHERE token_hash = $1
           AND purpose = 'family-password'
           AND consumed_at IS NULL
           AND revoked_at IS NULL
           AND expires_at > now()
         RETURNING user_id`,
        [tokenHash],
      );
    const race = await Promise.all([consume(), consume()]);

    expect(race.flatMap(({ rows }) => rows)).toEqual([{ user_id: userId }]);
    const active = await pool.query<{ count: string }>(
      `SELECT count(*)::text AS count
       FROM credential_setup_sessions
       WHERE token_hash = $1
         AND consumed_at IS NULL
         AND revoked_at IS NULL
         AND expires_at > now()`,
      [tokenHash],
    );
    expect(active.rows[0]?.count).toBe("0");
  });
});
