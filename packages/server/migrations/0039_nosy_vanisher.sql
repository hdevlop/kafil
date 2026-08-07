CREATE TABLE "theme_presets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(96) NOT NULL,
	"name" varchar(80) NOT NULL,
	"design_config" jsonb NOT NULL,
	"is_built_in" boolean DEFAULT false NOT NULL,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "theme_presets_slug_unique" UNIQUE("slug"),
	CONSTRAINT "theme_presets_name_not_blank_check" CHECK (length(btrim("theme_presets"."name")) > 0),
	CONSTRAINT "theme_presets_slug_not_blank_check" CHECK (length(btrim("theme_presets"."slug")) > 0)
);
--> statement-breakpoint
ALTER TABLE "theme_presets" ADD CONSTRAINT "theme_presets_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;