CREATE TYPE "public"."staff_affiliation" AS ENUM('internal', 'external');--> statement-breakpoint
CREATE TYPE "public"."staff_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TABLE "staff_functions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"staff_profile_id" uuid NOT NULL,
	"function_key" varchar(32) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"name" varchar(120) NOT NULL,
	"contact_email" varchar(254),
	"phone" varchar(40) NOT NULL,
	"image" text,
	"affiliation" "staff_affiliation" DEFAULT 'internal' NOT NULL,
	"company_name" varchar(160),
	"cin" varchar(20),
	"gender" "gender",
	"address" text,
	"date_of_birth" date,
	"job_title" varchar(120),
	"status" "staff_status" DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_profiles_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "staff_profiles_phone_unique" UNIQUE("phone"),
	CONSTRAINT "staff_profiles_cin_unique" UNIQUE("cin")
);
--> statement-breakpoint
ALTER TABLE "staff_functions" ADD CONSTRAINT "staff_functions_staff_profile_id_staff_profiles_id_fk" FOREIGN KEY ("staff_profile_id") REFERENCES "public"."staff_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "staff_functions_profile_function_unique" ON "staff_functions" USING btree ("staff_profile_id","function_key");--> statement-breakpoint
CREATE INDEX "staff_functions_function_key_idx" ON "staff_functions" USING btree ("function_key");--> statement-breakpoint
CREATE INDEX "staff_profiles_status_idx" ON "staff_profiles" USING btree ("status");--> statement-breakpoint
CREATE INDEX "staff_profiles_affiliation_idx" ON "staff_profiles" USING btree ("affiliation");--> statement-breakpoint
CREATE INDEX "staff_profiles_name_idx" ON "staff_profiles" USING btree ("name");--> statement-breakpoint
INSERT INTO "staff_profiles" (
  "id",
  "user_id",
  "name",
  "contact_email",
  "phone",
  "image",
  "affiliation",
  "company_name",
  "cin",
  "gender",
  "address",
  "date_of_birth",
  "job_title",
  "status",
  "notes",
  "created_at",
  "updated_at"
)
SELECT
  op."id",
  op."user_id",
  COALESCE(NULLIF(TRIM(u."name"), ''), 'Operator ' || op."id"::text),
  u."email",
  op."phone",
  u."image",
  'internal'::"staff_affiliation",
  NULL,
  op."cin",
  op."gender",
  op."address",
  op."date_of_birth",
  op."job_title",
  CASE WHEN u."status" = 'active' THEN 'active'::"staff_status" ELSE 'inactive'::"staff_status" END,
  op."notes",
  op."created_at",
  op."updated_at"
FROM "operator_profiles" op
INNER JOIN "users" u ON u."id" = op."user_id";--> statement-breakpoint
INSERT INTO "staff_functions" ("id", "staff_profile_id", "function_key", "created_at", "updated_at")
SELECT gen_random_uuid(), op."id", 'operator', op."created_at", op."updated_at"
FROM "operator_profiles" op
ON CONFLICT ("staff_profile_id", "function_key") DO NOTHING;