CREATE TYPE "public"."order_delivery_attempt_status" AS ENUM('assigned', 'in_progress', 'failed', 'delivered', 'cancelled');--> statement-breakpoint
CREATE TABLE "order_delivery_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"staff_profile_id" uuid NOT NULL,
	"status" "order_delivery_attempt_status" DEFAULT 'assigned' NOT NULL,
	"delivery_name_snapshot" varchar(120) NOT NULL,
	"delivery_phone_snapshot" varchar(40) NOT NULL,
	"affiliation_snapshot" varchar(20) NOT NULL,
	"company_name_snapshot" varchar(160),
	"assigned_by_user_id" text NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"failure_reason" text,
	"cancellation_reason" text,
	"assignment_idempotency_key" varchar(160) NOT NULL,
	"start_idempotency_key" varchar(160),
	"fail_idempotency_key" varchar(160),
	"confirmation_idempotency_key" varchar(160),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_delivery_attempts_lifecycle_check" CHECK ((
        ("order_delivery_attempts"."status" = 'assigned' AND "order_delivery_attempts"."started_at" IS NULL AND "order_delivery_attempts"."failed_at" IS NULL AND "order_delivery_attempts"."completed_at" IS NULL AND "order_delivery_attempts"."cancelled_at" IS NULL AND "order_delivery_attempts"."failure_reason" IS NULL AND "order_delivery_attempts"."cancellation_reason" IS NULL)
        OR
        ("order_delivery_attempts"."status" = 'in_progress' AND "order_delivery_attempts"."started_at" IS NOT NULL AND "order_delivery_attempts"."failed_at" IS NULL AND "order_delivery_attempts"."completed_at" IS NULL AND "order_delivery_attempts"."cancelled_at" IS NULL AND "order_delivery_attempts"."failure_reason" IS NULL AND "order_delivery_attempts"."cancellation_reason" IS NULL)
        OR
        ("order_delivery_attempts"."status" = 'failed' AND "order_delivery_attempts"."started_at" IS NOT NULL AND "order_delivery_attempts"."failed_at" IS NOT NULL AND "order_delivery_attempts"."completed_at" IS NULL AND "order_delivery_attempts"."cancelled_at" IS NULL AND length(trim("order_delivery_attempts"."failure_reason")) >= 3 AND "order_delivery_attempts"."cancellation_reason" IS NULL)
        OR
        ("order_delivery_attempts"."status" = 'delivered' AND "order_delivery_attempts"."started_at" IS NOT NULL AND "order_delivery_attempts"."failed_at" IS NULL AND "order_delivery_attempts"."completed_at" IS NOT NULL AND "order_delivery_attempts"."cancelled_at" IS NULL AND "order_delivery_attempts"."failure_reason" IS NULL AND "order_delivery_attempts"."cancellation_reason" IS NULL)
        OR
        ("order_delivery_attempts"."status" = 'cancelled' AND "order_delivery_attempts"."failed_at" IS NULL AND "order_delivery_attempts"."completed_at" IS NULL AND "order_delivery_attempts"."cancelled_at" IS NOT NULL AND "order_delivery_attempts"."failure_reason" IS NULL AND length(trim("order_delivery_attempts"."cancellation_reason")) >= 3)
      ))
);
--> statement-breakpoint
ALTER TABLE "order_delivery_attempts" ADD CONSTRAINT "order_delivery_attempts_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_delivery_attempts" ADD CONSTRAINT "order_delivery_attempts_staff_profile_id_staff_profiles_id_fk" FOREIGN KEY ("staff_profile_id") REFERENCES "public"."staff_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_delivery_attempts" ADD CONSTRAINT "order_delivery_attempts_assigned_by_user_id_users_id_fk" FOREIGN KEY ("assigned_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "order_delivery_attempts_assignment_key_unique" ON "order_delivery_attempts" USING btree ("assignment_idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "order_delivery_attempts_start_key_unique" ON "order_delivery_attempts" USING btree ("start_idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "order_delivery_attempts_fail_key_unique" ON "order_delivery_attempts" USING btree ("fail_idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "order_delivery_attempts_confirmation_key_unique" ON "order_delivery_attempts" USING btree ("confirmation_idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "order_delivery_attempts_one_active_per_order" ON "order_delivery_attempts" USING btree ("order_id") WHERE "order_delivery_attempts"."status" IN ('assigned', 'in_progress');--> statement-breakpoint
CREATE INDEX "order_delivery_attempts_order_assigned_at_idx" ON "order_delivery_attempts" USING btree ("order_id","assigned_at");--> statement-breakpoint
CREATE INDEX "order_delivery_attempts_staff_profile_idx" ON "order_delivery_attempts" USING btree ("staff_profile_id");