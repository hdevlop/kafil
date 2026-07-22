CREATE TYPE "public"."support_assignment_status" AS ENUM('active', 'ended');--> statement-breakpoint
CREATE TABLE "support_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sponsor_profile_id" uuid NOT NULL,
	"private_household_id" uuid NOT NULL,
	"child_id" uuid,
	"status" "support_assignment_status" DEFAULT 'active' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"assigned_by_user_id" text NOT NULL,
	"ended_by_user_id" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "support_assignments_ended_state_check" CHECK (("support_assignments"."status" = 'active' AND "support_assignments"."ended_at" IS NULL) OR ("support_assignments"."status" = 'ended' AND "support_assignments"."ended_at" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "support_assignments" ADD CONSTRAINT "support_assignments_sponsor_profile_id_sponsor_profiles_id_fk" FOREIGN KEY ("sponsor_profile_id") REFERENCES "public"."sponsor_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_assignments" ADD CONSTRAINT "support_assignments_private_household_id_private_households_id_fk" FOREIGN KEY ("private_household_id") REFERENCES "public"."private_households"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_assignments" ADD CONSTRAINT "support_assignments_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_assignments" ADD CONSTRAINT "support_assignments_assigned_by_user_id_users_id_fk" FOREIGN KEY ("assigned_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_assignments" ADD CONSTRAINT "support_assignments_ended_by_user_id_users_id_fk" FOREIGN KEY ("ended_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "support_assignments_sponsor_profile_id_idx" ON "support_assignments" USING btree ("sponsor_profile_id");--> statement-breakpoint
CREATE INDEX "support_assignments_private_household_id_idx" ON "support_assignments" USING btree ("private_household_id");--> statement-breakpoint
CREATE INDEX "support_assignments_child_id_idx" ON "support_assignments" USING btree ("child_id");--> statement-breakpoint
CREATE INDEX "support_assignments_status_idx" ON "support_assignments" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "support_assignments_active_household_unique" ON "support_assignments" USING btree ("sponsor_profile_id","private_household_id") WHERE "support_assignments"."status" = 'active' AND "support_assignments"."child_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "support_assignments_active_child_unique" ON "support_assignments" USING btree ("sponsor_profile_id","private_household_id","child_id") WHERE "support_assignments"."status" = 'active' AND "support_assignments"."child_id" IS NOT NULL;