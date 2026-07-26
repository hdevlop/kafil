ALTER TABLE "children" ADD COLUMN "image" text;--> statement-breakpoint
ALTER TABLE "contributions" ADD COLUMN "expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "contributions" ADD COLUMN "expired_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "platform_settings" ADD COLUMN "pending_contribution_expiry_hours" integer DEFAULT 72 NOT NULL;--> statement-breakpoint
UPDATE "contributions"
SET "expires_at" = greatest(
  "submitted_at" + interval '72 hours',
  now() + interval '72 hours'
)
WHERE "status" = 'pending';--> statement-breakpoint
UPDATE "contributions"
SET "expires_at" = "submitted_at" + interval '72 hours'
WHERE "expires_at" IS NULL;--> statement-breakpoint
ALTER TABLE "contributions" ALTER COLUMN "expires_at" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "contributions_status_expires_at_idx" ON "contributions" USING btree ("status","expires_at");--> statement-breakpoint
CREATE INDEX "contributions_family_status_expires_at_idx" ON "contributions" USING btree ("family_profile_id","status","expires_at");--> statement-breakpoint
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_expired_state_check" CHECK (("contributions"."status" = 'expired' AND "contributions"."expired_at" IS NOT NULL) OR ("contributions"."status" <> 'expired' AND "contributions"."expired_at" IS NULL));--> statement-breakpoint
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_expired_no_validation_check" CHECK ("contributions"."status" <> 'expired' OR ("contributions"."validated_by_user_id" IS NULL AND "contributions"."validated_at" IS NULL));--> statement-breakpoint
ALTER TABLE "platform_settings" ADD CONSTRAINT "platform_settings_pending_expiry_hours_check" CHECK ("platform_settings"."pending_contribution_expiry_hours" BETWEEN 1 AND 720);