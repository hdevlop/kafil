import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Pool } from "pg";

import { server } from "../src";
import { DashboardService } from "../src/modules/dashboard";

const databaseDescribe =
  process.env.KAFIL_RUN_DB_INTEGRATION === "1" ? describe : describe.skip;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 4 });

const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 10);
const selectedDate = "2026-09-09";
// 08:00Z is 09:00 in Casablanca: morning windows are not delayed.
const fixedNow = new Date("2026-09-09T08:00:00.000Z");

const ids = {
  courierA: `dir-courier-a-${suffix}`,
  courierB: `dir-courier-b-${suffix}`,
  familyUserOne: `dir-family-u1-${suffix}`,
  familyUserTwo: `dir-family-u2-${suffix}`,
  staffA: crypto.randomUUID(),
  staffB: crypto.randomUUID(),
  familyOne: crypto.randomUUID(),
  familyTwo: crypto.randomUUID(),
  orderOne: crypto.randomUUID(),
  orderTwo: crypto.randomUUID(),
  orderThree: crypto.randomUUID(),
  orderFour: crypto.randomUUID(),
  attemptOne: crypto.randomUUID(),
  attemptTwo: crypto.randomUUID(),
  attemptThree: crypto.randomUUID(),
  attemptFour: crypto.randomUUID(),
  issueOne: crypto.randomUUID(),
  issueTwo: crypto.randomUUID(),
  issueResolved: crypto.randomUUID(),
};

let actorUserId = "";

function inRequestScope<T>(operation: () => Promise<T>) {
  return server.container.run({}, operation);
}

function directory(userId: string, query: Record<string, unknown>) {
  const service = server.container.get(DashboardService);
  return inRequestScope(() =>
    service.getDeliveryFamilies(
      userId,
      query as unknown as Parameters<DashboardService["getDeliveryFamilies"]>[1],
      fixedNow,
    ),
  );
}

async function cleanup() {
  await pool.query(`DELETE FROM order_delivery_issues WHERE id = ANY($1::uuid[])`, [
    [ids.issueOne, ids.issueTwo, ids.issueResolved],
  ]);
  await pool.query(
    `DELETE FROM order_delivery_attempts WHERE id = ANY($1::uuid[])`,
    [[ids.attemptOne, ids.attemptTwo, ids.attemptThree, ids.attemptFour]],
  );
  await pool.query(`DELETE FROM orders WHERE id = ANY($1::uuid[])`, [
    [ids.orderOne, ids.orderTwo, ids.orderThree, ids.orderFour],
  ]);
  await pool.query(`DELETE FROM staff_functions WHERE staff_profile_id = ANY($1::uuid[])`, [
    [ids.staffA, ids.staffB],
  ]);
  await pool.query(`DELETE FROM staff_profiles WHERE id = ANY($1::uuid[])`, [
    [ids.staffA, ids.staffB],
  ]);
  await pool.query(`DELETE FROM family_profiles WHERE id = ANY($1::uuid[])`, [
    [ids.familyOne, ids.familyTwo],
  ]);
  await pool.query(`DELETE FROM users WHERE id = ANY($1::text[])`, [
    [ids.courierA, ids.courierB, ids.familyUserOne, ids.familyUserTwo],
  ]);
}

beforeAll(async () => {
  if (process.env.KAFIL_RUN_DB_INTEGRATION !== "1") return;
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for DB tests.");
  }
  await server.init();
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
  await cleanup();

  const seedUsers: Array<[string, string, string, string]> = [
    [ids.courierA, "Directory Courier A", `dir-courier-a-${suffix}@example.test`, "delivery"],
    [ids.courierB, "Directory Courier B", `dir-courier-b-${suffix}@example.test`, "delivery"],
    [ids.familyUserOne, "Directory Atlas Family", `dir-family-one-${suffix}@example.test`, "family"],
    [ids.familyUserTwo, "Directory Rif Family", `dir-family-two-${suffix}@example.test`, "family"],
  ];
  for (const [id, name, email, role] of seedUsers) {
    await pool.query(
      `INSERT INTO users (id, name, email, password, status, email_verified, role_id)
       VALUES ($1, $2, $3, 'hashed:placeholder', 'active', true,
               (SELECT id FROM roles WHERE name = $4 LIMIT 1))`,
      [id, name, email, role],
    );
  }
  await pool.query(
    `INSERT INTO staff_profiles (id, user_id, name, phone, affiliation, status)
     VALUES ($1, $2, 'Directory Courier A', $3, 'internal', 'active'),
            ($4, $5, 'Directory Courier B', $6, 'internal', 'active')`,
    [ids.staffA, ids.courierA, `+21261${suffix.slice(0, 7)}`, ids.staffB, ids.courierB, `+21262${suffix.slice(0, 7)}`],
  );
  await pool.query(
    `INSERT INTO staff_functions (staff_profile_id, function_key)
     VALUES ($1, 'delivery'), ($2, 'delivery')`,
    [ids.staffA, ids.staffB],
  );
  await pool.query(
    `INSERT INTO family_profiles
       (id, user_id, guardian_legal_name, guardian_cin, exact_address,
        housing_situation, registration_date, support_priority,
        created_by_user_id, funding_target_minor)
     VALUES ($1, $2, 'Directory Atlas Guardian', $3, 'Protected atlas address',
             'rented', '2026-01-15', 'normal', $4, 1000),
            ($5, $6, 'Directory Rif Guardian', $7, 'Protected rif address',
             'rented', '2026-01-15', 'normal', $4, 1000)`,
    [ids.familyOne, ids.familyUserOne, `DFA${suffix}`, actorUserId, ids.familyTwo, ids.familyUserTwo, `DFR${suffix}`],
  );
  await pool.query(
    `INSERT INTO orders
       (id, order_number, submission_idempotency_key, family_profile_id,
        status, subtotal_minor, total_minor, guardian_legal_name_snapshot,
        delivery_address_snapshot, delivery_phone_snapshot,
        delivery_latitude_snapshot, delivery_longitude_snapshot, placed_by_user_id)
     VALUES
       ($1, $2, $3, $4, 'purchased', 100, 100, 'Directory Atlas Guardian',
        'Protected atlas address', '+212600000001', 33.57, -7.59, $5),
       ($6, $7, $8, $4, 'purchased', 200, 200, 'Directory Atlas Guardian',
        'Protected atlas second address', '+212600000009', NULL, NULL, $5),
       ($9, $10, $11, $12, 'delivered', 300, 300, 'Directory Rif Guardian',
        'Protected rif address', NULL, NULL, NULL, $5),
       ($13, $14, $15, $12, 'purchased', 400, 400, 'Directory Rif Guardian',
        'Protected rif address', '+212600000004', NULL, NULL, $5)`,
    [
      ids.orderOne, `DIR1-${suffix}`, `dir-submit-${ids.orderOne}`, ids.familyOne, actorUserId,
      ids.orderTwo, `DIR2-${suffix}`, `dir-submit-${ids.orderTwo}`,
      ids.orderThree, `DIR3-${suffix}`, `dir-submit-${ids.orderThree}`, ids.familyTwo,
      ids.orderFour, `DIR4-${suffix}`, `dir-submit-${ids.orderFour}`,
    ],
  );
  await pool.query(
    `INSERT INTO order_delivery_attempts
       (id, order_id, staff_profile_id, status, delivery_name_snapshot,
        delivery_phone_snapshot, affiliation_snapshot, assigned_by_user_id,
        assignment_idempotency_key, scheduled_date, window_start_minute,
        window_end_minute, package_count, started_at, completed_at)
     VALUES
       ($1, $2, $3, 'assigned', 'Directory Courier A', '+212600000001', 'internal', $4,
        $5, $6::date, 840, 900, 2, NULL, NULL),
       ($7, $8, $3, 'assigned', 'Directory Courier A', '+212600000009', 'internal', $4,
        $9, $6::date, 900, 960, 1, NULL, NULL),
       ($10, $11, $3, 'delivered', 'Directory Courier A', '+212600000004', 'internal', $4,
        $12, $6::date, NULL, NULL, 3, $6::timestamptz, $6::timestamptz),
       ($13, $14, $15, 'assigned', 'Directory Courier B', '+212600000004', 'internal', $4,
        $16, $6::date, 780, 840, 1, NULL, NULL)`,
    [
      ids.attemptOne, ids.orderOne, ids.staffA, actorUserId, `dir-assign-${ids.attemptOne}`, selectedDate,
      ids.attemptTwo, ids.orderTwo, `dir-assign-${ids.attemptTwo}`,
      ids.attemptThree, ids.orderThree, `dir-assign-${ids.attemptThree}`,
      ids.attemptFour, ids.orderFour, ids.staffB, `dir-assign-${ids.attemptFour}`,
    ],
  );
  await pool.query(
    `INSERT INTO order_delivery_issues
       (id, attempt_id, kind, report_idempotency_key, reported_by_user_id, resolved_at, resolved_by_user_id)
     VALUES
       ($1, $2, 'family_unreachable', $3, $4, NULL, NULL),
       ($5, $2, 'missing_proof', $6, $4, NULL, NULL),
       ($7, $8, 'address_confirmation', $9, $4, $10::timestamptz, $4)`,
    [
      ids.issueOne, ids.attemptOne, `dir-issue-${ids.issueOne}`, actorUserId,
      ids.issueTwo, `dir-issue-${ids.issueTwo}`,
      ids.issueResolved, ids.attemptTwo, `dir-issue-${ids.issueResolved}`, selectedDate,
    ],
  );
});

afterAll(async () => {
  if (process.env.KAFIL_RUN_DB_INTEGRATION === "1") {
    await cleanup();
  }
  await pool.end();
});

databaseDescribe("delivery families directory PostgreSQL integration", () => {
  it("isolates each courier to their own assigned families", async () => {
    const courierA = await directory(ids.courierA, { date: selectedDate });
    const courierB = await directory(ids.courierB, { date: selectedDate });

    expect(courierA.pagination.total).toBe(2);
    expect(courierB.pagination.total).toBe(1);
    expect(courierB.data.map((entry) => entry.familyProfileId)).toEqual([ids.familyTwo]);
    expect(courierA.data.map((entry) => entry.familyProfileId).sort()).toEqual(
      [ids.familyOne, ids.familyTwo].sort(),
    );
  });

  it("counts distinct orders once despite several open issues on one attempt", async () => {
    const result = await directory(ids.courierA, { date: selectedDate });
    const atlas = result.data.find((entry) => entry.familyProfileId === ids.familyOne);

    expect(atlas).toMatchObject({
      familyName: "Directory Atlas Family",
      status: "needs_attention",
      orderCount: 2,
      pending: 1,
      delivered: 0,
      needsAttention: 1,
      phone: "+212600000001",
      address: "Protected atlas address",
      coordinates: { latitude: 33.57, longitude: -7.59 },
      nextWindowStartMinute: 840,
      nextWindowEndMinute: 900,
    });
  });

  it("keeps resolved issues out of the attention status and paginates stably", async () => {
    const first = await directory(ids.courierA, { date: selectedDate, limit: 1, offset: 0 });
    const second = await directory(ids.courierA, { date: selectedDate, limit: 1, offset: 1 });

    // Courier A's Atlas window (840) sorts before the windowless Rif attempt;
    // null windows sort last with the family name as tie-breaker.
    expect(first.data.map((entry) => entry.familyProfileId)).toEqual([ids.familyOne]);
    expect(second.data.map((entry) => entry.familyProfileId)).toEqual([ids.familyTwo]);
    expect(first.pagination).toMatchObject({ total: 2, page: 1, limit: 1 });
    expect(second.pagination).toMatchObject({ total: 2, page: 2, limit: 1 });

    const otherDate = await directory(ids.courierA, { date: "2026-09-10" });
    expect(otherDate.pagination.total).toBe(0);
    expect(otherDate.data).toEqual([]);
  });

  it("denies couriers without an active delivery staff identity", async () => {
    await expect(directory(`unknown-${suffix}`, { date: selectedDate })).rejects.toThrow();
  });

  it("never exposes guardian identity fields in the directory payload", async () => {
    const result = await directory(ids.courierA, { date: selectedDate });
    const json = JSON.stringify(result);

    expect(json).not.toContain("Guardian");
    expect(json).not.toContain("guardian_legal_name");
    expect(json).not.toContain("guardian_cin");
    expect(json).not.toContain("cin");
    expect(json).not.toContain("documents");
  });
});
