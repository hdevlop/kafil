import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Pool } from "pg";

import { server } from "../src";
import { BudgetService } from "../src/modules/budgets";
import { FamilyService } from "../src/modules/families";
import { OrderService } from "../src/modules/orders";

const databaseDescribe =
  process.env.KAFIL_RUN_DB_INTEGRATION === "1" ? describe : describe.skip;

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 8 });

const ids = {
  family: crypto.randomUUID(),
  familyUser: crypto.randomUUID(),
  category: crypto.randomUUID(),
  product: crypto.randomUUID(),
};

let actorUserId = "";
let accountId = "";
let orders: OrderService;
let budgets: BudgetService;
let families: FamilyService;
let originalSettings: {
  default_max_orders_per_month: number | null;
  default_max_budget_per_order_minor: string | null;
  default_monthly_budget_minor: string | null;
  updated_by_user_id: string | null;
} | null = null;

function isolatedRequest<T>(operation: () => Promise<T>) {
  return server.container.run({}, operation);
}

async function assistedSubmit(suffix: string, quantity = 1) {
  return isolatedRequest(() =>
    orders.submitAssisted(
      {
        familyProfileId: ids.family,
        items: [{ productId: ids.product, quantity }],
        assistanceChannel: "phone",
        idempotencyKey: `order-limit-${suffix}-${crypto.randomUUID()}`,
      },
      actorUserId,
    ),
  );
}

async function refreshAccountId() {
  const row = await pool.query<{ id: string }>(
    `SELECT id FROM budget_accounts WHERE family_profile_id = $1 LIMIT 1`,
    [ids.family],
  );
  accountId = row.rows[0]?.id ?? "";
}

async function clearOrders() {
  await pool.query(
    `DELETE FROM audit_events WHERE resource = 'orders'
     AND resource_id IN (SELECT id::text FROM orders WHERE family_profile_id = $1)`,
    [ids.family],
  );
  await pool.query(
    `DELETE FROM outbox_events WHERE aggregate_type = 'order'
     AND aggregate_id IN (SELECT id::text FROM orders WHERE family_profile_id = $1)`,
    [ids.family],
  );
  await pool.query(
    `DELETE FROM order_status_events WHERE order_id IN (SELECT id FROM orders WHERE family_profile_id = $1)`,
    [ids.family],
  );
  await pool.query(`DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE family_profile_id = $1)`, [
    ids.family,
  ]);
  await pool.query(`DELETE FROM order_delivery_attempts WHERE order_id IN (SELECT id FROM orders WHERE family_profile_id = $1)`, [
    ids.family,
  ]);
  await pool.query(`DELETE FROM orders WHERE family_profile_id = $1`, [
    ids.family,
  ]);
  await pool.query(`DELETE FROM budget_ledger_entries WHERE budget_account_id = $1`, [
    accountId,
  ]);
  await pool.query(
    `UPDATE budget_accounts SET available_minor = 1000000, reserved_minor = 0, spent_minor = 0, max_orders_per_month = 2, max_budget_per_order_minor = NULL WHERE id = $1`,
    [accountId],
  );
  await pool.query(`DELETE FROM monthly_budget_limits WHERE budget_account_id = $1`, [
    accountId,
  ]);
}

databaseDescribe("family order limits PostgreSQL integration", () => {
  beforeAll(async () => {
    if (!process.env.DATABASE_URL || !process.env.KAFIL_ADMIN_EMAIL) {
      throw new Error(
        "DATABASE_URL and KAFIL_ADMIN_EMAIL are required for database integration tests.",
      );
    }
    await server.init();
    orders = server.container.get(OrderService);
    budgets = server.container.get(BudgetService);
    families = server.container.get(FamilyService);
    const actor = await pool.query<{ id: string }>(
      "SELECT id FROM users WHERE lower(email) = lower($1) LIMIT 1",
      [process.env.KAFIL_ADMIN_EMAIL],
    );
    actorUserId = actor.rows[0]?.id ?? "";
    if (!actorUserId) throw new Error("Run `bun run seed -- setup --yes` before DB tests.");

    const settingsSnapshot = await pool.query<NonNullable<typeof originalSettings>>(
      `SELECT default_max_orders_per_month, default_max_budget_per_order_minor,
        default_monthly_budget_minor, updated_by_user_id
       FROM platform_settings WHERE id = 'platform'`,
    );
    originalSettings = settingsSnapshot.rows[0] ?? null;

    const suffix = ids.family.slice(0, 8).replaceAll("-", "");
    const digits = suffix.replaceAll(/[^0-9]/g, "").padEnd(6, "0").slice(0, 6);
    const cinDigits = `${digits}${String(Math.floor(Math.random() * 900) + 100)}`.slice(0, 8);
    const phoneDigits = suffix.replaceAll(/[^0-9]/g, "").padEnd(8, "0").slice(0, 8);
    const unique = `${Date.now().toString(36)}${suffix}`;
    await isolatedRequest(() =>
      families.create(
        {
          id: ids.family,
          userId: ids.familyUser,
          name: "Order Limit Integration",
          email: `order-limit-${unique}@test.kafil.test`,
          guardianCin: `AB${cinDigits}`,
          guardianDateOfBirth: "1990-01-01",
          exactAddress: "Test-only address for order limits",
          phone: `+2127${phoneDigits}`,
          housingSituation: "rented",
          registrationDate: "2026-01-15",
          supportPriority: "normal",
          fundingTargetMinor: 1000,
          initialChildren: [],
        } as never,
        actorUserId,
      ),
    ).catch(async (error: unknown) => {
      // Re-runs reuse the same deterministic family; ensure funding is active.
      if ((error as { status?: number })?.status === 409) {
        await pool.query(
          `UPDATE family_profiles SET funding_status = 'active', funding_activated_at = now() WHERE id = $1`,
          [ids.family],
        );
      } else {
        throw error;
      }
    });
    await pool.query(
      `UPDATE family_profiles SET funding_status = 'active', funding_activated_at = now() WHERE id = $1`,
      [ids.family],
    );
    await refreshAccountId();
    await pool.query(
      `UPDATE budget_accounts SET available_minor = 1000000, reserved_minor = 0, spent_minor = 0, max_orders_per_month = 2, max_budget_per_order_minor = NULL WHERE id = $1`,
      [accountId],
    );
    await pool.query(
      "INSERT INTO categories (id, name, slug) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name",
      [ids.category, "Order limit integration", `order-limit-${suffix}`],
    );
    await pool.query(
      `INSERT INTO products (id, category_id, sku, name, price_minor)
       VALUES ($1, $2, $3, 'Order limit product', 500)
       ON CONFLICT (id) DO UPDATE SET price_minor = 500`,
      [ids.product, ids.category, `OLIM-${suffix}`],
    );
    await pool.query(
      `UPDATE platform_settings SET default_max_orders_per_month = 4,
        default_max_budget_per_order_minor = 300000,
        default_monthly_budget_minor = 600000,
        updated_by_user_id = $1 WHERE id = 'platform'`,
      [actorUserId],
    );
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM audit_events WHERE resource = 'orders' AND resource_id IN (SELECT id::text FROM orders WHERE family_profile_id = $1)`, [ids.family]);
    await pool.query(`DELETE FROM outbox_events WHERE aggregate_type = 'order' AND aggregate_id IN (SELECT id::text FROM orders WHERE family_profile_id = $1)`, [ids.family]);
    await pool.query(`DELETE FROM order_status_events WHERE order_id IN (SELECT id FROM orders WHERE family_profile_id = $1)`, [ids.family]);
    await pool.query(`DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE family_profile_id = $1)`, [ids.family]);
    await pool.query(`DELETE FROM order_delivery_attempts WHERE order_id IN (SELECT id FROM orders WHERE family_profile_id = $1)`, [ids.family]);
    await pool.query(`DELETE FROM orders WHERE family_profile_id = $1`, [ids.family]);
    await pool.query(`DELETE FROM budget_ledger_entries WHERE budget_account_id = $1`, [accountId]);
    await pool.query(`DELETE FROM monthly_budget_limits WHERE budget_account_id = $1`, [accountId]);
    await pool.query(`DELETE FROM budget_accounts WHERE id = $1`, [accountId]);
    await pool.query(`DELETE FROM products WHERE id = $1`, [ids.product]);
    await pool.query(`DELETE FROM categories WHERE id = $1`, [ids.category]);
    const family = await pool.query<{ user_id: string }>(
      `SELECT user_id FROM family_profiles WHERE id = $1`,
      [ids.family],
    );
    await pool.query(`DELETE FROM carts WHERE family_profile_id = $1`, [ids.family]);
    await pool.query(`DELETE FROM children WHERE family_profile_id = $1`, [ids.family]);
    await pool.query(`DELETE FROM family_profiles WHERE id = $1`, [ids.family]);
    const userId = family.rows[0]?.user_id;
    if (userId) {
      await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);
    }
    if (originalSettings) {
      await pool.query(
        `UPDATE platform_settings SET default_max_orders_per_month = $1,
          default_max_budget_per_order_minor = $2,
          default_monthly_budget_minor = $3,
          updated_by_user_id = $4 WHERE id = 'platform'`,
        [
          originalSettings.default_max_orders_per_month,
          originalSettings.default_max_budget_per_order_minor,
          originalSettings.default_monthly_budget_minor,
          originalSettings.updated_by_user_id,
        ],
      );
    }
    await pool.end();
  });

  it("admits exactly up to the cap with distinct idempotency keys", async () => {
    await clearOrders();
    const attempts = await Promise.allSettled([
      assistedSubmit("cap-a"),
      assistedSubmit("cap-b"),
      assistedSubmit("cap-c"),
    ]);
    const admitted = attempts.filter(
      (attempt) => attempt.status === "fulfilled",
    );
    const blocked = attempts.filter(
      (attempt) => attempt.status === "rejected",
    );
    expect(admitted).toHaveLength(2);
    expect(blocked).toHaveLength(1);
    expect((blocked[0] as PromiseRejectedResult).reason).toMatchObject({
      status: 409,
    });

    const count = await pool.query<{ total: string }>(
      `SELECT count(*)::text AS total FROM orders
       WHERE family_profile_id = $1 AND status NOT IN ('cancelled', 'rejected')`,
      [ids.family],
    );
    expect(Number(count.rows[0]?.total ?? 0)).toBe(2);

    const ledger = await pool.query<{ total: string }>(
      `SELECT count(*)::text AS total FROM budget_ledger_entries
       WHERE budget_account_id = $1 AND entry_type = 'order_reserve'`,
      [accountId],
    );
    expect(Number(ledger.rows[0]?.total ?? 0)).toBe(2);

    const effects = await pool.query<{
      audit_total: string;
      outbox_total: string;
    }>(
      `SELECT
        (SELECT count(*)::text FROM audit_events
          WHERE action = 'order.assisted_submitted' AND resource = 'orders'
          AND resource_id IN (SELECT id::text FROM orders WHERE family_profile_id = $1)) AS audit_total,
        (SELECT count(*)::text FROM outbox_events
          WHERE topic = 'order.assisted_submitted' AND aggregate_type = 'order'
          AND aggregate_id IN (SELECT id::text FROM orders WHERE family_profile_id = $1)) AS outbox_total`,
      [ids.family],
    );
    expect(Number(effects.rows[0]?.audit_total ?? 0)).toBe(2);
    expect(Number(effects.rows[0]?.outbox_total ?? 0)).toBe(2);
  });

  it("waits for a concurrent policy update and enforces the committed value", async () => {
    await clearOrders();
    await assistedSubmit("policy-existing");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `SELECT id FROM budget_accounts WHERE id = $1 FOR UPDATE`,
        [accountId],
      );
      await client.query(
        `UPDATE budget_accounts SET max_orders_per_month = 1 WHERE id = $1`,
        [accountId],
      );

      const submission = assistedSubmit("policy-waiter");
      await new Promise((resolve) => setTimeout(resolve, 50));
      await client.query("COMMIT");
      await expect(submission).rejects.toMatchObject({ status: 409 });
    } finally {
      await client.query("ROLLBACK").catch(() => undefined);
      client.release();
    }

    const effects = await pool.query<{ orders: string; ledger: string }>(
      `SELECT
        (SELECT count(*)::text FROM orders WHERE family_profile_id = $1) AS orders,
        (SELECT count(*)::text FROM budget_ledger_entries
          WHERE budget_account_id = $2 AND entry_type = 'order_reserve') AS ledger`,
      [ids.family, accountId],
    );
    expect(Number(effects.rows[0]?.orders ?? 0)).toBe(1);
    expect(Number(effects.rows[0]?.ledger ?? 0)).toBe(1);
  });

  it("frees a slot when an order is rejected and resets monthly idempotently", async () => {
    await clearOrders();
    const first = await assistedSubmit("free-a");
    await assistedSubmit("free-b");
    await isolatedRequest(() =>
      orders.reject(first.id, { reason: "Free a count slot" }, actorUserId),
    );

    const retry = await assistedSubmit("free-c");
    expect(retry.status).toBe("pending");

    const month = `${new Date().getUTCFullYear()}-${String(new Date().getUTCMonth() + 1).padStart(2, "0")}-01`;
    const resetOnce = await isolatedRequest(() =>
      budgets.resetMonthlyLimit(ids.family, { month, reason: "Back to global default" }, actorUserId),
    );
    expect(resetOnce.reset).toBe(true);
    const resetTwice = await isolatedRequest(() =>
      budgets.resetMonthlyLimit(ids.family, { month, reason: "Back to global default" }, actorUserId),
    );
    expect(resetTwice.reset).toBe(true);
    expect(resetTwice.removed).toBe(false);
  });

  it("rejects unsafe money and invalid count values at the schema boundary", async () => {
    await expect(
      pool.query(`UPDATE budget_accounts SET max_orders_per_month = 0 WHERE id = $1`, [accountId]),
    ).rejects.toThrow();
    await expect(
      pool.query(`UPDATE budget_accounts SET max_orders_per_month = 32 WHERE id = $1`, [accountId]),
    ).rejects.toThrow();
    await expect(
      pool.query(`UPDATE budget_accounts SET max_budget_per_order_minor = 0 WHERE id = $1`, [accountId]),
    ).rejects.toThrow();
    await expect(
      pool.query(`UPDATE budget_accounts SET max_budget_per_order_minor = 9007199254740992 WHERE id = $1`, [accountId]),
    ).rejects.toThrow();
    await expect(
      pool.query(`UPDATE platform_settings SET default_max_orders_per_month = 0 WHERE id = 'platform'`),
    ).rejects.toThrow();
    await expect(
      pool.query(`UPDATE platform_settings SET default_monthly_budget_minor = 9007199254740992 WHERE id = 'platform'`),
    ).rejects.toThrow();
  });
});
