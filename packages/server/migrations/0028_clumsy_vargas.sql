ALTER TABLE "orders" ADD COLUMN "purchasing_staff_profile_id" uuid;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "purchasing_staff_name_snapshot" varchar(120);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "purchasing_assigned_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_purchasing_staff_profile_id_staff_profiles_id_fk" FOREIGN KEY ("purchasing_staff_profile_id") REFERENCES "public"."staff_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "orders_purchasing_staff_idx" ON "orders" USING btree ("purchasing_staff_profile_id");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_purchasing_assignment_complete_check" CHECK ((
        ("orders"."purchasing_staff_profile_id" IS NULL AND "orders"."purchasing_staff_name_snapshot" IS NULL AND "orders"."purchasing_assigned_at" IS NULL)
        OR
        ("orders"."purchasing_staff_profile_id" IS NOT NULL AND "orders"."purchasing_staff_name_snapshot" IS NOT NULL AND "orders"."purchasing_assigned_at" IS NOT NULL)
      ));