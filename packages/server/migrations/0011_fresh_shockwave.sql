ALTER TABLE "family_profiles" ADD COLUMN "funding_target_minor" bigint;--> statement-breakpoint
UPDATE "family_profiles" AS "family"
SET "funding_target_minor" = "setting"."family_funding_target_minor"
FROM "platform_settings" AS "setting"
WHERE "setting"."id" = 'platform';--> statement-breakpoint
ALTER TABLE "family_profiles" ALTER COLUMN "funding_target_minor" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "family_profiles" ADD CONSTRAINT "family_profiles_positive_funding_target_check" CHECK ("family_profiles"."funding_target_minor" > 0);
