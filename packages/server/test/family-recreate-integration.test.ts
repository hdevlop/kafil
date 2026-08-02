import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Pool } from "pg";

import { server } from "../src";
import { FamilyService } from "../src/modules/families";

const databaseDescribe =
  process.env.KAFIL_RUN_DB_INTEGRATION === "1" ? describe : describe.skip;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 4,
});

const familyId = crypto.randomUUID();
const userId = `family-recreate-${crypto.randomUUID()}`;
const suffix = familyId.replaceAll("-", "").slice(0, 12);
const email = `family-recreate-${suffix}@example.test`;
const phoneDigits = String(Number.parseInt(suffix.slice(0, 8), 16) % 100_000_000)
  .padStart(8, "0");
const phone = `+2126${phoneDigits}`;
const guardianCin = `RC${phoneDigits}`;
const orderId = crypto.randomUUID();
const deliveryAttemptId = crypto.randomUUID();
const staffProfileId = crypto.randomUUID();

let actorUserId = "";
let families: FamilyService;

function isolatedRequest<T>(operation: () => Promise<T>) {
  return server.container.run({}, operation);
}

const input = {
  id: familyId,
  userId,
  name: "Recreate Family",
  email,
  guardianCin,
  guardianDateOfBirth: "1987-03-12",
  exactAddress: "Family recreate integration address",
  phone,
  fundingTargetMinor: 10_000,
  housingSituation: "rented" as const,
  registrationDate: "2026-01-15",
  supportPriority: "normal" as const,
  initialChildren: [],
};

databaseDescribe("family delete and recreate PostgreSQL integration", () => {
  beforeAll(async () => {
    if (!process.env.DATABASE_URL || !process.env.KAFIL_ADMIN_EMAIL) {
      throw new Error(
        "DATABASE_URL and KAFIL_ADMIN_EMAIL are required for database integration tests.",
      );
    }

    await server.init();
    families = server.container.get(FamilyService);

    const actor = await pool.query<{ id: string }>(
      `SELECT id FROM users WHERE lower(email) = lower($1) LIMIT 1`,
      [process.env.KAFIL_ADMIN_EMAIL],
    );
    actorUserId = actor.rows[0]?.id ?? "";
    if (!actorUserId) {
      throw new Error("Run `bun run seed -- setup --yes` before DB tests.");
    }
  });

  afterAll(async () => {
    await pool
      .query(`DELETE FROM order_delivery_attempts WHERE id = $1`, [deliveryAttemptId])
      .catch(() => undefined);
    await pool
      .query(`DELETE FROM orders WHERE id = $1`, [orderId])
      .catch(() => undefined);
    const existing = await pool
      .query<{ id: string }>(
        `SELECT id FROM family_profiles WHERE id = $1 LIMIT 1`,
        [familyId],
      )
      .catch(() => ({ rows: [] as { id: string }[] }));

    if (existing.rows[0] && families && actorUserId) {
      await isolatedRequest(() => families.delete(familyId, actorUserId)).catch(
        () => undefined,
      );
    }

    await pool
      .query(`DELETE FROM audit_events WHERE resource_id = $1`, [familyId])
      .catch(() => undefined);
    await pool
      .query(`DELETE FROM users WHERE id = $1 OR lower(email) = lower($2)`, [
        userId,
        email,
      ])
      .catch(() => undefined);
    await pool
      .query(`DELETE FROM staff_profiles WHERE id = $1`, [staffProfileId])
      .catch(() => undefined);
    await pool.end();
  });

  it("deletes delivery history and recreates the same family without restarting", async () => {
    const first = await isolatedRequest(() =>
      families.create(input, actorUserId),
    );
    expect(first).toMatchObject({ id: familyId, userId });

    await pool.query(
      `INSERT INTO staff_profiles (id, name, phone, affiliation, status)
       VALUES ($1, $2, $3, 'internal', 'active')`,
      [staffProfileId, "Family Delete Delivery", `+2127${phoneDigits}`],
    );
    await pool.query(
      `INSERT INTO orders (
         id, order_number, submission_idempotency_key, family_profile_id,
         placement_source, status, subtotal_minor, total_minor, currency,
         guardian_legal_name_snapshot, delivery_address_snapshot,
         delivery_phone_snapshot, placed_by_user_id
       ) VALUES (
         $1, $2, $3, $4, 'family_self_service', 'pending', 100, 100, 'MAD',
         $5, $6, $7, $8
       )`,
      [
        orderId,
        `FAMILY-DELETE-${suffix}`,
        `family-delete-order:${orderId}`,
        familyId,
        input.name,
        input.exactAddress,
        input.phone,
        actorUserId,
      ],
    );
    await pool.query(
      `INSERT INTO order_delivery_attempts (
         id, order_id, staff_profile_id, status, delivery_name_snapshot,
         delivery_phone_snapshot, affiliation_snapshot, assigned_by_user_id,
         assignment_idempotency_key
       ) VALUES ($1, $2, $3, 'assigned', $4, $5, 'internal', $6, $7)`,
      [
        deliveryAttemptId,
        orderId,
        staffProfileId,
        "Family Delete Delivery",
        `+2127${phoneDigits}`,
        actorUserId,
        `family-delete-delivery:${deliveryAttemptId}`,
      ],
    );

    await isolatedRequest(() => families.delete(familyId, actorUserId));

    const removed = await pool.query<{
      deliveryAttempts: number;
      families: number;
      orders: number;
      users: number;
    }>(
      `SELECT
         (SELECT count(*)::int FROM family_profiles WHERE id = $1) AS families,
         (SELECT count(*)::int FROM users WHERE id = $2) AS users,
         (SELECT count(*)::int FROM orders WHERE id = $3) AS orders,
         (SELECT count(*)::int FROM order_delivery_attempts WHERE id = $4) AS "deliveryAttempts"`,
      [familyId, userId, orderId, deliveryAttemptId],
    );
    expect(removed.rows[0]).toEqual({
      deliveryAttempts: 0,
      families: 0,
      orders: 0,
      users: 0,
    });

    const recreated = await isolatedRequest(() =>
      families.create(input, actorUserId),
    );
    expect(recreated).toMatchObject({ id: familyId, userId });
  });
});
