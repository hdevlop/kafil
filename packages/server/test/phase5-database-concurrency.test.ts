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

async function reserveOrder(
  productId: string,
  amountMinor: number,
): Promise<boolean> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const inventory = await client.query<{
      on_hand_quantity: number;
      reserved_quantity: number;
    }>(
      `SELECT on_hand_quantity, reserved_quantity
       FROM inventory_balances
       WHERE product_id = $1
       FOR UPDATE`,
      [productId],
    );
    const balance = inventory.rows[0];

    if (
      !balance ||
      balance.on_hand_quantity - balance.reserved_quantity < 1
    ) {
      await client.query("ROLLBACK");
      return false;
    }

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
      `UPDATE inventory_balances
       SET reserved_quantity = reserved_quantity + 1,
           version = version + 1,
           updated_at = NOW()
       WHERE product_id = $1`,
      [productId],
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
    return true;
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
        created_by_user_id, funding_target_minor)
     VALUES ($1, $2, $3, $4, $5, $2, 1000)`,
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
  await pool.query(
    `INSERT INTO inventory_balances
       (product_id, on_hand_quantity, reserved_quantity)
     VALUES ($1, 1, 0), ($2, 1, 0)`,
    [fixture.firstProductId, fixture.secondProductId],
  );
});

afterAll(async () => {
  if (process.env.KAFIL_RUN_DB_INTEGRATION === "1") {
    await pool.query(
      `DELETE FROM inventory_balances
       WHERE product_id = ANY($1::uuid[])`,
      [[fixture.firstProductId, fixture.secondProductId]],
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
  "serializes competing PostgreSQL reservations without overspending budget or stock",
  async () => {
    const budgetRace = await Promise.all([
      reserveOrder(fixture.firstProductId, 600),
      reserveOrder(fixture.secondProductId, 600),
    ]);

    expect(budgetRace.filter(Boolean)).toHaveLength(1);

    const budgetAfterRace = await pool.query<{
      available_minor: string;
      reserved_minor: string;
    }>(
      `SELECT available_minor, reserved_minor
       FROM budget_accounts
       WHERE id = $1`,
      [fixture.budgetAccountId],
    );
    const inventoryAfterRace = await pool.query<{ reserved_total: string }>(
      `SELECT SUM(reserved_quantity)::text AS reserved_total
       FROM inventory_balances
       WHERE product_id = ANY($1::uuid[])`,
      [[fixture.firstProductId, fixture.secondProductId]],
    );

    expect(budgetAfterRace.rows[0]).toEqual({
      available_minor: "400",
      reserved_minor: "600",
    });
    expect(inventoryAfterRace.rows[0]?.reserved_total).toBe("1");

    await pool.query(
      `UPDATE budget_accounts
       SET available_minor = 1200, reserved_minor = 0, version = 0
       WHERE id = $1`,
      [fixture.budgetAccountId],
    );
    await pool.query(
      `UPDATE inventory_balances
       SET reserved_quantity = 0, version = 0
       WHERE product_id = ANY($1::uuid[])`,
      [[fixture.firstProductId, fixture.secondProductId]],
    );

    const stockRace = await Promise.all([
      reserveOrder(fixture.firstProductId, 600),
      reserveOrder(fixture.firstProductId, 600),
    ]);

    expect(stockRace.filter(Boolean)).toHaveLength(1);

    const stockAfterRace = await pool.query<{
      on_hand_quantity: number;
      reserved_quantity: number;
    }>(
      `SELECT on_hand_quantity, reserved_quantity
       FROM inventory_balances
       WHERE product_id = $1`,
      [fixture.firstProductId],
    );

    expect(stockAfterRace.rows[0]).toEqual({
      on_hand_quantity: 1,
      reserved_quantity: 1,
    });
  },
  15_000,
);
