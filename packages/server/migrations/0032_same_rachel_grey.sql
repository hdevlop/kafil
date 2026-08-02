CREATE TABLE "sponsor_email_otp_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"code_hash" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"resend_available_at" timestamp with time zone NOT NULL,
	"attempts_remaining" integer DEFAULT 5 NOT NULL,
	"remember_me" boolean DEFAULT false NOT NULL,
	"email_sent" boolean DEFAULT false NOT NULL,
	"locale" varchar(2) DEFAULT 'en' NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sponsor_email_otp_challenges_attempts_check" CHECK ("sponsor_email_otp_challenges"."attempts_remaining" >= 0)
);
--> statement-breakpoint
ALTER TABLE "sponsor_email_otp_challenges" ADD CONSTRAINT "sponsor_email_otp_challenges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "sponsor_email_otp_challenges_user_unique" ON "sponsor_email_otp_challenges" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sponsor_email_otp_challenges_expires_idx" ON "sponsor_email_otp_challenges" USING btree ("expires_at");