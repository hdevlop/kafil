DELETE FROM "credential_setup_sessions"
WHERE "purpose" = 'sponsor-email-otp';--> statement-breakpoint
DROP TABLE "sponsor_email_otp_challenges";
