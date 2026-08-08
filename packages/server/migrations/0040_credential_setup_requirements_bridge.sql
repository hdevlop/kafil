CREATE TABLE "credential_setup_requirements" (
	"user_id" text NOT NULL,
	"purpose" text NOT NULL,
	"temporary_credential_kind" text,
	"required" boolean DEFAULT true NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "credential_setup_requirements_user_id_purpose_pk" PRIMARY KEY("user_id","purpose")
);
--> statement-breakpoint
ALTER TABLE "credential_setup_requirements" ADD CONSTRAINT "credential_setup_requirements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- AUTH-COOKIE-PLAN.md Move 3: additive bridge between the Kafil access module's
-- family_password_requirements and Najm's credential_setup_requirements.
-- The old flow stays authoritative for this deployment; Move 5 removes the
-- triggers and Move 6 drops the legacy table.
--
-- Najm stores these timestamps without a time zone; Kafil's legacy table uses
-- timestamptz. `AT TIME ZONE 'UTC'` converts in whichever direction the input
-- type selects, so a mirrored instant never depends on the session TimeZone.
INSERT INTO "credential_setup_requirements" (
	"user_id", "purpose", "temporary_credential_kind",
	"required", "completed_at", "created_at", "updated_at"
)
SELECT
	"user_id", 'password', 'ma-cin',
	"required",
	"completed_at" AT TIME ZONE 'UTC',
	"created_at" AT TIME ZONE 'UTC',
	"updated_at" AT TIME ZONE 'UTC'
FROM "family_password_requirements"
ON CONFLICT ("user_id", "purpose") DO UPDATE SET
	"temporary_credential_kind" = 'ma-cin',
	"required" = EXCLUDED."required",
	"completed_at" = EXCLUDED."completed_at",
	"updated_at" = EXCLUDED."updated_at";--> statement-breakpoint
-- Both directions share one transaction-local guard, so a mirrored write never
-- re-enters the opposite trigger. `set_config(..., true)` is scoped to the
-- transaction and is cleared again before returning, which keeps several
-- independent statements in one transaction each mirroring exactly once.
CREATE OR REPLACE FUNCTION "kafil_sync_family_password_to_credential_setup"()
RETURNS trigger AS $$
BEGIN
	IF current_setting('kafil.bridge_sync', true) = 'on' THEN
		RETURN NULL;
	END IF;

	PERFORM set_config('kafil.bridge_sync', 'on', true);

	IF TG_OP = 'DELETE' THEN
		DELETE FROM "credential_setup_requirements"
		WHERE "user_id" = OLD."user_id" AND "purpose" = 'password';
	ELSE
		INSERT INTO "credential_setup_requirements" (
			"user_id", "purpose", "temporary_credential_kind",
			"required", "completed_at", "created_at", "updated_at"
		)
		VALUES (
			NEW."user_id", 'password', 'ma-cin',
			NEW."required",
			NEW."completed_at" AT TIME ZONE 'UTC',
			NEW."created_at" AT TIME ZONE 'UTC',
			NEW."updated_at" AT TIME ZONE 'UTC'
		)
		ON CONFLICT ("user_id", "purpose") DO UPDATE SET
			"temporary_credential_kind" = 'ma-cin',
			"required" = EXCLUDED."required",
			"completed_at" = EXCLUDED."completed_at",
			"updated_at" = EXCLUDED."updated_at";
	END IF;

	PERFORM set_config('kafil.bridge_sync', 'off', true);
	RETURN NULL;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
-- Purposes other than `password` are Najm's alone and have no legacy counterpart.
CREATE OR REPLACE FUNCTION "kafil_sync_credential_setup_to_family_password"()
RETURNS trigger AS $$
BEGIN
	IF current_setting('kafil.bridge_sync', true) = 'on' THEN
		RETURN NULL;
	END IF;

	IF TG_OP = 'DELETE' THEN
		IF OLD."purpose" <> 'password' THEN
			RETURN NULL;
		END IF;

		PERFORM set_config('kafil.bridge_sync', 'on', true);
		DELETE FROM "family_password_requirements" WHERE "user_id" = OLD."user_id";
	ELSE
		IF NEW."purpose" <> 'password' THEN
			RETURN NULL;
		END IF;

		PERFORM set_config('kafil.bridge_sync', 'on', true);
		INSERT INTO "family_password_requirements" (
			"user_id", "required", "completed_at", "created_at", "updated_at"
		)
		VALUES (
			NEW."user_id",
			NEW."required",
			NEW."completed_at" AT TIME ZONE 'UTC',
			COALESCE(NEW."created_at" AT TIME ZONE 'UTC', now()),
			COALESCE(NEW."updated_at" AT TIME ZONE 'UTC', now())
		)
		ON CONFLICT ("user_id") DO UPDATE SET
			"required" = EXCLUDED."required",
			"completed_at" = EXCLUDED."completed_at",
			"updated_at" = EXCLUDED."updated_at";
	END IF;

	PERFORM set_config('kafil.bridge_sync', 'off', true);
	RETURN NULL;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
DROP TRIGGER IF EXISTS "kafil_family_password_bridge" ON "family_password_requirements";--> statement-breakpoint
CREATE TRIGGER "kafil_family_password_bridge"
AFTER INSERT OR UPDATE OR DELETE ON "family_password_requirements"
FOR EACH ROW EXECUTE FUNCTION "kafil_sync_family_password_to_credential_setup"();--> statement-breakpoint
DROP TRIGGER IF EXISTS "kafil_credential_setup_bridge" ON "credential_setup_requirements";--> statement-breakpoint
CREATE TRIGGER "kafil_credential_setup_bridge"
AFTER INSERT OR UPDATE OR DELETE ON "credential_setup_requirements"
FOR EACH ROW EXECUTE FUNCTION "kafil_sync_credential_setup_to_family_password"();
