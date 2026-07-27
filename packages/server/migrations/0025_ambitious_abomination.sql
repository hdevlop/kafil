CREATE TYPE "public"."delivery_confirmation_method" AS ENUM('operator_confirmation', 'recipient_signature', 'photo');--> statement-breakpoint
CREATE TYPE "public"."order_assistance_channel" AS ENUM('phone', 'in_person', 'home_visit', 'other');--> statement-breakpoint
CREATE TYPE "public"."order_placement_source" AS ENUM('family_self_service', 'operator_assisted');--> statement-breakpoint
ALTER TYPE "public"."order_status" ADD VALUE 'purchased' BEFORE 'delivered';--> statement-breakpoint
ALTER TYPE "public"."order_status" ADD VALUE 'out_for_delivery' BEFORE 'delivered';--> statement-breakpoint
CREATE TABLE "order_purchase_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"merchant_name" varchar(200) NOT NULL,
	"receipt_number" varchar(120),
	"purchased_at" timestamp with time zone NOT NULL,
	"actual_total_minor" bigint NOT NULL,
	"currency" varchar(3) DEFAULT 'MAD' NOT NULL,
	"receipt_storage_path" text NOT NULL,
	"receipt_media_type" varchar(100) NOT NULL,
	"receipt_byte_size" integer NOT NULL,
	"recorded_by_user_id" text NOT NULL,
	"idempotency_key" varchar(160) NOT NULL,
	"replaces_purchase_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_purchase_records_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "order_purchase_records_positive_total_check" CHECK ("order_purchase_records"."actual_total_minor" > 0),
	CONSTRAINT "order_purchase_records_currency_check" CHECK ("order_purchase_records"."currency" = 'MAD'),
	CONSTRAINT "order_purchase_records_positive_receipt_size_check" CHECK ("order_purchase_records"."receipt_byte_size" > 0)
);
--> statement-breakpoint
CREATE TABLE "order_purchase_reversals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purchase_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"reversed_by_user_id" text NOT NULL,
	"idempotency_key" varchar(160) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_purchase_reversals_purchase_id_unique" UNIQUE("purchase_id"),
	CONSTRAINT "order_purchase_reversals_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "placement_source" "order_placement_source" DEFAULT 'family_self_service' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "assistance_channel" "order_assistance_channel";--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "assistance_note" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_started_by_user_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivered_by_user_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_confirmation_method" "delivery_confirmation_method";--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_note" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_proof_storage_path" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_proof_media_type" varchar(100);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_proof_byte_size" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_confirmation_idempotency_key" varchar(160);--> statement-breakpoint
ALTER TABLE "order_purchase_records" ADD CONSTRAINT "order_purchase_records_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_purchase_records" ADD CONSTRAINT "order_purchase_records_recorded_by_user_id_users_id_fk" FOREIGN KEY ("recorded_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_purchase_records" ADD CONSTRAINT "order_purchase_records_replaces_purchase_id_order_purchase_records_id_fk" FOREIGN KEY ("replaces_purchase_id") REFERENCES "public"."order_purchase_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_purchase_reversals" ADD CONSTRAINT "order_purchase_reversals_purchase_id_order_purchase_records_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."order_purchase_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_purchase_reversals" ADD CONSTRAINT "order_purchase_reversals_reversed_by_user_id_users_id_fk" FOREIGN KEY ("reversed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "order_purchase_records_receipt_path_unique" ON "order_purchase_records" USING btree ("receipt_storage_path");--> statement-breakpoint
CREATE INDEX "order_purchase_records_order_created_at_idx" ON "order_purchase_records" USING btree ("order_id","created_at");--> statement-breakpoint
CREATE INDEX "order_purchase_records_purchased_at_idx" ON "order_purchase_records" USING btree ("purchased_at");--> statement-breakpoint
CREATE INDEX "order_purchase_reversals_created_at_idx" ON "order_purchase_reversals" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_delivery_started_by_user_id_users_id_fk" FOREIGN KEY ("delivery_started_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_delivered_by_user_id_users_id_fk" FOREIGN KEY ("delivered_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_delivery_confirmation_idempotency_key_unique" UNIQUE("delivery_confirmation_idempotency_key");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_assistance_context_check" CHECK ((
        ("orders"."placement_source" = 'family_self_service' AND "orders"."assistance_channel" IS NULL AND "orders"."assistance_note" IS NULL)
        OR
        ("orders"."placement_source" = 'operator_assisted' AND "orders"."assistance_channel" IS NOT NULL)
      ));--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_delivery_proof_complete_check" CHECK ((
        ("orders"."delivery_proof_storage_path" IS NULL AND "orders"."delivery_proof_media_type" IS NULL AND "orders"."delivery_proof_byte_size" IS NULL)
        OR
        ("orders"."delivery_proof_storage_path" IS NOT NULL AND "orders"."delivery_proof_media_type" IS NOT NULL AND "orders"."delivery_proof_byte_size" > 0)
      ));