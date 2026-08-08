-- AUTH-COOKIE-PLAN.md Move 5: remove the synchronization bridge.
--
-- Only safe once Move 4 is accepted and its rollback window has closed. After
-- this, a write to credential_setup_requirements is no longer mirrored, so the
-- pre-Move-4 application can no longer see requirements the new one creates.
--
-- family_password_requirements is deliberately left in place for one more
-- release, and no application code reads it. Move 6 drops it.
DROP TRIGGER IF EXISTS "kafil_family_password_bridge" ON "family_password_requirements";--> statement-breakpoint
DROP TRIGGER IF EXISTS "kafil_credential_setup_bridge" ON "credential_setup_requirements";--> statement-breakpoint
DROP FUNCTION IF EXISTS "kafil_sync_family_password_to_credential_setup"();--> statement-breakpoint
DROP FUNCTION IF EXISTS "kafil_sync_credential_setup_to_family_password"();
