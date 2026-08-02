CREATE TABLE "credential_setup_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"user_id" text NOT NULL,
	"purpose" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"consumed_at" timestamp,
	"revoked_at" timestamp,
	CONSTRAINT "credential_setup_sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "credential_setup_sessions" ADD CONSTRAINT "credential_setup_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "credential_setup_sessions_user_purpose_idx" ON "credential_setup_sessions" USING btree ("user_id","purpose");--> statement-breakpoint
CREATE INDEX "credential_setup_sessions_expires_at_idx" ON "credential_setup_sessions" USING btree ("expires_at");