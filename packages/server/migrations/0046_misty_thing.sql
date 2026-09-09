CREATE TYPE "public"."delivery_issue_kind" AS ENUM('address_confirmation', 'family_unreachable', 'missing_proof');--> statement-breakpoint
CREATE TABLE "order_delivery_issues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attempt_id" uuid NOT NULL,
	"kind" "delivery_issue_kind" NOT NULL,
	"note" text,
	"report_idempotency_key" varchar(160) NOT NULL,
	"reported_by_user_id" text NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_delivery_issues_resolution_check" CHECK ((
        ("order_delivery_issues"."resolved_at" IS NULL AND "order_delivery_issues"."resolved_by_user_id" IS NULL)
        OR
        ("order_delivery_issues"."resolved_at" IS NOT NULL AND "order_delivery_issues"."resolved_by_user_id" IS NOT NULL)
      ))
);
--> statement-breakpoint
ALTER TABLE "family_profiles" ADD COLUMN "delivery_latitude" double precision;--> statement-breakpoint
ALTER TABLE "family_profiles" ADD COLUMN "delivery_longitude" double precision;--> statement-breakpoint
ALTER TABLE "order_delivery_attempts" ADD COLUMN "scheduled_date" date;--> statement-breakpoint
ALTER TABLE "order_delivery_attempts" ADD COLUMN "window_start_minute" integer;--> statement-breakpoint
ALTER TABLE "order_delivery_attempts" ADD COLUMN "window_end_minute" integer;--> statement-breakpoint
ALTER TABLE "order_delivery_attempts" ADD COLUMN "package_count" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_latitude_snapshot" double precision;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_longitude_snapshot" double precision;--> statement-breakpoint
ALTER TABLE "order_delivery_issues" ADD CONSTRAINT "order_delivery_issues_attempt_id_order_delivery_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."order_delivery_attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_delivery_issues" ADD CONSTRAINT "order_delivery_issues_reported_by_user_id_users_id_fk" FOREIGN KEY ("reported_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_delivery_issues" ADD CONSTRAINT "order_delivery_issues_resolved_by_user_id_users_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "order_delivery_issues_report_key_unique" ON "order_delivery_issues" USING btree ("report_idempotency_key");--> statement-breakpoint
CREATE INDEX "order_delivery_issues_attempt_open_idx" ON "order_delivery_issues" USING btree ("attempt_id","resolved_at");--> statement-breakpoint
CREATE INDEX "order_delivery_attempts_staff_schedule_idx" ON "order_delivery_attempts" USING btree ("staff_profile_id","scheduled_date");--> statement-breakpoint
ALTER TABLE "family_profiles" ADD CONSTRAINT "family_profiles_delivery_coordinates_check" CHECK ((
        ("family_profiles"."delivery_latitude" IS NULL AND "family_profiles"."delivery_longitude" IS NULL)
        OR
        ("family_profiles"."delivery_latitude" BETWEEN -90 AND 90 AND "family_profiles"."delivery_longitude" BETWEEN -180 AND 180)
      ));--> statement-breakpoint
ALTER TABLE "order_delivery_attempts" ADD CONSTRAINT "order_delivery_attempts_schedule_check" CHECK ((
        ("order_delivery_attempts"."window_start_minute" IS NULL AND "order_delivery_attempts"."window_end_minute" IS NULL)
        OR
        ("order_delivery_attempts"."window_start_minute" BETWEEN 0 AND 1439 AND "order_delivery_attempts"."window_end_minute" BETWEEN 1 AND 1440 AND "order_delivery_attempts"."window_start_minute" < "order_delivery_attempts"."window_end_minute")
      ));--> statement-breakpoint
ALTER TABLE "order_delivery_attempts" ADD CONSTRAINT "order_delivery_attempts_package_count_check" CHECK ("order_delivery_attempts"."package_count" IS NULL OR "order_delivery_attempts"."package_count" > 0);