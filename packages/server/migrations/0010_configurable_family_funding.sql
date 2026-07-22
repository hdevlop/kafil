CREATE TYPE "public"."family_funding_status" AS ENUM('pending_funding', 'active');--> statement-breakpoint
CREATE TABLE "platform_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"family_funding_target_minor" bigint NOT NULL,
	"currency" varchar(3) DEFAULT 'MAD' NOT NULL,
	"updated_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "platform_settings_singleton_check" CHECK ("platform_settings"."id" = 'platform'),
	CONSTRAINT "platform_settings_positive_funding_target_check" CHECK ("platform_settings"."family_funding_target_minor" > 0),
	CONSTRAINT "platform_settings_currency_check" CHECK ("platform_settings"."currency" = 'MAD')
);
--> statement-breakpoint
ALTER TABLE "family_profiles" ADD COLUMN "funding_status" "family_funding_status" DEFAULT 'pending_funding' NOT NULL;--> statement-breakpoint
ALTER TABLE "family_profiles" ADD COLUMN "funding_activated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "platform_settings" ADD CONSTRAINT "platform_settings_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
INSERT INTO "platform_settings" ("id", "family_funding_target_minor", "currency")
VALUES ('platform', 720000, 'MAD');--> statement-breakpoint
UPDATE "family_profiles" AS "family"
SET
	"funding_status" = 'active',
	"funding_activated_at" = now()
FROM "platform_settings" AS "setting"
WHERE
	"setting"."id" = 'platform'
	AND (
		EXISTS (
			SELECT 1
			FROM "orders" AS "order"
			WHERE "order"."private_household_id" = "family"."private_household_id"
		)
		OR COALESCE((
			SELECT SUM("entry"."amount_minor")
			FROM "budget_accounts" AS "account"
			INNER JOIN "budget_ledger_entries" AS "entry"
				ON "entry"."budget_account_id" = "account"."id"
			WHERE
				"account"."private_household_id" = "family"."private_household_id"
				AND "entry"."entry_type" IN ('contribution_credit', 'contribution_refund')
		), 0) >= "setting"."family_funding_target_minor"
	);
