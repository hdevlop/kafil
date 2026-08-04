CREATE OR REPLACE FUNCTION "kafil_require_active_oauth_user"()
RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "users"
    WHERE "users"."id" = NEW."user_id"
      AND "users"."status" = 'active'
  ) THEN
    RAISE EXCEPTION 'OAuth accounts may only link to active users'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER "oauth_accounts_require_active_user"
BEFORE INSERT OR UPDATE OF "user_id" ON "oauth_accounts"
FOR EACH ROW
EXECUTE FUNCTION "kafil_require_active_oauth_user"();
