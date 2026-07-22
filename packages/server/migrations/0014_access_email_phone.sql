CREATE TABLE "email_verification_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_verification_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "family_profiles" ADD COLUMN "guardian_date_of_birth" date;--> statement-breakpoint
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_verification_tokens_user_idx" ON "email_verification_tokens" USING btree ("user_id");--> statement-breakpoint
WITH "profile_phones" AS (
	SELECT "user_id", CASE
		WHEN regexp_replace("phone", '[\s().-]+', '', 'g') ~ '^0[0-9]{9}$'
			THEN '+212' || substring(regexp_replace("phone", '[\s().-]+', '', 'g') from 2)
		WHEN regexp_replace("phone", '[\s().-]+', '', 'g') ~ '^212[0-9]{9}$'
			THEN '+' || regexp_replace("phone", '[\s().-]+', '', 'g')
		ELSE regexp_replace("phone", '[\s().-]+', '', 'g')
	END AS "phone"
	FROM "family_profiles" WHERE "phone" IS NOT NULL
	UNION ALL
	SELECT "user_id", CASE
		WHEN regexp_replace("phone", '[\s().-]+', '', 'g') ~ '^0[0-9]{9}$'
			THEN '+212' || substring(regexp_replace("phone", '[\s().-]+', '', 'g') from 2)
		WHEN regexp_replace("phone", '[\s().-]+', '', 'g') ~ '^212[0-9]{9}$'
			THEN '+' || regexp_replace("phone", '[\s().-]+', '', 'g')
		ELSE regexp_replace("phone", '[\s().-]+', '', 'g')
	END AS "phone"
	FROM "sponsor_profiles" WHERE "phone" IS NOT NULL
	UNION ALL
	SELECT "user_id", CASE
		WHEN regexp_replace("phone", '[\s().-]+', '', 'g') ~ '^0[0-9]{9}$'
			THEN '+212' || substring(regexp_replace("phone", '[\s().-]+', '', 'g') from 2)
		WHEN regexp_replace("phone", '[\s().-]+', '', 'g') ~ '^212[0-9]{9}$'
			THEN '+' || regexp_replace("phone", '[\s().-]+', '', 'g')
		ELSE regexp_replace("phone", '[\s().-]+', '', 'g')
	END AS "phone"
	FROM "operator_profiles" WHERE "phone" IS NOT NULL
), "unambiguous_phones" AS (
	SELECT min("user_id") AS "user_id", "phone"
	FROM "profile_phones"
	WHERE "phone" ~ '^\+[1-9][0-9]{7,14}$'
	GROUP BY "phone"
	HAVING count(DISTINCT "user_id") = 1
)
UPDATE "users" AS "u"
SET "phone" = "candidate"."phone", "updated_at" = now()
FROM "unambiguous_phones" AS "candidate"
WHERE "u"."id" = "candidate"."user_id"
	AND "u"."phone" IS NULL
	AND NOT EXISTS (
		SELECT 1 FROM "users" AS "existing"
		WHERE "existing"."phone" = "candidate"."phone"
	);
