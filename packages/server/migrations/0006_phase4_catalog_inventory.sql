CREATE TYPE "public"."category_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."inventory_ledger_entry_type" AS ENUM('restock', 'adjustment', 'order_reserve', 'order_release', 'order_allocate', 'order_return');--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(160) NOT NULL,
	"slug" varchar(160) NOT NULL,
	"description" text,
	"status" "category_status" DEFAULT 'active' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_balances" (
	"product_id" uuid PRIMARY KEY NOT NULL,
	"on_hand_quantity" integer DEFAULT 0 NOT NULL,
	"reserved_quantity" integer DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_balances_quantity_check" CHECK ("inventory_balances"."on_hand_quantity" >= 0 AND "inventory_balances"."reserved_quantity" >= 0 AND "inventory_balances"."reserved_quantity" <= "inventory_balances"."on_hand_quantity")
);
--> statement-breakpoint
CREATE TABLE "inventory_ledger_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"entry_type" "inventory_ledger_entry_type" NOT NULL,
	"quantity" integer NOT NULL,
	"on_hand_after" integer NOT NULL,
	"reserved_after" integer NOT NULL,
	"source_type" varchar(80) NOT NULL,
	"source_id" text NOT NULL,
	"idempotency_key" varchar(160) NOT NULL,
	"actor_user_id" text,
	"reason" text,
	"reverses_entry_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_ledger_entries_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "inventory_ledger_entries_non_zero_quantity_check" CHECK ("inventory_ledger_entries"."quantity" <> 0),
	CONSTRAINT "inventory_ledger_entries_balance_check" CHECK ("inventory_ledger_entries"."on_hand_after" >= 0 AND "inventory_ledger_entries"."reserved_after" >= 0 AND "inventory_ledger_entries"."reserved_after" <= "inventory_ledger_entries"."on_hand_after")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"sku" varchar(80) NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"price_minor" bigint NOT NULL,
	"currency" varchar(3) DEFAULT 'MAD' NOT NULL,
	"image_url" varchar(2000),
	"status" "product_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_currency_check" CHECK ("products"."currency" = 'MAD'),
	CONSTRAINT "products_positive_price_check" CHECK ("products"."price_minor" > 0)
);
--> statement-breakpoint
ALTER TABLE "inventory_balances" ADD CONSTRAINT "inventory_balances_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_ledger_entries" ADD CONSTRAINT "inventory_ledger_entries_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_ledger_entries" ADD CONSTRAINT "inventory_ledger_entries_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_ledger_entries" ADD CONSTRAINT "inventory_ledger_entries_reverses_entry_id_inventory_ledger_entries_id_fk" FOREIGN KEY ("reverses_entry_id") REFERENCES "public"."inventory_ledger_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "categories_slug_unique" ON "categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "categories_status_sort_order_idx" ON "categories" USING btree ("status","sort_order");--> statement-breakpoint
CREATE INDEX "inventory_ledger_entries_product_created_at_idx" ON "inventory_ledger_entries" USING btree ("product_id","created_at");--> statement-breakpoint
CREATE INDEX "inventory_ledger_entries_source_idx" ON "inventory_ledger_entries" USING btree ("source_type","source_id");--> statement-breakpoint
CREATE UNIQUE INDEX "products_sku_unique" ON "products" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "products_category_status_idx" ON "products" USING btree ("category_id","status");--> statement-breakpoint
CREATE INDEX "products_status_name_idx" ON "products" USING btree ("status","name");