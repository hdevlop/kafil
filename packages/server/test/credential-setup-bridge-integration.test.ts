import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Pool } from "pg";

const databaseDescribe =
  process.env.KAFIL_RUN_DB_INTEGRATION === "1" ? describe : describe.skip;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 4,
});

const userId = `bridge-${crypto.randomUUID()}`;
const email = `bridge-${userId.slice(-12)}@example.test`;
const completedInstant = "2026-05-04T09:30:00.000Z";

interface LegacyRow {
  required: boolean;
  completed_at: Date | null;
}

interface NajmRow {
  purpose: string;
  temporary_credential_kind: string | null;
  required: boolean;
  completed_at: Date | null;
}

function legacyRow() {
  return pool
    .query<LegacyRow>(
      `SELECT required, completed_at FROM family_password_requirements WHERE user_id = $1`,
      [userId],
    )
    .then(({ rows }) => rows);
}

function najmRows() {
  return pool
    .query<NajmRow>(
      `SELECT purpose, temporary_credential_kind, required, completed_at
       FROM credential_setup_requirements
       WHERE user_id = $1
       ORDER BY purpose`,
      [userId],
    )
    .then(({ rows }) => rows);
}

async function clearBothSides() {
  await pool.query(`DELETE FROM credential_setup_requirements WHERE user_id = $1`, [userId]);
  await pool.query(`DELETE FROM family_password_requirements WHERE user_id = $1`, [userId]);
}

databaseDescribe("Move 3 credential-setup bridge", () => {
  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required for database integration tests.");
    }

    await pool.query(
      `INSERT INTO users (id, email, password, status, email_verified, role_id)
       SELECT $1, $2, 'hashed:placeholder', 'active', true,
              (SELECT id FROM roles WHERE name = 'family' LIMIT 1)`,
      [userId, email],
    );
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM users WHERE id = $1`, [userId]).catch(() => undefined);
    await pool.end();
  });

  it("mirrors a legacy requirement into the Najm table on insert", async () => {
    await clearBothSides();
    await pool.query(
      `INSERT INTO family_password_requirements (user_id) VALUES ($1)`,
      [userId],
    );

    expect(await najmRows()).toEqual([
      {
        purpose: "password",
        temporary_credential_kind: "ma-cin",
        required: true,
        completed_at: null,
      },
    ]);
  });

  it("mirrors legacy completion, preserving the instant across the timezone boundary", async () => {
    await pool.query(
      `UPDATE family_password_requirements
       SET required = false, completed_at = $2, updated_at = now()
       WHERE user_id = $1`,
      [userId, completedInstant],
    );

    const [row] = await najmRows();
    expect(row?.required).toBe(false);

    const { rows } = await pool.query<{ same: boolean }>(
      `SELECT legacy.completed_at = (najm.completed_at AT TIME ZONE 'UTC') AS same
       FROM family_password_requirements legacy
       JOIN credential_setup_requirements najm
         ON najm.user_id = legacy.user_id AND najm.purpose = 'password'
       WHERE legacy.user_id = $1`,
      [userId],
    );
    expect(rows[0]?.same).toBe(true);
  });

  it("mirrors a legacy delete", async () => {
    await pool.query(`DELETE FROM family_password_requirements WHERE user_id = $1`, [userId]);

    expect(await najmRows()).toEqual([]);
  });

  it("mirrors a Najm password requirement back to the legacy table", async () => {
    await clearBothSides();
    await pool.query(
      `INSERT INTO credential_setup_requirements (user_id, purpose, temporary_credential_kind)
       VALUES ($1, 'password', 'ma-cin')`,
      [userId],
    );

    expect(await legacyRow()).toEqual([{ required: true, completed_at: null }]);
  });

  it("mirrors Najm completion and deletion back to the legacy table", async () => {
    await pool.query(
      `UPDATE credential_setup_requirements
       SET required = false, completed_at = $2, updated_at = now()
       WHERE user_id = $1 AND purpose = 'password'`,
      [userId, completedInstant],
    );
    const [completed] = await legacyRow();
    expect(completed?.required).toBe(false);
    expect(completed?.completed_at?.toISOString()).toBe(completedInstant);

    await pool.query(
      `DELETE FROM credential_setup_requirements WHERE user_id = $1 AND purpose = 'password'`,
      [userId],
    );
    expect(await legacyRow()).toEqual([]);
  });

  it("ignores Najm purposes that have no legacy counterpart", async () => {
    await clearBothSides();
    await pool.query(
      `INSERT INTO credential_setup_requirements (user_id, purpose) VALUES ($1, 'email')`,
      [userId],
    );

    expect(await legacyRow()).toEqual([]);
    expect((await najmRows()).map(({ purpose }) => purpose)).toEqual(["email"]);
  });

  it("settles a mirrored write without re-entering the opposite trigger", async () => {
    await clearBothSides();
    await pool.query(`INSERT INTO family_password_requirements (user_id) VALUES ($1)`, [userId]);
    await pool.query(
      `UPDATE credential_setup_requirements SET required = false, updated_at = now()
       WHERE user_id = $1 AND purpose = 'password'`,
      [userId],
    );

    expect(await legacyRow()).toEqual([{ required: false, completed_at: null }]);
    expect(await najmRows()).toHaveLength(1);
  });

  it("rolls the mirrored row back with its originating transaction", async () => {
    await clearBothSides();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(`INSERT INTO family_password_requirements (user_id) VALUES ($1)`, [
        userId,
      ]);
      const inFlight = await client.query<{ n: string }>(
        `SELECT count(*)::text AS n FROM credential_setup_requirements WHERE user_id = $1`,
        [userId],
      );
      expect(inFlight.rows[0]?.n).toBe("1");
      await client.query("ROLLBACK");
    } finally {
      client.release();
    }

    expect(await legacyRow()).toEqual([]);
    expect(await najmRows()).toEqual([]);
  });
});
