import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Pool } from "pg";

import { server } from "../src";
import { ContributionService } from "../src/modules/contributions";
import { FamilyService } from "../src/modules/families";
import { SupportAssignmentService } from "../src/modules/supportAssignments";

const databaseDescribe =
  process.env.KAFIL_RUN_DB_INTEGRATION === "1" ? describe : describe.skip;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 8,
});

const ids = {
  family: crypto.randomUUID(),
  account: crypto.randomUUID(),
  sponsor: crypto.randomUUID(),
  secondSponsor: crypto.randomUUID(),
  assignment: crypto.randomUUID(),
  secondAssignment: crypto.randomUUID(),
};
const sponsorUserId = `funding-sponsor-${crypto.randomUUID()}`;
const secondSponsorUserId = `funding-sponsor-${crypto.randomUUID()}`;
const familyUserId = `funding-family-${crypto.randomUUID()}`;
let adminUserId = "";
let contributions: ContributionService;
let families: FamilyService;
let assignments: SupportAssignmentService;

function isolatedRequest<T>(operation: () => Promise<T>) {
  return server.container.run({}, operation);
}

async function clearFinancialState(targetMinor = 10_000) {
  await pool.query(
    `DELETE FROM outbox_events
     WHERE aggregate_type = 'family' AND aggregate_id = $1`,
    [ids.family],
  );
  const extraAssignments = await pool.query<{ id: string }>(
    `SELECT id FROM support_assignments
     WHERE sponsor_profile_id = $1 AND family_profile_id = $2`,
    [ids.secondSponsor, ids.family],
  );
  const extraAssignmentIds = extraAssignments.rows.map(({ id }) => id);
  if (extraAssignmentIds.length) {
    await pool.query(
      `DELETE FROM audit_events
       WHERE resource = 'supportAssignments'
         AND resource_id = ANY($1::text[])`,
      [extraAssignmentIds],
    );
    await pool.query(
      `DELETE FROM support_assignments WHERE id = ANY($1::uuid[])`,
      [extraAssignmentIds],
    );
  }
  const current = await pool.query<{ id: string }>(
    `SELECT id FROM contributions WHERE family_profile_id = $1`,
    [ids.family],
  );
  const contributionIds = current.rows.map(({ id }) => id);
  if (contributionIds.length) {
    await pool.query(
      `DELETE FROM outbox_events
       WHERE aggregate_type = 'contribution'
         AND aggregate_id = ANY($1::text[])`,
      [contributionIds],
    );
    await pool.query(
      `DELETE FROM audit_events
       WHERE resource = 'contributions'
         AND resource_id = ANY($1::text[])`,
      [contributionIds],
    );
  }
  await pool.query(
    `DELETE FROM budget_ledger_entries WHERE budget_account_id = $1`,
    [ids.account],
  );
  await pool.query(`DELETE FROM contributions WHERE family_profile_id = $1`, [
    ids.family,
  ]);
  await pool.query(
    `UPDATE budget_accounts
     SET available_minor = 0, reserved_minor = 0, spent_minor = 0, version = 0
     WHERE id = $1`,
    [ids.account],
  );
  await pool.query(
    `UPDATE family_profiles
     SET funding_target_minor = $2,
         funding_status = 'pending_funding',
         funding_activated_at = NULL
     WHERE id = $1`,
    [ids.family, targetMinor],
  );
}

async function submit(amountMinor: number, suffix: string) {
  return contributions.submit(
    {
      supportAssignmentId: ids.assignment,
      amountMinor,
      paymentMethod: "db-test",
      externalReference: `funding-cap-${suffix}-${crypto.randomUUID()}`,
      paidAt: new Date(),
    },
    sponsorUserId,
  );
}

async function committedTotals() {
  const result = await pool.query<{
    funded: string;
    pending: string;
    target: string;
  }>(
    `SELECT
       fp.funding_target_minor::text AS target,
       coalesce((
         SELECT sum(ble.amount_minor)
         FROM budget_ledger_entries ble
         WHERE ble.budget_account_id = $2
           AND ble.entry_type IN ('contribution_credit', 'contribution_refund')
       ), 0)::text AS funded,
       coalesce((
         SELECT sum(c.amount_minor)
         FROM contributions c
         WHERE c.family_profile_id = fp.id
           AND c.status = 'pending'
           AND c.expires_at > now()
       ), 0)::text AS pending
     FROM family_profiles fp
     WHERE fp.id = $1`,
    [ids.family, ids.account],
  );
  return {
    target: Number(result.rows[0].target),
    funded: Number(result.rows[0].funded),
    pending: Number(result.rows[0].pending),
  };
}

databaseDescribe("funding-cap PostgreSQL concurrency", () => {
  beforeAll(async () => {
    if (!process.env.DATABASE_URL || !process.env.KAFIL_ADMIN_EMAIL) {
      throw new Error(
        "DATABASE_URL and KAFIL_ADMIN_EMAIL are required for database integration tests.",
      );
    }
    await server.init();
    contributions = server.container.get(ContributionService);
    families = server.container.get(FamilyService);
    assignments = server.container.get(SupportAssignmentService);

    const admin = await pool.query<{ id: string }>(
      `SELECT id FROM users WHERE lower(email) = lower($1) LIMIT 1`,
      [process.env.KAFIL_ADMIN_EMAIL],
    );
    adminUserId = admin.rows[0]?.id ?? "";
    if (!adminUserId) {
      throw new Error("Run `bun run seed -- setup --yes` before DB tests.");
    }
    const sponsorRole = await pool.query<{ id: string }>(
      `SELECT id FROM roles WHERE name = 'sponsor' LIMIT 1`,
    );
    const roleId = sponsorRole.rows[0]?.id;
    if (!roleId) throw new Error("Sponsor role is not seeded.");
    const familyRole = await pool.query<{ id: string }>(
      `SELECT id FROM roles WHERE name = 'family' LIMIT 1`,
    );
    const familyRoleId = familyRole.rows[0]?.id;
    if (!familyRoleId) throw new Error("Family role is not seeded.");

    const suffix = ids.family.slice(0, 8);
    await pool.query(
      `INSERT INTO users
         (id, name, email, password, status, role_id, email_verified)
       VALUES
         ($1, 'Funding sponsor one', $3, 'db-test-password', 'active', $5, true),
         ($2, 'Funding sponsor two', $4, 'db-test-password', 'active', $5, true),
         ($6, 'Funding family', $7, 'db-test-password', 'active', $8, true)`,
      [
        sponsorUserId,
        secondSponsorUserId,
        `funding-one-${suffix}@example.test`,
        `funding-two-${suffix}@example.test`,
        roleId,
        familyUserId,
        `funding-family-${suffix}@example.test`,
        familyRoleId,
      ],
    );
    await pool.query(
      `INSERT INTO sponsor_profiles
         (id, user_id, preferred_currency, cin)
       VALUES ($1, $3, 'MAD', $5), ($2, $4, 'MAD', $6)`,
      [
        ids.sponsor,
        ids.secondSponsor,
        sponsorUserId,
        secondSponsorUserId,
        `SP1${suffix}`,
        `SP2${suffix}`,
      ],
    );
    await pool.query(
      `INSERT INTO family_profiles
         (id, user_id, guardian_legal_name, guardian_cin, exact_address,
          housing_situation, registration_date, support_priority,
          created_by_user_id, funding_target_minor)
       VALUES ($1, $2, 'Funding concurrency', $3, 'Test-only address',
               'rented', '2026-01-15', 'normal', $4, 10000)`,
      [ids.family, familyUserId, `FND${suffix}`, adminUserId],
    );
    await pool.query(
      `INSERT INTO budget_accounts
         (id, family_profile_id, available_minor, reserved_minor, spent_minor)
       VALUES ($1, $2, 0, 0, 0)`,
      [ids.account, ids.family],
    );
    await pool.query(
      `INSERT INTO support_assignments
         (id, sponsor_profile_id, family_profile_id, assigned_by_user_id)
       VALUES ($1, $2, $3, $4)`,
      [ids.assignment, ids.sponsor, ids.family, adminUserId],
    );
  });

  afterAll(async () => {
    await clearFinancialState().catch(() => undefined);
    await pool
      .query(
        `DELETE FROM audit_events
         WHERE resource_id = ANY($1::text[])
            OR actor_user_id = ANY($2::text[])`,
        [
          [ids.family, ids.assignment, ids.secondAssignment],
          [sponsorUserId, secondSponsorUserId],
        ],
      )
      .catch(() => undefined);
    await pool
      .query(
        `DELETE FROM support_assignments
         WHERE id = ANY($1::uuid[])`,
        [[ids.assignment, ids.secondAssignment]],
      )
      .catch(() => undefined);
    await pool
      .query(`DELETE FROM budget_accounts WHERE id = $1`, [ids.account])
      .catch(() => undefined);
    await pool
      .query(`DELETE FROM family_profiles WHERE id = $1`, [ids.family])
      .catch(() => undefined);
    await pool
      .query(
        `DELETE FROM sponsor_profiles WHERE id = ANY($1::uuid[])`,
        [[ids.sponsor, ids.secondSponsor]],
      )
      .catch(() => undefined);
    await pool
      .query(`DELETE FROM users WHERE id = ANY($1::text[])`, [
        [sponsorUserId, secondSponsorUserId, familyUserId],
      ])
      .catch(() => undefined);
    await pool.end();
  });

  it("allows only one of two simultaneous full-cap submissions", async () => {
    await clearFinancialState();
    const race = await Promise.allSettled([
      isolatedRequest(() => submit(10_000, "full-a")),
      isolatedRequest(() => submit(10_000, "full-b")),
    ]);
    expect(race.filter(({ status }) => status === "fulfilled")).toHaveLength(1);
    expect(await committedTotals()).toEqual({
      target: 10_000,
      funded: 0,
      pending: 10_000,
    });
  });

  it("never commits simultaneous 6,000 and 5,000 reservations above 10,000", async () => {
    await clearFinancialState();
    const race = await Promise.allSettled([
      isolatedRequest(() => submit(6_000, "split-a")),
      isolatedRequest(() => submit(5_000, "split-b")),
    ]);
    expect(race.filter(({ status }) => status === "fulfilled")).toHaveLength(1);
    const totals = await committedTotals();
    expect(totals.funded + totals.pending).toBeLessThanOrEqual(totals.target);
  });

  it("validates the exact final contribution without counting its own reservation", async () => {
    await clearFinancialState();
    const contribution = await submit(10_000, "exact-final");
    await contributions.validate(contribution.id, adminUserId);
    expect(await committedTotals()).toEqual({
      target: 10_000,
      funded: 10_000,
      pending: 0,
    });
  });

  it("serializes concurrent validation of legacy pending rows without overfunding", async () => {
    await clearFinancialState();
    const firstId = crypto.randomUUID();
    const secondId = crypto.randomUUID();
    await pool.query(
      `INSERT INTO contributions
         (id, support_assignment_id, sponsor_profile_id, family_profile_id,
          amount_minor, payment_method, expires_at)
       VALUES
         ($1, $3, $4, $5, 6000, 'db-test', now() + interval '1 hour'),
         ($2, $3, $4, $5, 5000, 'db-test', now() + interval '1 hour')`,
      [firstId, secondId, ids.assignment, ids.sponsor, ids.family],
    );
    const race = await Promise.allSettled([
      isolatedRequest(() => contributions.validate(firstId, adminUserId)),
      isolatedRequest(() => contributions.validate(secondId, adminUserId)),
    ]);
    expect(race.filter(({ status }) => status === "fulfilled")).toHaveLength(1);
    const totals = await committedTotals();
    expect(totals.funded).toBeLessThanOrEqual(totals.target);
  });

  it("serializes target lowering against a competing reservation", async () => {
    await clearFinancialState();
    const race = await Promise.allSettled([
      isolatedRequest(() => submit(6_000, "target-race")),
      isolatedRequest(() =>
        families.update(
          ids.family,
          { fundingTargetMinor: 5_000 },
          adminUserId,
        ),
      ),
    ]);
    expect(race.filter(({ status }) => status === "fulfilled")).toHaveLength(1);
    const totals = await committedTotals();
    expect(totals.funded + totals.pending).toBeLessThanOrEqual(totals.target);
  });

  it("does not create a new assignment after a final reservation closes capacity", async () => {
    await clearFinancialState();
    const race = await Promise.allSettled([
      isolatedRequest(() => submit(10_000, "assignment-race")),
      isolatedRequest(() =>
        assignments.create(
          {
            sponsorProfileId: ids.secondSponsor,
            familyProfileId: ids.family,
            notes: "Funding capacity race fixture",
          },
          adminUserId,
        ),
      ),
    ]);
    expect(race[0]?.status).toBe("fulfilled");
    const assignmentRows = await pool.query<{ count: number }>(
      `SELECT count(*)::int AS count
       FROM support_assignments
       WHERE sponsor_profile_id = $1 AND family_profile_id = $2
         AND status = 'active'`,
      [ids.secondSponsor, ids.family],
    );
    expect(assignmentRows.rows[0]?.count).toBeLessThanOrEqual(1);
    await expect(
      isolatedRequest(() =>
        assignments.create(
          {
            sponsorProfileId: ids.secondSponsor,
            familyProfileId: ids.family,
          },
          adminUserId,
        ),
      ),
    ).rejects.toThrow();
  });

  it("lets two expiry workers transition each due row once", async () => {
    await clearFinancialState();
    const dueId = crypto.randomUUID();
    await pool.query(
      `INSERT INTO contributions
         (id, support_assignment_id, sponsor_profile_id, family_profile_id,
          amount_minor, payment_method, expires_at)
       VALUES ($1, $2, $3, $4, 1000, 'db-test', '2000-01-01T00:00:00Z')`,
      [dueId, ids.assignment, ids.sponsor, ids.family],
    );
    const now = new Date();
    await Promise.all([
      isolatedRequest(() => contributions.expireDueBatch(now, 100)),
      isolatedRequest(() => contributions.expireDueBatch(now, 100)),
    ]);
    const result = await pool.query<{
      status: string;
      audits: number;
      events: number;
    }>(
      `SELECT c.status,
         (SELECT count(*)::int FROM audit_events
          WHERE action = 'contribution.expired' AND resource_id = c.id::text) AS audits,
         (SELECT count(*)::int FROM outbox_events
          WHERE topic = 'contribution.expired' AND aggregate_id = c.id::text) AS events
       FROM contributions c WHERE c.id = $1`,
      [dueId],
    );
    expect(result.rows[0]).toEqual({
      status: "expired",
      audits: 1,
      events: 1,
    });
  });

  it("expiry wins against validation of an already-due contribution without credit", async () => {
    await clearFinancialState();
    const dueId = crypto.randomUUID();
    await pool.query(
      `INSERT INTO contributions
         (id, support_assignment_id, sponsor_profile_id, family_profile_id,
          amount_minor, payment_method, expires_at)
       VALUES ($1, $2, $3, $4, 1000, 'db-test', '2000-01-01T00:00:00Z')`,
      [dueId, ids.assignment, ids.sponsor, ids.family],
    );
    await Promise.allSettled([
      isolatedRequest(() => contributions.validate(dueId, adminUserId)),
      isolatedRequest(() => contributions.expireDueBatch(new Date(), 100)),
    ]);
    // A SKIP LOCKED expiry worker may pass while the validator briefly owns the
    // row lock. The next worker pass must converge the already-due row.
    await isolatedRequest(() =>
      contributions.expireDueBatch(new Date(), 100),
    );
    const result = await pool.query<{ status: string; credits: number }>(
      `SELECT c.status,
         (SELECT count(*)::int FROM budget_ledger_entries
          WHERE source_type = 'contribution' AND source_id = c.id::text
            AND entry_type = 'contribution_credit') AS credits
       FROM contributions c WHERE c.id = $1`,
      [dueId],
    );
    expect(result.rows[0]).toEqual({ status: "expired", credits: 0 });
  });
});
