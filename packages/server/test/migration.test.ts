import { describe, expect, it } from "bun:test";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

const serverRoot = process.cwd().endsWith(join("packages", "server"))
  ? process.cwd()
  : join(process.cwd(), "packages", "server");
const migrationsDirectory = join(serverRoot, "migrations");

const expectedTables = [
  "document_objects",
  "permissions",
  "private_households",
  "operator_profiles",
  "role_permissions",
  "roles",
  "sponsor_profiles",
  "support_assignments",
  "tokens",
  "users",
];

describe("initial PostgreSQL migration", () => {
  it("creates the complete Najm auth and Kafil schema", async () => {
    const migrationFiles = (await readdir(migrationsDirectory)).filter((file) =>
      file.endsWith(".sql"),
    );

    const sql = (
      await Promise.all(
        migrationFiles.map((file) =>
          Bun.file(join(migrationsDirectory, file)).text(),
        ),
      )
    ).join("\n");

    for (const table of expectedTables) {
      expect(sql).toContain(`CREATE TABLE "${table}"`);
    }
    expect(sql).not.toContain("organisations");
    expect(sql).not.toContain("organisation_id");
    expect(sql).not.toContain("public_cases");
    for (const authEnum of ["tokenStatus", "tokenType", "userStatus"]) {
      expect(sql).toContain(`CREATE TYPE "public"."${authEnum}"`);
    }
  });

  it("adds Phase 1 tables and nullable profile-backfill columns without dropping data", async () => {
    const phaseOneMigration = await Bun.file(
      join(migrationsDirectory, "0003_phase1_identity_families.sql"),
    ).text();

    for (const table of ["audit_events", "children", "family_profiles"]) {
      expect(phaseOneMigration).toContain(`CREATE TABLE "${table}"`);
    }
    for (const column of ["cin", "gender", "address", "date_of_birth"]) {
      expect(phaseOneMigration).toContain(
        `ALTER TABLE "operator_profiles" ADD COLUMN "${column}"`,
      );
      expect(phaseOneMigration).toContain(
        `ALTER TABLE "sponsor_profiles" ADD COLUMN "${column}"`,
      );
    }
    expect(phaseOneMigration).not.toContain("DROP COLUMN");
    expect(phaseOneMigration).not.toContain("DROP TABLE");
    expect(phaseOneMigration).not.toContain("RENAME COLUMN");
    expect(phaseOneMigration).not.toContain("SET NOT NULL");
  });

  it("adds Phase 2 support assignments with ended-state and active-target guards", async () => {
    const phaseTwoMigration = await Bun.file(
      join(migrationsDirectory, "0004_phase2_support_assignments.sql"),
    ).text();

    expect(phaseTwoMigration).toContain(
      'CREATE TYPE "public"."support_assignment_status"',
    );
    expect(phaseTwoMigration).toContain(
      'CREATE TABLE "support_assignments"',
    );
    expect(phaseTwoMigration).toContain(
      'CONSTRAINT "support_assignments_ended_state_check"',
    );
    expect(phaseTwoMigration).toContain(
      'CREATE UNIQUE INDEX "support_assignments_active_household_unique"',
    );
    expect(phaseTwoMigration).toContain(
      'CREATE UNIQUE INDEX "support_assignments_active_child_unique"',
    );
  });

  it("adds Phase 3 financial tables and backfills one MAD account per household", async () => {
    const phaseThreeMigration = await Bun.file(
      join(migrationsDirectory, "0005_phase3_budgets_and_contributions.sql"),
    ).text();

    for (const table of [
      "budget_accounts",
      "monthly_budget_limits",
      "budget_ledger_entries",
      "contribution_plans",
      "contributions",
    ]) {
      expect(phaseThreeMigration).toContain(`CREATE TABLE "${table}"`);
    }
    expect(phaseThreeMigration).toContain(
      'INSERT INTO "budget_accounts" ("private_household_id")',
    );
    expect(phaseThreeMigration).toContain(
      'ON CONFLICT ("private_household_id") DO NOTHING',
    );
    expect(phaseThreeMigration).toContain(
      'CONSTRAINT "budget_accounts_currency_check" CHECK',
    );
    expect(phaseThreeMigration).not.toContain("DROP COLUMN");
    expect(phaseThreeMigration).not.toContain("DROP TABLE");
  });

  it("adds Phase 4 catalog and inventory ledger tables without destructive DDL", async () => {
    const phaseFourMigration = await Bun.file(
      join(migrationsDirectory, "0006_phase4_catalog_inventory.sql"),
    ).text();

    for (const table of [
      "categories",
      "products",
      "inventory_balances",
      "inventory_ledger_entries",
    ]) {
      expect(phaseFourMigration).toContain(`CREATE TABLE "${table}"`);
    }
    for (const index of [
      "categories_slug_unique",
      "products_sku_unique",
      "products_status_name_idx",
      "inventory_ledger_entries_product_created_at_idx",
    ]) {
      expect(phaseFourMigration).toContain(`"${index}"`);
    }
    expect(phaseFourMigration).toContain(
      'CONSTRAINT "inventory_balances_quantity_check" CHECK',
    );
    expect(phaseFourMigration).not.toContain("DROP COLUMN");
    expect(phaseFourMigration).not.toContain("DROP TABLE");
  });

  it("adds the durable financial outbox without rewriting committed history", async () => {
    const outboxMigration = await Bun.file(
      join(migrationsDirectory, "0007_phase3_financial_outbox.sql"),
    ).text();

    expect(outboxMigration).toContain('CREATE TABLE "outbox_events"');
    expect(outboxMigration).toContain('CREATE TYPE "public"."outbox_event_status"');
    expect(outboxMigration).toContain('"outbox_events_status_available_at_idx"');
    expect(outboxMigration).not.toContain("DROP COLUMN");
    expect(outboxMigration).not.toContain("DROP TABLE");
  });

  it("adds Phase 5 cart, order snapshot, and lifecycle tables without destructive DDL", async () => {
    const [orderMigration, lifecycleMigration] = await Promise.all([
      Bun.file(
        join(migrationsDirectory, "0008_phase5_cart_orders_fulfillment.sql"),
      ).text(),
      Bun.file(
        join(migrationsDirectory, "0009_phase5_order_lifecycle_timestamps.sql"),
      ).text(),
    ]);

    for (const table of [
      "carts",
      "cart_items",
      "orders",
      "order_items",
      "order_status_events",
    ]) {
      expect(orderMigration).toContain(`CREATE TABLE "${table}"`);
    }
    for (const index of [
      "cart_items_cart_product_unique",
      "orders_order_number_unique",
      "orders_submission_idempotency_key_unique",
      "order_status_events_order_created_at_idx",
    ]) {
      expect(orderMigration).toContain(`"${index}"`);
    }
    expect(orderMigration).toContain(
      'CONSTRAINT "order_items_positive_values_check" CHECK',
    );
    for (const column of [
      "approved_at",
      "rejected_at",
      "cancelled_at",
      "preparation_started_at",
      "delivered_at",
    ]) {
      expect(lifecycleMigration).toContain(`ADD COLUMN "${column}"`);
    }
    expect(orderMigration).not.toContain("DROP COLUMN");
    expect(orderMigration).not.toContain("DROP TABLE");
    expect(lifecycleMigration).not.toContain("DROP COLUMN");
    expect(lifecycleMigration).not.toContain("DROP TABLE");
  });

  it("adds configurable family funding without a code-owned activation amount", async () => {
    const migration = await Bun.file(
      join(migrationsDirectory, "0010_configurable_family_funding.sql"),
    ).text();

    expect(migration).toContain('CREATE TABLE "platform_settings"');
    expect(migration).toContain('"family_funding_target_minor" bigint NOT NULL');
    expect(migration).toContain('ADD COLUMN "funding_status"');
    expect(migration).toContain("INSERT INTO \"platform_settings\"");
    expect(migration).not.toContain("DROP COLUMN");
    expect(migration).not.toContain("DROP TABLE");
  });

  it("backfills a separate activation target for every existing family", async () => {
    const migration = await Bun.file(
      join(migrationsDirectory, "0011_fresh_shockwave.sql"),
    ).text();

    expect(migration).toContain('ADD COLUMN "funding_target_minor" bigint');
    expect(migration).toContain('FROM "platform_settings" AS "setting"');
    expect(migration).toContain('ALTER COLUMN "funding_target_minor" SET NOT NULL');
    expect(migration).toContain(
      '"family_profiles_positive_funding_target_check"',
    );
    expect(migration).not.toContain("DROP COLUMN");
    expect(migration).not.toContain("DROP TABLE");
  });

  it("adds a nullable unique primary-guardian CIN without destructive DDL", async () => {
    const migration = await Bun.file(
      join(migrationsDirectory, "0012_harsh_professor_monster.sql"),
    ).text();

    expect(migration).toContain('ADD COLUMN "guardian_cin" varchar(20)');
    expect(migration).toContain(
      'CONSTRAINT "private_households_guardian_cin_unique" UNIQUE("guardian_cin")',
    );
    expect(migration).not.toContain("SET NOT NULL");
    expect(migration).not.toContain("DROP COLUMN");
    expect(migration).not.toContain("DROP TABLE");
  });

  it("merges private households into the one-login family domain root", async () => {
    const migration = await Bun.file(
      join(migrationsDirectory, "0013_unify_family_profiles.sql"),
    ).text();

    expect(migration).toContain(
      "Cannot merge standalone households that still have linked records",
    );
    expect(migration).toContain(
      "Backfill guardian CIN before merging family profiles",
    );
    expect(migration).toContain('UPDATE "family_profiles" f');
    expect(migration).toContain(
      'RENAME COLUMN "private_household_id" TO "family_profile_id"',
    );
    expect(migration).toContain(
      'REFERENCES "public"."family_profiles"("id")',
    );
    expect(migration).toContain(
      'ALTER COLUMN "guardian_cin" SET NOT NULL',
    );
    expect(migration).toContain('DROP TABLE "private_households"');
  });

  it("adds expiring email verification and backfills unambiguous phone logins", async () => {
    const migration = await Bun.file(
      join(migrationsDirectory, "0014_access_email_phone.sql"),
    ).text();

    expect(migration).toContain('CREATE TABLE "email_verification_tokens"');
    expect(migration).toContain('"token_hash" varchar(64) NOT NULL');
    expect(migration).toContain(
      'ADD COLUMN "guardian_date_of_birth" date',
    );
    expect(migration).toContain('WITH "profile_phones" AS');
    expect(migration).toContain('HAVING count(DISTINCT "user_id") = 1');
    expect(migration).not.toContain('guardian_date_of_birth" SET NOT NULL');
    expect(migration).not.toContain("DROP COLUMN");
    expect(migration).not.toContain("DROP TABLE");
  });

  it("adds a family first-login requirement without forcing legacy accounts", async () => {
    const migration = await Bun.file(
      join(migrationsDirectory, "0015_family_first_login_password.sql"),
    ).text();

    expect(migration).toContain('CREATE TABLE "family_password_requirements"');
    expect(migration).toContain('"required" boolean DEFAULT true NOT NULL');
    expect(migration).toContain('ON DELETE cascade');
    expect(migration).not.toContain('INSERT INTO "family_password_requirements"');
    expect(migration).not.toContain("DROP COLUMN");
    expect(migration).not.toContain("DROP TABLE");
  });

  it("adds Najm OAuth accounts without changing existing auth data", async () => {
    const migration = await Bun.file(
      join(migrationsDirectory, "0017_daily_blonde_phantom.sql"),
    ).text();

    expect(migration).toContain('CREATE TABLE "oauth_accounts"');
    expect(migration).toContain('REFERENCES "public"."users"("id")');
    expect(migration).toContain('"oauth_accounts_provider_account_unique"');
    expect(migration).toContain('"oauth_accounts_user_provider_unique"');
    expect(migration).not.toContain("DROP COLUMN");
    expect(migration).not.toContain("DROP TABLE");
  });
});
