CREATE TABLE "operator_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"phone" varchar(40),
	"job_title" varchar(120),
	"preferred_language" varchar(12) DEFAULT 'en' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "operator_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "sponsor_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"phone" varchar(40),
	"country_code" varchar(2),
	"preferred_language" varchar(12) DEFAULT 'en' NOT NULL,
	"preferred_currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"communication_opt_in" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sponsor_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "document_objects" DROP CONSTRAINT "document_objects_private_household_id_private_households_id_fk";
--> statement-breakpoint
ALTER TABLE "document_objects" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "operator_profiles" ADD CONSTRAINT "operator_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsor_profiles" ADD CONSTRAINT "sponsor_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_objects" ADD CONSTRAINT "document_objects_private_household_id_private_households_id_fk" FOREIGN KEY ("private_household_id") REFERENCES "public"."private_households"("id") ON DELETE cascade ON UPDATE no action;