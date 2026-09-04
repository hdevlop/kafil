import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Pool } from "pg";

const databaseDescribe =
  process.env.KAFIL_RUN_DB_INTEGRATION === "1" ? describe : describe.skip;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 4,
});

async function tableExists(name: string) {
  const { rows } = await pool.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1`,
    [name],
  );
  return rows[0]?.n === 1;
}

// Upgrade check: the legacy table is gone and the Najm table is untouched and
// still authoritative.
databaseDescribe("Move 6 legacy table drop", () => {
  const userId = `legacy-drop-${crypto.randomUUID()}`;

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required for database integration tests.");
    }
    await pool.query(
      `INSERT INTO users (id, email, password, status, email_verified, role_id)
       SELECT $1, $2, 'hashed:placeholder', 'active', true,
              (SELECT id FROM roles WHERE name = 'family' LIMIT 1)`,
      [userId, `${userId}@example.test`],
    );
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM users WHERE id = $1`, [userId]).catch(() => undefined);
    await pool.end();
  });

  it("removes family_password_requirements", async () => {
    expect(await tableExists("family_password_requirements")).toBe(false);
  });

  it("keeps credential_setup_requirements writable and purpose-scoped", async () => {
    expect(await tableExists("credential_setup_requirements")).toBe(true);

    await pool.query(
      `INSERT INTO credential_setup_requirements (user_id, purpose, temporary_credential_kind)
       VALUES ($1, 'password', 'ma-cin')`,
      [userId],
    );
    await pool.query(
      `UPDATE credential_setup_requirements SET required = false, completed_at = now()
       WHERE user_id = $1 AND purpose = 'password'`,
      [userId],
    );

    const { rows } = await pool.query<{ required: boolean; kind: string }>(
      `SELECT required, temporary_credential_kind AS kind
       FROM credential_setup_requirements WHERE user_id = $1 AND purpose = 'password'`,
      [userId],
    );
    expect(rows).toEqual([{ required: false, kind: "ma-cin" }]);
  });

  it("leaves no bridge trigger or function behind", async () => {
    const triggers = await pool.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM pg_trigger
       WHERE NOT tgisinternal AND tgname LIKE 'kafil_%bridge'`,
    );
    const functions = await pool.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM pg_proc WHERE proname LIKE 'kafil_sync%'`,
    );

    expect(triggers.rows[0]?.n).toBe(0);
    expect(functions.rows[0]?.n).toBe(0);
  });
});
