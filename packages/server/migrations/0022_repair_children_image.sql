-- Migration 0021 is already deployed in some environments whose children.image
-- column was removed or never persisted. Repair those databases idempotently.
ALTER TABLE "children" ADD COLUMN IF NOT EXISTS "image" text;
