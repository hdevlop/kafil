CREATE TYPE "public"."child_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('M', 'F');--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" text,
	"action" varchar(120) NOT NULL,
	"resource" varchar(120) NOT NULL,
	"resource_id" text NOT NULL,
	"metadata" jsonb NOT NULL,
	"request_id" varchar(120),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "children" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"private_household_id" uuid NOT NULL,
	"legal_name" text NOT NULL,
	"date_of_birth" date NOT NULL,
	"gender" "gender" NOT NULL,
	"school_level" varchar(120),
	"clothing_size" varchar(40),
	"shoe_size" varchar(40),
	"notes" text,
	"status" "child_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "family_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"private_household_id" uuid NOT NULL,
	"relationship_to_children" varchar(120),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "family_profiles_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "family_profiles_private_household_id_unique" UNIQUE("private_household_id")
);
--> statement-breakpoint
ALTER TABLE "operator_profiles" ADD COLUMN "cin" varchar(20);--> statement-breakpoint
ALTER TABLE "operator_profiles" ADD COLUMN "gender" "gender";--> statement-breakpoint
ALTER TABLE "operator_profiles" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "operator_profiles" ADD COLUMN "date_of_birth" date;--> statement-breakpoint
ALTER TABLE "sponsor_profiles" ADD COLUMN "cin" varchar(20);--> statement-breakpoint
ALTER TABLE "sponsor_profiles" ADD COLUMN "gender" "gender";--> statement-breakpoint
ALTER TABLE "sponsor_profiles" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "sponsor_profiles" ADD COLUMN "date_of_birth" date;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "children" ADD CONSTRAINT "children_private_household_id_private_households_id_fk" FOREIGN KEY ("private_household_id") REFERENCES "public"."private_households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_profiles" ADD CONSTRAINT "family_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_profiles" ADD CONSTRAINT "family_profiles_private_household_id_private_households_id_fk" FOREIGN KEY ("private_household_id") REFERENCES "public"."private_households"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_events_actor_user_id_idx" ON "audit_events" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "audit_events_resource_resource_id_idx" ON "audit_events" USING btree ("resource","resource_id");--> statement-breakpoint
CREATE INDEX "children_private_household_id_idx" ON "children" USING btree ("private_household_id");--> statement-breakpoint
CREATE INDEX "children_private_household_status_idx" ON "children" USING btree ("private_household_id","status");--> statement-breakpoint
ALTER TABLE "operator_profiles" ADD CONSTRAINT "operator_profiles_cin_unique" UNIQUE("cin");--> statement-breakpoint
ALTER TABLE "sponsor_profiles" ADD CONSTRAINT "sponsor_profiles_cin_unique" UNIQUE("cin");