CREATE TABLE "notification_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notification_id" uuid NOT NULL,
	"channel" varchar(20) NOT NULL,
	"target_key" varchar(160) NOT NULL,
	"push_subscription_id" uuid,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"leased_at" timestamp with time zone,
	"processed_at" timestamp with time zone,
	"last_error_code" varchar(120),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_deliveries_channel_check" CHECK ("notification_deliveries"."channel" IN ('email','push')),
	CONSTRAINT "notification_deliveries_status_check" CHECK ("notification_deliveries"."status" IN ('pending','processing','sent','failed','skipped','dead')),
	CONSTRAINT "notification_deliveries_attempts_check" CHECK ("notification_deliveries"."attempts" >= 0)
);
--> statement-breakpoint
CREATE TABLE "notification_settings" (
	"user_id" text PRIMARY KEY NOT NULL,
	"locale" varchar(2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_settings_locale_check" CHECK ("notification_settings"."locale" IN ('en','fr','ar','es'))
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_event_id" uuid NOT NULL,
	"recipient_user_id" text NOT NULL,
	"actor_user_id" text,
	"topic" varchar(120) NOT NULL,
	"aggregate_type" varchar(80) NOT NULL,
	"aggregate_id" text NOT NULL,
	"locale" varchar(2) NOT NULL,
	"payload" jsonb NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notifications_locale_check" CHECK ("notifications"."locale" IN ('en','fr','ar','es')),
	CONSTRAINT "notifications_read_at_check" CHECK ("notifications"."read_at" IS NULL OR "notifications"."read_at" >= "notifications"."created_at")
);
--> statement-breakpoint
CREATE TABLE "outbox_consumer_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"outbox_event_id" uuid NOT NULL,
	"consumer_key" varchar(80) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"leased_at" timestamp with time zone,
	"processed_at" timestamp with time zone,
	"last_error_code" varchar(120),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "outbox_consumer_jobs_status_check" CHECK ("outbox_consumer_jobs"."status" IN ('pending','processing','sent','failed','dead')),
	CONSTRAINT "outbox_consumer_jobs_attempts_check" CHECK ("outbox_consumer_jobs"."attempts" >= 0)
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"endpoint_hash" varchar(64) NOT NULL,
	"endpoint_ciphertext" text NOT NULL,
	"p256dh_ciphertext" text NOT NULL,
	"auth_ciphertext" text NOT NULL,
	"endpoint_fingerprint" varchar(16) NOT NULL,
	"user_agent_family" varchar(80),
	"last_success_at" timestamp with time zone,
	"last_failure_at" timestamp with time zone,
	"disabled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_endpoint_hash_unique" UNIQUE("endpoint_hash")
);
--> statement-breakpoint
ALTER TABLE "outbox_events" ADD COLUMN "actor_user_id" text;--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_notification_id_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_push_subscription_id_push_subscriptions_id_fk" FOREIGN KEY ("push_subscription_id") REFERENCES "public"."push_subscriptions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_source_event_id_outbox_events_id_fk" FOREIGN KEY ("source_event_id") REFERENCES "public"."outbox_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_user_id_users_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbox_consumer_jobs" ADD CONSTRAINT "outbox_consumer_jobs_outbox_event_id_outbox_events_id_fk" FOREIGN KEY ("outbox_event_id") REFERENCES "public"."outbox_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "notification_deliveries_notification_channel_target_unique" ON "notification_deliveries" USING btree ("notification_id","channel","target_key");--> statement-breakpoint
CREATE INDEX "notification_deliveries_status_available_at_idx" ON "notification_deliveries" USING btree ("status","available_at");--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_source_recipient_unique" ON "notifications" USING btree ("source_event_id","recipient_user_id");--> statement-breakpoint
CREATE INDEX "notifications_recipient_read_created_idx" ON "notifications" USING btree ("recipient_user_id","read_at","created_at","id");--> statement-breakpoint
CREATE INDEX "notifications_aggregate_idx" ON "notifications" USING btree ("aggregate_type","aggregate_id");--> statement-breakpoint
CREATE UNIQUE INDEX "outbox_consumer_jobs_event_consumer_unique" ON "outbox_consumer_jobs" USING btree ("outbox_event_id","consumer_key");--> statement-breakpoint
CREATE INDEX "outbox_consumer_jobs_status_available_at_idx" ON "outbox_consumer_jobs" USING btree ("status","available_at");--> statement-breakpoint
CREATE INDEX "push_subscriptions_user_disabled_idx" ON "push_subscriptions" USING btree ("user_id","disabled_at");--> statement-breakpoint
ALTER TABLE "outbox_events" ADD CONSTRAINT "outbox_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_aggregate_id_check" CHECK (char_length("notifications"."aggregate_id") >= 1 AND char_length("notifications"."aggregate_id") <= 500);--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_payload_size_check" CHECK (octet_length(("notifications"."payload")::text) <= 20000);--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_endpoint_ciphertext_check" CHECK (char_length("push_subscriptions"."endpoint_ciphertext") >= 1 AND char_length("push_subscriptions"."endpoint_ciphertext") <= 8000);--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_p256dh_ciphertext_check" CHECK (char_length("push_subscriptions"."p256dh_ciphertext") >= 1 AND char_length("push_subscriptions"."p256dh_ciphertext") <= 4000);--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_auth_ciphertext_check" CHECK (char_length("push_subscriptions"."auth_ciphertext") >= 1 AND char_length("push_subscriptions"."auth_ciphertext") <= 4000);