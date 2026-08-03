CREATE TYPE "public"."applicant_status" AS ENUM('pending_email_verification', 'pending_review', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "applicant_email_otp_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"applicant_id" uuid NOT NULL,
	"auth_user_id" text NOT NULL,
	"code_hash" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"resend_available_at" timestamp with time zone NOT NULL,
	"attempts_remaining" integer DEFAULT 5 NOT NULL,
	"email_sent" boolean DEFAULT false NOT NULL,
	"locale" varchar(2) DEFAULT 'en' NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "applicant_email_otp_challenges_attempts_check" CHECK ("applicant_email_otp_challenges"."attempts_remaining" >= 0)
);
--> statement-breakpoint
CREATE TABLE "applicants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" text NOT NULL,
	"name" varchar(120) NOT NULL,
	"email" varchar(254) NOT NULL,
	"phone" varchar(40) NOT NULL,
	"cin" varchar(20) NOT NULL,
	"gender" varchar(1) NOT NULL,
	"address" text NOT NULL,
	"date_of_birth" date NOT NULL,
	"status" "applicant_status" DEFAULT 'pending_email_verification' NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"reviewed_by_user_id" text,
	"rejection_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "applicants_auth_user_id_unique" UNIQUE("auth_user_id"),
	CONSTRAINT "applicants_gender_check" CHECK ("applicants"."gender" IN ('M', 'F')),
	CONSTRAINT "applicants_reviewer_consistency_check" CHECK (("applicants"."status" IN ('approved', 'rejected')) = ("applicants"."reviewed_by_user_id" IS NOT NULL AND "applicants"."reviewed_at" IS NOT NULL)),
	CONSTRAINT "applicants_rejection_reason_only_when_rejected" CHECK ("applicants"."rejection_reason" IS NULL OR "applicants"."status" = 'rejected')
);
--> statement-breakpoint
ALTER TABLE "applicant_email_otp_challenges" ADD CONSTRAINT "applicant_email_otp_challenges_applicant_id_applicants_id_fk" FOREIGN KEY ("applicant_id") REFERENCES "public"."applicants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applicant_email_otp_challenges" ADD CONSTRAINT "applicant_email_otp_challenges_auth_user_id_users_id_fk" FOREIGN KEY ("auth_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applicants" ADD CONSTRAINT "applicants_auth_user_id_users_id_fk" FOREIGN KEY ("auth_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applicants" ADD CONSTRAINT "applicants_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "applicant_email_otp_challenges_applicant_unique" ON "applicant_email_otp_challenges" USING btree ("applicant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "applicant_email_otp_challenges_user_unique" ON "applicant_email_otp_challenges" USING btree ("auth_user_id");--> statement-breakpoint
CREATE INDEX "applicant_email_otp_challenges_expires_idx" ON "applicant_email_otp_challenges" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "applicants_email_unique" ON "applicants" USING btree (lower("email"));--> statement-breakpoint
CREATE UNIQUE INDEX "applicants_cin_unique" ON "applicants" USING btree (upper("cin"));--> statement-breakpoint
CREATE UNIQUE INDEX "applicants_phone_unique" ON "applicants" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "applicants_status_idx" ON "applicants" USING btree ("status");