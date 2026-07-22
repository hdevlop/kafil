CREATE TYPE "public"."budget_ledger_entry_type" AS ENUM('contribution_credit', 'manual_credit', 'manual_debit', 'order_reserve', 'order_capture', 'order_release', 'order_refund', 'contribution_refund');--> statement-breakpoint
CREATE TYPE "public"."contribution_plan_kind" AS ENUM('monthly', 'one_time');--> statement-breakpoint
CREATE TYPE "public"."contribution_plan_status" AS ENUM('active', 'paused', 'stopped', 'completed');--> statement-breakpoint
CREATE TYPE "public"."contribution_status" AS ENUM('pending', 'validated', 'rejected', 'refunded');--> statement-breakpoint
CREATE TABLE "budget_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"private_household_id" uuid NOT NULL,
	"currency" varchar(3) DEFAULT 'MAD' NOT NULL,
	"available_minor" bigint DEFAULT 0 NOT NULL,
	"reserved_minor" bigint DEFAULT 0 NOT NULL,
	"spent_minor" bigint DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "budget_accounts_private_household_id_unique" UNIQUE("private_household_id"),
	CONSTRAINT "budget_accounts_currency_check" CHECK ("budget_accounts"."currency" = 'MAD'),
	CONSTRAINT "budget_accounts_non_negative_check" CHECK ("budget_accounts"."available_minor" >= 0 AND "budget_accounts"."reserved_minor" >= 0 AND "budget_accounts"."spent_minor" >= 0)
);
--> statement-breakpoint
CREATE TABLE "budget_ledger_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"budget_account_id" uuid NOT NULL,
	"entry_type" "budget_ledger_entry_type" NOT NULL,
	"amount_minor" bigint NOT NULL,
	"available_after_minor" bigint NOT NULL,
	"reserved_after_minor" bigint NOT NULL,
	"spent_after_minor" bigint NOT NULL,
	"source_type" varchar(80) NOT NULL,
	"source_id" text NOT NULL,
	"idempotency_key" varchar(160) NOT NULL,
	"actor_user_id" text,
	"reason" text,
	"reverses_entry_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "budget_ledger_entries_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "budget_ledger_entries_non_zero_amount_check" CHECK ("budget_ledger_entries"."amount_minor" <> 0),
	CONSTRAINT "budget_ledger_entries_non_negative_balances_check" CHECK ("budget_ledger_entries"."available_after_minor" >= 0 AND "budget_ledger_entries"."reserved_after_minor" >= 0 AND "budget_ledger_entries"."spent_after_minor" >= 0)
);
--> statement-breakpoint
CREATE TABLE "monthly_budget_limits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"budget_account_id" uuid NOT NULL,
	"month" date NOT NULL,
	"limit_minor" bigint NOT NULL,
	"set_by_user_id" text NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "monthly_budget_limits_positive_check" CHECK ("monthly_budget_limits"."limit_minor" > 0),
	CONSTRAINT "monthly_budget_limits_first_day_check" CHECK (EXTRACT(DAY FROM "monthly_budget_limits"."month") = 1)
);
--> statement-breakpoint
CREATE TABLE "contribution_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"support_assignment_id" uuid NOT NULL,
	"kind" "contribution_plan_kind" NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency" varchar(3) DEFAULT 'MAD' NOT NULL,
	"status" "contribution_plan_status" DEFAULT 'active' NOT NULL,
	"starts_at" timestamp with time zone DEFAULT now() NOT NULL,
	"next_due_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contribution_plans_currency_check" CHECK ("contribution_plans"."currency" = 'MAD'),
	CONSTRAINT "contribution_plans_positive_amount_check" CHECK ("contribution_plans"."amount_minor" > 0)
);
--> statement-breakpoint
CREATE TABLE "contributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contribution_plan_id" uuid,
	"support_assignment_id" uuid NOT NULL,
	"sponsor_profile_id" uuid NOT NULL,
	"private_household_id" uuid NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency" varchar(3) DEFAULT 'MAD' NOT NULL,
	"payment_method" varchar(80) NOT NULL,
	"external_reference" varchar(160),
	"status" "contribution_status" DEFAULT 'pending' NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone,
	"validated_by_user_id" text,
	"validated_at" timestamp with time zone,
	"rejected_by_user_id" text,
	"rejected_at" timestamp with time zone,
	"rejection_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contributions_currency_check" CHECK ("contributions"."currency" = 'MAD'),
	CONSTRAINT "contributions_positive_amount_check" CHECK ("contributions"."amount_minor" > 0)
);
--> statement-breakpoint
ALTER TABLE "budget_accounts" ADD CONSTRAINT "budget_accounts_private_household_id_private_households_id_fk" FOREIGN KEY ("private_household_id") REFERENCES "public"."private_households"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_ledger_entries" ADD CONSTRAINT "budget_ledger_entries_budget_account_id_budget_accounts_id_fk" FOREIGN KEY ("budget_account_id") REFERENCES "public"."budget_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_ledger_entries" ADD CONSTRAINT "budget_ledger_entries_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_ledger_entries" ADD CONSTRAINT "budget_ledger_entries_reverses_entry_id_budget_ledger_entries_id_fk" FOREIGN KEY ("reverses_entry_id") REFERENCES "public"."budget_ledger_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_budget_limits" ADD CONSTRAINT "monthly_budget_limits_budget_account_id_budget_accounts_id_fk" FOREIGN KEY ("budget_account_id") REFERENCES "public"."budget_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_budget_limits" ADD CONSTRAINT "monthly_budget_limits_set_by_user_id_users_id_fk" FOREIGN KEY ("set_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contribution_plans" ADD CONSTRAINT "contribution_plans_support_assignment_id_support_assignments_id_fk" FOREIGN KEY ("support_assignment_id") REFERENCES "public"."support_assignments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_contribution_plan_id_contribution_plans_id_fk" FOREIGN KEY ("contribution_plan_id") REFERENCES "public"."contribution_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_support_assignment_id_support_assignments_id_fk" FOREIGN KEY ("support_assignment_id") REFERENCES "public"."support_assignments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_sponsor_profile_id_sponsor_profiles_id_fk" FOREIGN KEY ("sponsor_profile_id") REFERENCES "public"."sponsor_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_private_household_id_private_households_id_fk" FOREIGN KEY ("private_household_id") REFERENCES "public"."private_households"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_validated_by_user_id_users_id_fk" FOREIGN KEY ("validated_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_rejected_by_user_id_users_id_fk" FOREIGN KEY ("rejected_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "budget_ledger_entries_account_created_at_idx" ON "budget_ledger_entries" USING btree ("budget_account_id","created_at");--> statement-breakpoint
CREATE INDEX "budget_ledger_entries_source_idx" ON "budget_ledger_entries" USING btree ("source_type","source_id");--> statement-breakpoint
CREATE UNIQUE INDEX "monthly_budget_limits_account_month_unique" ON "monthly_budget_limits" USING btree ("budget_account_id","month");--> statement-breakpoint
CREATE INDEX "contribution_plans_assignment_status_idx" ON "contribution_plans" USING btree ("support_assignment_id","status");--> statement-breakpoint
CREATE INDEX "contributions_assignment_status_idx" ON "contributions" USING btree ("support_assignment_id","status");--> statement-breakpoint
CREATE INDEX "contributions_sponsor_status_idx" ON "contributions" USING btree ("sponsor_profile_id","status");--> statement-breakpoint
CREATE INDEX "contributions_household_status_idx" ON "contributions" USING btree ("private_household_id","status");--> statement-breakpoint
INSERT INTO "budget_accounts" ("private_household_id")
SELECT "id" FROM "private_households"
ON CONFLICT ("private_household_id") DO NOTHING;
