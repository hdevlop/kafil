CREATE TABLE "family_password_requirements" (
	"user_id" text PRIMARY KEY NOT NULL,
	"required" boolean DEFAULT true NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "family_password_requirements" ADD CONSTRAINT "family_password_requirements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
