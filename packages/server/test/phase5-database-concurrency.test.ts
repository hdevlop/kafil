import { afterAll, beforeAll, expect, it } from "bun:test";
import { Pool, type PoolClient } from "pg";

const databaseTest =
  process.env.KAFIL_RUN_DB_INTEGRATION === "1" ? it : it.skip;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 4,
});

const fixture = {
  familyProfileId: crypto.randomUUID(),
  budgetAccountId: crypto.randomUUID(),
  categoryId: crypto.randomUUID(),
  firstProductId: crypto.randomUUID(),
  secondProductId: crypto.randomUUID(),
};

let seededUserId = "";

async function reserveBudget(
  amountMinor: number,
): Promise<boolean> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const budget = await client.query<{ available_minor: string }>(
      `SELECT available_minor
       FROM budget_accounts
       WHERE id = $1
       FOR UPDATE`,
      [fixture.budgetAccountId],
    );

    if (!budget.rows[0] || Number(budget.rows[0].available_minor) < amountMinor) {
      await client.query("ROLLBACK");
      return false;
    }

    await client.query(
      `UPDATE budget_accounts
       SET available_minor = available_minor - $2,
           reserved_minor = reserved_minor + $2,
           version = version + 1,
           updated_at = NOW()
       WHERE id = $1`,
      [fixture.budgetAccountId, amountMinor],
    );
    await client.query("COMMIT");
    return true;
  } catch (error) {
    await rollbackQuietly(client);
    throw error;
  } finally {
    client.release();
  }
}

async function duplicateSubmission(
  productId: string,
  amountMinor: number,
  idempotencyKey: string,
): Promise<{ orderId: string | null }> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existing = await client.query<{ id: string }>(
      `SELECT id FROM orders
       WHERE submission_idempotency_key = $1
       LIMIT 1`,
      [idempotencyKey],
    );
    if (existing.rows[0]) {
      await client.query("COMMIT");
      return { orderId: existing.rows[0].id };
    }

    const budget = await client.query<{ available_minor: string }>(
      `SELECT available_minor
       FROM budget_accounts
       WHERE id = $1
       FOR UPDATE`,
      [fixture.budgetAccountId],
    );

    const concurrentExisting = await client.query<{ id: string }>(
      `SELECT id FROM orders
       WHERE submission_idempotency_key = $1
       LIMIT 1`,
      [idempotencyKey],
    );
    if (concurrentExisting.rows[0]) {
      await client.query("COMMIT");
      return { orderId: concurrentExisting.rows[0].id };
    }

    if (!budget.rows[0] || Number(budget.rows[0].available_minor) < amountMinor) {
      await client.query("ROLLBACK");
      return { orderId: null };
    }

    const orderId = crypto.randomUUID();
    await client.query(
      `INSERT INTO orders
         (id, order_number, submission_idempotency_key, family_profile_id,
          subtotal_minor, total_minor, guardian_legal_name_snapshot,
          delivery_address_snapshot, placed_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $5, 'Race family', 'Test-only address', $6)`,
      [
        orderId,
        `RACE-${idempotencyKey}`,
        idempotencyKey,
        fixture.familyProfileId,
        amountMinor,
        seededUserId,
      ],
    );
    await client.query(
      `INSERT INTO order_items
         (id, order_id, product_id, product_name_snapshot, sku_snapshot,
          unit_price_minor, quantity, line_total_minor)
       VALUES ($1, $2, $3, 'Race product', 'RACE', $4, 1, $4)`,
      [crypto.randomUUID(), orderId, productId, amountMinor],
    );
    await client.query(
      `UPDATE budget_accounts
       SET available_minor = available_minor - $2,
           reserved_minor = reserved_minor + $2,
           version = version + 1,
           updated_at = NOW()
       WHERE id = $1`,
      [fixture.budgetAccountId, amountMinor],
    );
    await client.query("COMMIT");
    return { orderId };
  } catch (error) {
    await rollbackQuietly(client);
    throw error;
  } finally {
    client.release();
  }
}

async function rollbackQuietly(client: PoolClient) {
  try {
    await client.query("ROLLBACK");
  } catch {
    // Preserve the original transaction error.
  }
}

beforeAll(async () => {
  if (process.env.KAFIL_RUN_DB_INTEGRATION !== "1") {
    return;
  }

  if (!process.env.DATABASE_URL || !process.env.KAFIL_ADMIN_EMAIL) {
    throw new Error(
      "DATABASE_URL and KAFIL_ADMIN_EMAIL are required for database integration tests.",
    );
  }

  const user = await pool.query<{ id: string }>(
    `SELECT id FROM users WHERE lower(email) = lower($1) LIMIT 1`,
    [process.env.KAFIL_ADMIN_EMAIL],
  );
  seededUserId = user.rows[0]?.id ?? "";

  if (!seededUserId) {
    throw new Error("Run `bun run seed` before the database integration test.");
  }

  const suffix = fixture.categoryId.slice(0, 8);

  await pool.query(
     `INSERT INTO family_profiles
        (id, user_id, guardian_legal_name, guardian_cin, exact_address,
         housing_situation, registration_date, support_priority,
         created_by_user_id, funding_target_minor)
      VALUES ($1, $2, $3, $4, $5, 'rented', '2026-01-15', 'normal', $2, 1000)`,
    [
      fixture.familyProfileId,
      seededUserId,
      "Concurrency Test",
      `TEST${suffix}`,
      "Test-only address",
    ],
  );
  await pool.query(
    `INSERT INTO budget_accounts
       (id, family_profile_id, available_minor, reserved_minor, spent_minor)
     VALUES ($1, $2, 1000, 0, 0)`,
    [fixture.budgetAccountId, fixture.familyProfileId],
  );
  await pool.query(
    `INSERT INTO categories (id, name, slug)
     VALUES ($1, $2, $3)`,
    [fixture.categoryId, "Concurrency Test", `concurrency-${suffix}`],
  );
  await pool.query(
    `INSERT INTO products
       (id, category_id, sku, name, price_minor)
     VALUES
       ($1, $3, $4, 'First concurrency product', 600),
       ($2, $3, $5, 'Second concurrency product', 600)`,
    [
      fixture.firstProductId,
      fixture.secondProductId,
      fixture.categoryId,
      `CONCURRENCY-A-${suffix}`,
      `CONCURRENCY-B-${suffix}`,
    ],
  );
});

afterAll(async () => {
  if (process.env.KAFIL_RUN_DB_INTEGRATION === "1") {
    await pool.query(
      `DELETE FROM order_items WHERE product_id = ANY($1::uuid[])`,
      [[fixture.firstProductId, fixture.secondProductId]],
    );
    await pool.query(
      `DELETE FROM orders WHERE family_profile_id = $1`,
      [fixture.familyProfileId],
    );
    await pool.query(
      `DELETE FROM products WHERE id = ANY($1::uuid[])`,
      [[fixture.firstProductId, fixture.secondProductId]],
    );
    await pool.query("DELETE FROM categories WHERE id = $1", [
      fixture.categoryId,
    ]);
    await pool.query("DELETE FROM budget_accounts WHERE id = $1", [
      fixture.budgetAccountId,
    ]);
    await pool.query("DELETE FROM family_profiles WHERE id = $1", [
      fixture.familyProfileId,
    ]);
  }

  await pool.end();
});

databaseTest(
  "serializes competing PostgreSQL budget reservations without overspending",
  async () => {
    const race = await Promise.all([
      reserveBudget(600),
      reserveBudget(600),
    ]);

    expect(race.filter(Boolean)).toHaveLength(1);

    const budgetAfterRace = await pool.query<{
      available_minor: string;
      reserved_minor: string;
    }>(
      `SELECT available_minor, reserved_minor
       FROM budget_accounts
       WHERE id = $1`,
      [fixture.budgetAccountId],
    );

    expect(budgetAfterRace.rows[0]).toEqual({
      available_minor: "400",
      reserved_minor: "600",
    });
  },
  15_000,
);

databaseTest(
  "returns the same order for duplicate submission keys under contention",
  async () => {
    await pool.query(
      `UPDATE budget_accounts
       SET available_minor = 1000,
           reserved_minor = 0,
           spent_minor = 0
       WHERE id = $1`,
      [fixture.budgetAccountId],
    );
    const idempotencyKey = `race-submit-${crypto.randomUUID()}`;
    const [first, second] = await Promise.all([
      duplicateSubmission(fixture.firstProductId, 600, idempotencyKey),
      duplicateSubmission(fixture.firstProductId, 600, idempotencyKey),
    ]);

    expect(first.orderId).toBeTruthy();
    expect(second.orderId).toBe(first.orderId);

    const orderCount = await pool.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM orders WHERE submission_idempotency_key = $1`,
      [idempotencyKey],
    );
    expect(orderCount.rows[0]?.count).toBe("1");
  },
  15_000,
);
