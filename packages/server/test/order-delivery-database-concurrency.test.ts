import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Pool, type PoolClient } from "pg";

const databaseDescribe =
  process.env.KAFIL_RUN_DB_INTEGRATION === "1" ? describe : describe.skip;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 4,
});

const fixture = {
  orderId: crypto.randomUUID(),
  purchaseOrderId: crypto.randomUUID(),
  budgetAccountId: crypto.randomUUID(),
  firstStaffId: crypto.randomUUID(),
  secondStaffId: crypto.randomUUID(),
};

let actorUserId = "";
const familyProfileId = crypto.randomUUID();

async function assignWithOrderLock(
  staffProfileId: string,
  idempotencyKey: string,
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT id FROM orders WHERE id = $1 FOR UPDATE", [
      fixture.orderId,
    ]);
    const repeated = await client.query<{ id: string; order_id: string; staff_profile_id: string }>(
      `SELECT id, order_id, staff_profile_id
       FROM order_delivery_attempts
       WHERE assignment_idempotency_key = $1`,
      [idempotencyKey],
    );
    if (repeated.rows[0]) {
      if (
        repeated.rows[0].order_id !== fixture.orderId ||
        repeated.rows[0].staff_profile_id !== staffProfileId
      ) {
        throw new Error("idempotency context conflict");
      }
      await client.query("COMMIT");
      return repeated.rows[0].id;
    }
    const active = await client.query(
      `SELECT id FROM order_delivery_attempts
       WHERE order_id = $1 AND status IN ('assigned', 'in_progress')`,
      [fixture.orderId],
    );
    if (active.rows[0]) {
      await client.query("ROLLBACK");
      return null;
    }
    const staff = await client.query<{
      affiliation: "internal" | "external";
      company_name: string | null;
      name: string;
      phone: string;
    }>(
      `SELECT sp.name, sp.phone, sp.affiliation, sp.company_name
       FROM staff_profiles sp
       INNER JOIN staff_functions sf ON sf.staff_profile_id = sp.id
       WHERE sp.id = $1 AND sp.status = 'active' AND sf.function_key = 'delivery'`,
      [staffProfileId],
    );
    if (!staff.rows[0]) throw new Error("active delivery staff missing");
    const attempt = await client.query<{ id: string }>(
      `INSERT INTO order_delivery_attempts
         (order_id, staff_profile_id, delivery_name_snapshot,
          delivery_phone_snapshot, affiliation_snapshot, company_name_snapshot,
          assigned_by_user_id, assignment_idempotency_key)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        fixture.orderId,
        staffProfileId,
        staff.rows[0].name,
        staff.rows[0].phone,
        staff.rows[0].affiliation,
        staff.rows[0].company_name,
        actorUserId,
        idempotencyKey,
      ],
    );
    await client.query("COMMIT");
    return attempt.rows[0]!.id;
  } catch (error) {
    await rollbackQuietly(client);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * The Delivery-owned purchase, taken exactly as the service takes it: the order
 * row is locked first, and ownership is proved from the active attempt read
 * under that same lock.
 */
async function ownPurchaseWithOrderLock(
  staffProfileId: string,
  idempotencyKey: string,
  actualTotalMinor: number,
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const order = await client.query<{ status: string }>(
      "SELECT status FROM orders WHERE id = $1 FOR UPDATE",
      [fixture.purchaseOrderId],
    );
    const attempt = await client.query<{
      id: string;
      staff_profile_id: string;
      status: string;
    }>(
      `SELECT id, staff_profile_id, status
       FROM order_delivery_attempts
       WHERE order_id = $1 AND status IN ('assigned', 'in_progress')
       FOR UPDATE`,
      [fixture.purchaseOrderId],
    );
    if (
      !attempt.rows[0] ||
      attempt.rows[0].staff_profile_id !== staffProfileId ||
      attempt.rows[0].status !== "assigned"
    ) {
      await client.query("ROLLBACK");
      return { outcome: "denied" as const };
    }
    if (order.rows[0]?.status !== "approved") {
      await client.query("ROLLBACK");
      return { outcome: "conflict" as const };
    }
    const purchaseId = crypto.randomUUID();
    await client.query(
      `INSERT INTO order_purchase_records
         (id, order_id, merchant_name, purchased_at, actual_total_minor,
          receipt_storage_path, receipt_media_type, receipt_byte_size,
          recorded_by_user_id, idempotency_key)
       VALUES ($1, $2, 'Marjane', now(), $3, $4, 'application/pdf', 64, $5, $6)`,
      [
        purchaseId,
        fixture.purchaseOrderId,
        actualTotalMinor,
        `/api/order-evidence/receipts/serve/${purchaseId}.pdf`,
        actorUserId,
        idempotencyKey,
      ],
    );
    await client.query(
      `UPDATE budget_accounts
       SET reserved_minor = reserved_minor - $2,
           spent_minor = spent_minor + $2,
           version = version + 1
       WHERE id = $1`,
      [fixture.budgetAccountId, actualTotalMinor],
    );
    await client.query(
      "UPDATE orders SET status = 'purchased' WHERE id = $1",
      [fixture.purchaseOrderId],
    );
    await client.query("COMMIT");
    return { outcome: "purchased" as const, purchaseId };
  } catch (error) {
    await rollbackQuietly(client);
    throw error;
  } finally {
    client.release();
  }
}

/** Reassignment takes the same order lock first, so the two commands serialize. */
async function reassignWithOrderLock(nextStaffProfileId: string) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT id FROM orders WHERE id = $1 FOR UPDATE", [
      fixture.purchaseOrderId,
    ]);
    const current = await client.query<{ id: string }>(
      `SELECT id FROM order_delivery_attempts
       WHERE order_id = $1 AND status = 'assigned'
       FOR UPDATE`,
      [fixture.purchaseOrderId],
    );
    if (!current.rows[0]) {
      await client.query("ROLLBACK");
      return { outcome: "denied" as const };
    }
    await client.query(
      `UPDATE order_delivery_attempts
       SET status = 'cancelled', cancellation_reason = 'Courier shift changed',
           cancelled_at = now()
       WHERE id = $1`,
      [current.rows[0].id],
    );
    const staff = await client.query<{
      affiliation: "internal" | "external";
      company_name: string | null;
      name: string;
      phone: string;
    }>(
      `SELECT sp.name, sp.phone, sp.affiliation, sp.company_name
       FROM staff_profiles sp
       WHERE sp.id = $1`,
      [nextStaffProfileId],
    );
    await client.query(
      `INSERT INTO order_delivery_attempts
         (order_id, staff_profile_id, delivery_name_snapshot,
          delivery_phone_snapshot, affiliation_snapshot, company_name_snapshot,
          assigned_by_user_id, assignment_idempotency_key)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        fixture.purchaseOrderId,
        nextStaffProfileId,
        staff.rows[0]!.name,
        staff.rows[0]!.phone,
        staff.rows[0]!.affiliation,
        staff.rows[0]!.company_name,
        actorUserId,
        `reassign-${crypto.randomUUID()}`,
      ],
    );
    await client.query("COMMIT");
    return { outcome: "reassigned" as const };
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
    // Preserve the original database error.
  }
}

beforeAll(async () => {
  if (process.env.KAFIL_RUN_DB_INTEGRATION !== "1") return;
  const context = await pool.query<{ actor_user_id: string }>(
    `SELECT u.id AS actor_user_id FROM users u
     WHERE lower(u.email) = lower($1)
     LIMIT 1`,
    [process.env.KAFIL_ADMIN_EMAIL],
  );
  actorUserId = context.rows[0]?.actor_user_id ?? "";
  if (!actorUserId) {
    throw new Error("Run the normal Kafil setup before DB tests.");
  }
  const suffix = fixture.orderId.slice(0, 8);
  await pool.query(
    `INSERT INTO family_profiles
       (id, user_id, guardian_legal_name, guardian_cin, exact_address,
        housing_situation, registration_date, support_priority,
        created_by_user_id, funding_target_minor)
     VALUES ($1, $2, 'Delivery DB family', $3, 'Protected test address',
             'rented', '2026-01-15', 'normal', $2, 1000)`,
    [familyProfileId, actorUserId, `DLV${suffix}`],
  );
  await pool.query(
    `INSERT INTO staff_profiles (id, name, phone, affiliation, status)
     VALUES ($1, 'DB Delivery One', $3, 'internal', 'active'),
            ($2, 'DB Delivery Two', $4, 'external', 'active')`,
    [
      fixture.firstStaffId,
      fixture.secondStaffId,
      `+21261${suffix.slice(0, 7)}`,
      `+21262${suffix.slice(0, 7)}`,
    ],
  );
  await pool.query(
    `INSERT INTO staff_functions (staff_profile_id, function_key)
     VALUES ($1, 'delivery'), ($2, 'delivery')`,
    [fixture.firstStaffId, fixture.secondStaffId],
  );
  await pool.query(
    `INSERT INTO orders
       (id, order_number, submission_idempotency_key, family_profile_id,
        status, subtotal_minor, total_minor, guardian_legal_name_snapshot,
        delivery_address_snapshot, placed_by_user_id)
     VALUES ($1, $2, $3, $4, 'purchased', 100, 100,
             'Delivery DB family', 'Protected test address', $5)`,
    [
      fixture.orderId,
      `DELIVERY-${suffix}`,
      `delivery-db-${fixture.orderId}`,
      familyProfileId,
      actorUserId,
    ],
  );
  await pool.query(
    `INSERT INTO budget_accounts
       (id, family_profile_id, available_minor, reserved_minor, spent_minor)
     VALUES ($1, $2, 400, 600, 0)`,
    [fixture.budgetAccountId, familyProfileId],
  );
  await pool.query(
    `INSERT INTO orders
       (id, order_number, submission_idempotency_key, family_profile_id,
        status, subtotal_minor, total_minor, guardian_legal_name_snapshot,
        delivery_address_snapshot, placed_by_user_id)
     VALUES ($1, $2, $3, $4, 'approved', 600, 600,
             'Delivery DB family', 'Protected test address', $5)`,
    [
      fixture.purchaseOrderId,
      `PURCHASE-${suffix}`,
      `delivery-purchase-db-${fixture.purchaseOrderId}`,
      familyProfileId,
      actorUserId,
    ],
  );
  await pool.query(
    `INSERT INTO order_delivery_attempts
       (order_id, staff_profile_id, delivery_name_snapshot,
        delivery_phone_snapshot, affiliation_snapshot,
        assigned_by_user_id, assignment_idempotency_key)
     VALUES ($1, $2, 'DB Delivery One', $3, 'internal', $4, $5)`,
    [
      fixture.purchaseOrderId,
      fixture.firstStaffId,
      `+21261${suffix.slice(0, 7)}`,
      actorUserId,
      `purchase-assign-${fixture.purchaseOrderId}`,
    ],
  );
});

afterAll(async () => {
  if (process.env.KAFIL_RUN_DB_INTEGRATION === "1") {
    const orderIds = [fixture.orderId, fixture.purchaseOrderId];
    await pool.query(
      "DELETE FROM order_purchase_records WHERE order_id = ANY($1::uuid[])",
      [orderIds],
    );
    await pool.query(
      "DELETE FROM order_delivery_attempts WHERE order_id = ANY($1::uuid[])",
      [orderIds],
    );
    await pool.query("DELETE FROM orders WHERE id = ANY($1::uuid[])", [orderIds]);
    await pool.query("DELETE FROM budget_accounts WHERE id = $1", [
      fixture.budgetAccountId,
    ]);
    await pool.query(
      "DELETE FROM staff_functions WHERE staff_profile_id = ANY($1::uuid[])",
      [[fixture.firstStaffId, fixture.secondStaffId]],
    );
    await pool.query(
      "DELETE FROM staff_profiles WHERE id = ANY($1::uuid[])",
      [[fixture.firstStaffId, fixture.secondStaffId]],
    );
    await pool.query("DELETE FROM family_profiles WHERE id = $1", [
      familyProfileId,
    ]);
  }
  await pool.end();
});

databaseDescribe("order delivery PostgreSQL concurrency", () => {
  it("serializes competing assignments and replays the winning key", async () => {
    const firstKey = `assign-${crypto.randomUUID()}`;
    const secondKey = `assign-${crypto.randomUUID()}`;
    const results = await Promise.all([
      assignWithOrderLock(fixture.firstStaffId, firstKey),
      assignWithOrderLock(fixture.secondStaffId, secondKey),
    ]);
    const winner = results.find((result) => result !== null)!;
    expect(results.filter((result) => result !== null)).toHaveLength(1);

    const active = await pool.query<{ count: string }>(
      `SELECT count(*)::text AS count
       FROM order_delivery_attempts
       WHERE order_id = $1 AND status IN ('assigned', 'in_progress')`,
      [fixture.orderId],
    );
    expect(active.rows[0]?.count).toBe("1");

    const winningIndex = results[0] ? 0 : 1;
    const replayed = await assignWithOrderLock(
      winningIndex === 0 ? fixture.firstStaffId : fixture.secondStaffId,
      winningIndex === 0 ? firstKey : secondKey,
    );
    expect(replayed).toBe(winner);
  });

  it("serializes an own purchase against reassignment and settles at most once", async () => {
    const [purchase, reassignment] = await Promise.all([
      ownPurchaseWithOrderLock(
        fixture.firstStaffId,
        `own-purchase-${crypto.randomUUID()}`,
        550,
      ),
      reassignWithOrderLock(fixture.secondStaffId),
    ]);
    const purchases = await pool.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM order_purchase_records WHERE order_id = $1",
      [fixture.purchaseOrderId],
    );
    const order = await pool.query<{ status: string }>(
      "SELECT status FROM orders WHERE id = $1",
      [fixture.purchaseOrderId],
    );
    const account = await pool.query<{
      available_minor: string;
      reserved_minor: string;
      spent_minor: string;
    }>(
      "SELECT available_minor, reserved_minor, spent_minor FROM budget_accounts WHERE id = $1",
      [fixture.budgetAccountId],
    );

    if (purchase.outcome === "purchased") {
      // The worker held the assignment: exactly one settlement.
      expect(purchases.rows[0]?.count).toBe("1");
      expect(order.rows[0]?.status).toBe("purchased");
      expect(account.rows[0]).toMatchObject({
        available_minor: "400",
        reserved_minor: "50",
        spent_minor: "550",
      });
    } else {
      // Reassignment won: the denied worker moved no money at all.
      expect(reassignment.outcome).toBe("reassigned");
      expect(purchases.rows[0]?.count).toBe("0");
      expect(order.rows[0]?.status).toBe("approved");
      expect(account.rows[0]).toMatchObject({
        available_minor: "400",
        reserved_minor: "600",
        spent_minor: "0",
      });
    }
    // Whatever the interleaving, one active attempt and one owner remain.
    const active = await pool.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM order_delivery_attempts
       WHERE order_id = $1 AND status IN ('assigned', 'in_progress')`,
      [fixture.purchaseOrderId],
    );
    expect(active.rows[0]?.count).toBe("1");
    // A replayed purchase key is refused by the unique index rather than
    // settling twice, whichever side won the race above.
    const replayKey = `own-purchase-replay-${crypto.randomUUID()}`;
    const insertWithKey = () =>
      pool.query(
        `INSERT INTO order_purchase_records
           (order_id, merchant_name, purchased_at, actual_total_minor,
            receipt_storage_path, receipt_media_type, receipt_byte_size,
            recorded_by_user_id, idempotency_key)
         VALUES ($1, 'Marjane', now(), 550, $2, 'application/pdf', 64, $3, $4)`,
        [
          fixture.purchaseOrderId,
          `/api/order-evidence/receipts/serve/${crypto.randomUUID()}.pdf`,
          actorUserId,
          replayKey,
        ],
      );
    await insertWithKey();
    let replayError: { code?: string } | null = null;
    try {
      await insertWithKey();
    } catch (error) {
      replayError = error as { code?: string };
    }
    expect(replayError).toMatchObject({ code: "23505" });
  });

  it("enforces lifecycle fields and retains referenced Staff history", async () => {
    const invalid = pool.query(
      `UPDATE order_delivery_attempts
       SET status = 'failed', failure_reason = 'No answer'
       WHERE order_id = $1`,
      [fixture.orderId],
    );
    await expect(invalid).rejects.toMatchObject({ code: "23514" });

    const deleteReferencedStaff = pool.query(
      "DELETE FROM staff_profiles WHERE id = (SELECT staff_profile_id FROM order_delivery_attempts WHERE order_id = $1 LIMIT 1)",
      [fixture.orderId],
    );
    await expect(deleteReferencedStaff).rejects.toMatchObject({ code: "23503" });
  });
});
