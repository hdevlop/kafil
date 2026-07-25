CREATE TYPE "public"."family_housing_situation" AS ENUM('owned', 'rented', 'hosted', 'temporary', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."family_support_priority" AS ENUM('normal', 'high', 'urgent');--> statement-breakpoint
ALTER TABLE "family_profiles" ADD COLUMN "housing_situation" "family_housing_situation";--> statement-breakpoint
ALTER TABLE "family_profiles" ADD COLUMN "registration_date" date;--> statement-breakpoint
ALTER TABLE "family_profiles" ADD COLUMN "support_priority" "family_support_priority";--> statement-breakpoint
UPDATE "family_profiles"
SET "housing_situation" = 'unknown',
    "registration_date" = ("created_at" AT TIME ZONE 'Africa/Casablanca')::date,
    "support_priority" = 'normal'
WHERE "housing_situation" IS NULL
   OR "registration_date" IS NULL
   OR "support_priority" IS NULL;--> statement-breakpoint
ALTER TABLE "family_profiles" ALTER COLUMN "housing_situation" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "family_profiles" ALTER COLUMN "registration_date" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "family_profiles" ALTER COLUMN "support_priority" SET DEFAULT 'normal';--> statement-breakpoint
ALTER TABLE "family_profiles" ALTER COLUMN "support_priority" SET NOT NULL;
