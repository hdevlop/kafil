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
const guardianCin = `RC${suffix.slice(0, 8)}`.toUpperCase();

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
    await pool.end();
  });

  it("creates, deletes, and recreates the same family without restarting", async () => {
    const first = await isolatedRequest(() =>
      families.create(input, actorUserId),
    );
    expect(first).toMatchObject({ id: familyId, userId });

    await isolatedRequest(() => families.delete(familyId, actorUserId));

    const removed = await pool.query<{ families: number; users: number }>(
      `SELECT
         (SELECT count(*)::int FROM family_profiles WHERE id = $1) AS families,
         (SELECT count(*)::int FROM users WHERE id = $2) AS users`,
      [familyId, userId],
    );
    expect(removed.rows[0]).toEqual({ families: 0, users: 0 });

    const recreated = await isolatedRequest(() =>
      families.create(input, actorUserId),
    );
    expect(recreated).toMatchObject({ id: familyId, userId });
  });
});
