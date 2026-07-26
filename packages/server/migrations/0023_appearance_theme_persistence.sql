ALTER TABLE "platform_settings" ADD COLUMN "design_config" jsonb;--> statement-breakpoint
ALTER TABLE "platform_settings" ADD COLUMN "appearance_revision" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "platform_settings" ADD CONSTRAINT "platform_settings_positive_appearance_revision_check" CHECK ("platform_settings"."appearance_revision" > 0);