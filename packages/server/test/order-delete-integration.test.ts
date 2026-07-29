import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Pool } from "pg";

import { server } from "../src";
import { OrderService } from "../src/modules/orders";

const databaseDescribe =
  process.env.KAFIL_RUN_DB_INTEGRATION === "1" ? describe : describe.skip;

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 4 });

const ids = {
  family: crypto.randomUUID(),
  account: crypto.randomUUID(),
  category: crypto.randomUUID(),
  product: crypto.randomUUID(),
  order: crypto.randomUUID(),
  purchasedOrder: crypto.randomUUID(),
  purchase: crypto.randomUUID(),
  credit: crypto.randomUUID(),
  reserve: crypto.randomUUID(),
  debit: crypto.randomUUID(),
};

let actorUserId = "";
let service: OrderService;

databaseDescribe("order permanent-delete PostgreSQL integration", () => {
  beforeAll(async () => {
    if (!process.env.DATABASE_URL || !process.env.KAFIL_ADMIN_EMAIL) {
      throw new Error(
        "DATABASE_URL and KAFIL_ADMIN_EMAIL are required for database integration tests.",
      );
    }

    await server.init();
    service = server.container.get(OrderService);
    const actor = await pool.query<{ id: string }>(
      "SELECT id FROM users WHERE lower(email) = lower($1) LIMIT 1",
      [process.env.KAFIL_ADMIN_EMAIL],
    );
    actorUserId = actor.rows[0]?.id ?? "";
    if (!actorUserId) {
      throw new Error("Run `bun run seed -- setup --yes` before DB tests.");
    }

    const suffix = ids.family.slice(0, 8);
    await pool.query(
      `INSERT INTO family_profiles
         (id, user_id, guardian_legal_name, guardian_cin, exact_address,
          housing_situation, registration_date, support_priority,
          created_by_user_id, funding_target_minor)
       VALUES ($1, $2, 'Order delete integration', $3, 'Test-only address',
               'rented', '2026-01-15', 'normal', $2, 1000)`,
      [ids.family, actorUserId, `ODEL${suffix}`],
    );
    await pool.query(
      `INSERT INTO budget_accounts
         (id, family_profile_id, available_minor, reserved_minor, spent_minor)
       VALUES ($1, $2, 600, 300, 0)`,
      [ids.account, ids.family],
    );
    await pool.query(
      "INSERT INTO categories (id, name, slug) VALUES ($1, $2, $3)",
      [ids.category, "Order delete integration", `order-delete-${suffix}`],
    );
    await pool.query(
      `INSERT INTO products (id, category_id, sku, name, price_minor)
       VALUES ($1, $2, $3, 'Order delete product', 300)`,
      [ids.product, ids.category, `ODEL-${suffix}`],
    );
    await pool.query(
      `INSERT INTO orders
         (id, order_number, submission_idempotency_key, family_profile_id,
          status, subtotal_minor, total_minor, guardian_legal_name_snapshot,
          delivery_address_snapshot, placed_by_user_id)
       VALUES
         ($1, $3, $5, $7, 'pending', 300, 300, 'Order delete integration', 'Test-only address', $8),
         ($2, $4, $6, $7, 'cancelled', 300, 300, 'Order delete integration', 'Test-only address', $8)`,
      [
        ids.order,
        ids.purchasedOrder,
        `ODEL-${suffix}`,
        `ODEL-P-${suffix}`,
        `order-delete-${suffix}`,
        `order-delete-purchased-${suffix}`,
        ids.family,
        actorUserId,
      ],
    );
    await pool.query(
      `INSERT INTO order_items
         (order_id, product_id, product_name_snapshot, sku_snapshot,
          unit_price_minor, quantity, line_total_minor)
       VALUES ($1, $3, 'Order delete product', $4, 300, 1, 300),
              ($2, $3, 'Order delete product', $4, 300, 1, 300)`,
      [ids.order, ids.purchasedOrder, ids.product, `ODEL-${suffix}`],
    );
    await pool.query(
      `INSERT INTO order_status_events
         (order_id, from_status, to_status, actor_user_id)
       VALUES ($1, NULL, 'pending', $3), ($2, 'purchased', 'cancelled', $3)`,
      [ids.order, ids.purchasedOrder, actorUserId],
    );
    await pool.query(
      `INSERT INTO budget_ledger_entries
         (id, budget_account_id, entry_type, amount_minor,
          available_after_minor, reserved_after_minor, spent_after_minor,
          source_type, source_id, idempotency_key, actor_user_id, created_at)
       VALUES
         ($1, $4, 'contribution_credit', 1000, 1000, 0, 0,
          'contribution', $5, $6, $7, '2026-07-29T10:00:00Z'),
         ($2, $4, 'order_reserve', -300, 700, 300, 0,
          'order', $8, $9, $7, '2026-07-29T10:01:00Z'),
         ($3, $4, 'manual_debit', -100, 600, 300, 0,
          'manual_adjustment', $10, $11, $7, '2026-07-29T10:02:00Z')`,
      [
        ids.credit,
        ids.reserve,
        ids.debit,
        ids.account,
        crypto.randomUUID(),
        `order-delete-credit-${suffix}`,
        actorUserId,
        ids.order,
        `order:${ids.order}:budget:reserve`,
        crypto.randomUUID(),
        `order-delete-debit-${suffix}`,
      ],
    );
    await pool.query(
      `INSERT INTO order_purchase_records
         (id, order_id, merchant_name, purchased_at, actual_total_minor,
          receipt_storage_path, receipt_media_type, receipt_byte_size,
          recorded_by_user_id, idempotency_key)
       VALUES ($1, $2, 'Test merchant', '2026-07-29T11:00:00Z', 300,
               $3, 'application/pdf', 10, $4, $5)`,
      [
        ids.purchase,
        ids.purchasedOrder,
        `/api/order-evidence/receipts/serve/${crypto.randomUUID()}.pdf`,
        actorUserId,
        `order-delete-purchase-${suffix}`,
      ],
    );
  });

  afterAll(async () => {
    if (process.env.KAFIL_RUN_DB_INTEGRATION === "1") {
      await pool.query(
        "DELETE FROM audit_events WHERE resource = 'orders' AND resource_id = ANY($1::text[])",
        [[ids.order, ids.purchasedOrder]],
      );
      await pool.query(
        "DELETE FROM order_purchase_records WHERE order_id = $1",
        [ids.purchasedOrder],
      );
      await pool.query(
        "DELETE FROM order_status_events WHERE order_id = $1",
        [ids.purchasedOrder],
      );
      await pool.query(
        "DELETE FROM order_items WHERE order_id = $1",
        [ids.purchasedOrder],
      );
      await pool.query("DELETE FROM orders WHERE id = $1", [ids.purchasedOrder]);
      await pool.query("DELETE FROM budget_ledger_entries WHERE budget_account_id = $1", [ids.account]);
      await pool.query("DELETE FROM budget_accounts WHERE id = $1", [ids.account]);
      await pool.query("DELETE FROM products WHERE id = $1", [ids.product]);
      await pool.query("DELETE FROM categories WHERE id = $1", [ids.category]);
      await pool.query("DELETE FROM family_profiles WHERE id = $1", [ids.family]);
    }
    await pool.end();
  });

  it("deletes the order graph and rebuilds later ledger snapshots", async () => {
    await service.delete(ids.order, actorUserId);

    const [order, account, ledger, audit] = await Promise.all([
      pool.query("SELECT id FROM orders WHERE id = $1", [ids.order]),
      pool.query<{ available_minor: string; reserved_minor: string; spent_minor: string }>(
        "SELECT available_minor, reserved_minor, spent_minor FROM budget_accounts WHERE id = $1",
        [ids.account],
      ),
      pool.query<{ id: string; available_after_minor: string; reserved_after_minor: string }>(
        `SELECT id, available_after_minor, reserved_after_minor
         FROM budget_ledger_entries WHERE budget_account_id = $1 ORDER BY created_at, id`,
        [ids.account],
      ),
      pool.query("SELECT id FROM audit_events WHERE action = 'order.deleted' AND resource_id = $1", [ids.order]),
    ]);

    expect(order.rowCount).toBe(0);
    expect(account.rows[0]).toEqual({
      available_minor: "900",
      reserved_minor: "0",
      spent_minor: "0",
    });
    expect(ledger.rows).toEqual([
      { id: ids.credit, available_after_minor: "1000", reserved_after_minor: "0" },
      { id: ids.debit, available_after_minor: "900", reserved_after_minor: "0" },
    ]);
    expect(audit.rowCount).toBe(1);
  });

  it("refuses an order with purchase history", async () => {
    await expect(service.delete(ids.purchasedOrder, actorUserId)).rejects.toMatchObject({ status: 409 });
    const order = await pool.query("SELECT id FROM orders WHERE id = $1", [ids.purchasedOrder]);
    expect(order.rowCount).toBe(1);
  });
});
