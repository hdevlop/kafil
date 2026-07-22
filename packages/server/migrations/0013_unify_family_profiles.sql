DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "private_households" h
    LEFT JOIN "family_profiles" f ON f."private_household_id" = h."id"
    WHERE f."id" IS NULL
      AND (
        EXISTS (SELECT 1 FROM "children" x WHERE x."private_household_id" = h."id") OR
        EXISTS (SELECT 1 FROM "support_assignments" x WHERE x."private_household_id" = h."id") OR
        EXISTS (SELECT 1 FROM "contributions" x WHERE x."private_household_id" = h."id") OR
        EXISTS (SELECT 1 FROM "document_objects" x WHERE x."private_household_id" = h."id") OR
        EXISTS (SELECT 1 FROM "budget_accounts" x WHERE x."private_household_id" = h."id") OR
        EXISTS (SELECT 1 FROM "carts" x WHERE x."private_household_id" = h."id") OR
        EXISTS (SELECT 1 FROM "orders" x WHERE x."private_household_id" = h."id")
      )
  ) THEN
    RAISE EXCEPTION 'Cannot merge standalone households that still have linked records';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "family_profiles" f
    JOIN "private_households" h ON h."id" = f."private_household_id"
    WHERE h."guardian_cin" IS NULL
  ) THEN
    RAISE EXCEPTION 'Backfill guardian CIN before merging family profiles';
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "family_profiles" ADD COLUMN "guardian_legal_name" text;
--> statement-breakpoint
ALTER TABLE "family_profiles" ADD COLUMN "guardian_cin" varchar(20);
--> statement-breakpoint
ALTER TABLE "family_profiles" ADD COLUMN "exact_address" text;
--> statement-breakpoint
ALTER TABLE "family_profiles" ADD COLUMN "phone" varchar(40);
--> statement-breakpoint
ALTER TABLE "family_profiles" ADD COLUMN "created_by_user_id" text;
--> statement-breakpoint
UPDATE "family_profiles" f
SET "guardian_legal_name" = h."guardian_legal_name",
    "guardian_cin" = h."guardian_cin",
    "exact_address" = h."exact_address",
    "phone" = h."phone",
    "created_by_user_id" = h."created_by_user_id"
FROM "private_households" h
WHERE h."id" = f."private_household_id";
--> statement-breakpoint
ALTER TABLE "budget_accounts" DROP CONSTRAINT "budget_accounts_private_household_id_private_households_id_fk";
--> statement-breakpoint
ALTER TABLE "children" DROP CONSTRAINT "children_private_household_id_private_households_id_fk";
--> statement-breakpoint
ALTER TABLE "contributions" DROP CONSTRAINT "contributions_private_household_id_private_households_id_fk";
--> statement-breakpoint
ALTER TABLE "document_objects" DROP CONSTRAINT "document_objects_private_household_id_private_households_id_fk";
--> statement-breakpoint
ALTER TABLE "carts" DROP CONSTRAINT "carts_private_household_id_private_households_id_fk";
--> statement-breakpoint
ALTER TABLE "orders" DROP CONSTRAINT "orders_private_household_id_private_households_id_fk";
--> statement-breakpoint
ALTER TABLE "support_assignments" DROP CONSTRAINT "support_assignments_private_household_id_private_households_id_fk";
--> statement-breakpoint
UPDATE "budget_accounts" x SET "private_household_id" = f."id" FROM "family_profiles" f WHERE x."private_household_id" = f."private_household_id";
--> statement-breakpoint
UPDATE "children" x SET "private_household_id" = f."id" FROM "family_profiles" f WHERE x."private_household_id" = f."private_household_id";
--> statement-breakpoint
UPDATE "contributions" x SET "private_household_id" = f."id" FROM "family_profiles" f WHERE x."private_household_id" = f."private_household_id";
--> statement-breakpoint
UPDATE "document_objects" x SET "private_household_id" = f."id" FROM "family_profiles" f WHERE x."private_household_id" = f."private_household_id";
--> statement-breakpoint
UPDATE "carts" x SET "private_household_id" = f."id" FROM "family_profiles" f WHERE x."private_household_id" = f."private_household_id";
--> statement-breakpoint
UPDATE "orders" x SET "private_household_id" = f."id" FROM "family_profiles" f WHERE x."private_household_id" = f."private_household_id";
--> statement-breakpoint
UPDATE "support_assignments" x SET "private_household_id" = f."id" FROM "family_profiles" f WHERE x."private_household_id" = f."private_household_id";
--> statement-breakpoint
ALTER TABLE "family_profiles" DROP CONSTRAINT "family_profiles_private_household_id_private_households_id_fk";
--> statement-breakpoint
ALTER TABLE "family_profiles" DROP CONSTRAINT "family_profiles_private_household_id_unique";
--> statement-breakpoint
ALTER TABLE "family_profiles" DROP COLUMN "private_household_id";
--> statement-breakpoint
ALTER TABLE "budget_accounts" RENAME COLUMN "private_household_id" TO "family_profile_id";
--> statement-breakpoint
ALTER TABLE "children" RENAME COLUMN "private_household_id" TO "family_profile_id";
--> statement-breakpoint
ALTER TABLE "contributions" RENAME COLUMN "private_household_id" TO "family_profile_id";
--> statement-breakpoint
ALTER TABLE "document_objects" RENAME COLUMN "private_household_id" TO "family_profile_id";
--> statement-breakpoint
ALTER TABLE "carts" RENAME COLUMN "private_household_id" TO "family_profile_id";
--> statement-breakpoint
ALTER TABLE "orders" RENAME COLUMN "private_household_id" TO "family_profile_id";
--> statement-breakpoint
ALTER TABLE "support_assignments" RENAME COLUMN "private_household_id" TO "family_profile_id";
--> statement-breakpoint
ALTER TABLE "family_profiles" ALTER COLUMN "guardian_legal_name" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "family_profiles" ALTER COLUMN "guardian_cin" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "family_profiles" ALTER COLUMN "exact_address" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "family_profiles" ALTER COLUMN "created_by_user_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "family_profiles" ADD CONSTRAINT "family_profiles_guardian_cin_unique" UNIQUE("guardian_cin");
--> statement-breakpoint
ALTER TABLE "family_profiles" ADD CONSTRAINT "family_profiles_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "budget_accounts" ADD CONSTRAINT "budget_accounts_family_profile_id_family_profiles_id_fk" FOREIGN KEY ("family_profile_id") REFERENCES "public"."family_profiles"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "children" ADD CONSTRAINT "children_family_profile_id_family_profiles_id_fk" FOREIGN KEY ("family_profile_id") REFERENCES "public"."family_profiles"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_family_profile_id_family_profiles_id_fk" FOREIGN KEY ("family_profile_id") REFERENCES "public"."family_profiles"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "document_objects" ADD CONSTRAINT "document_objects_family_profile_id_family_profiles_id_fk" FOREIGN KEY ("family_profile_id") REFERENCES "public"."family_profiles"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_family_profile_id_family_profiles_id_fk" FOREIGN KEY ("family_profile_id") REFERENCES "public"."family_profiles"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_family_profile_id_family_profiles_id_fk" FOREIGN KEY ("family_profile_id") REFERENCES "public"."family_profiles"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "support_assignments" ADD CONSTRAINT "support_assignments_family_profile_id_family_profiles_id_fk" FOREIGN KEY ("family_profile_id") REFERENCES "public"."family_profiles"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "budget_accounts" RENAME CONSTRAINT "budget_accounts_private_household_id_unique" TO "budget_accounts_family_profile_id_unique";
--> statement-breakpoint
ALTER TABLE "carts" RENAME CONSTRAINT "carts_private_household_id_unique" TO "carts_family_profile_id_unique";
--> statement-breakpoint
ALTER INDEX "children_private_household_id_idx" RENAME TO "children_family_profile_id_idx";
--> statement-breakpoint
ALTER INDEX "children_private_household_status_idx" RENAME TO "children_family_profile_status_idx";
--> statement-breakpoint
ALTER INDEX "contributions_household_status_idx" RENAME TO "contributions_family_status_idx";
--> statement-breakpoint
ALTER INDEX "carts_private_household_created_at_idx" RENAME TO "carts_family_created_at_idx";
--> statement-breakpoint
ALTER INDEX "orders_household_created_at_idx" RENAME TO "orders_family_created_at_idx";
--> statement-breakpoint
ALTER INDEX "support_assignments_private_household_id_idx" RENAME TO "support_assignments_family_profile_id_idx";
--> statement-breakpoint
ALTER INDEX "support_assignments_active_household_unique" RENAME TO "support_assignments_active_family_unique";
--> statement-breakpoint
DROP TABLE "private_households";
