ALTER TABLE "platform_settings" ADD COLUMN "sidebar_logo_expanded_path" text;--> statement-breakpoint
ALTER TABLE "platform_settings" ADD COLUMN "sidebar_logo_collapsed_path" text;--> statement-breakpoint
ALTER TABLE "platform_settings" ADD COLUMN "auth_logo_path" text;--> statement-breakpoint
ALTER TABLE "platform_settings" ADD COLUMN "auth_hero_image_path" text;--> statement-breakpoint
ALTER TABLE "platform_settings" ADD COLUMN "branding_revision" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "platform_settings" ADD CONSTRAINT "platform_settings_positive_branding_revision_check" CHECK ("platform_settings"."branding_revision" > 0);