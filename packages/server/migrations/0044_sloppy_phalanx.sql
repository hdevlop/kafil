ALTER TABLE "budget_accounts" ADD COLUMN "max_orders_per_month" integer;--> statement-breakpoint
ALTER TABLE "budget_accounts" ADD COLUMN "max_budget_per_order_minor" bigint;--> statement-breakpoint
ALTER TABLE "platform_settings" ADD COLUMN "default_max_orders_per_month" integer;--> statement-breakpoint
ALTER TABLE "platform_settings" ADD COLUMN "default_max_budget_per_order_minor" bigint;--> statement-breakpoint
ALTER TABLE "platform_settings" ADD COLUMN "default_monthly_budget_minor" bigint;--> statement-breakpoint
ALTER TABLE "budget_accounts" ADD CONSTRAINT "budget_accounts_max_orders_check" CHECK ("budget_accounts"."max_orders_per_month" IS NULL OR "budget_accounts"."max_orders_per_month" BETWEEN 1 AND 31);--> statement-breakpoint
ALTER TABLE "budget_accounts" ADD CONSTRAINT "budget_accounts_max_per_order_check" CHECK ("budget_accounts"."max_budget_per_order_minor" IS NULL OR "budget_accounts"."max_budget_per_order_minor" BETWEEN 1 AND 9007199254740991);--> statement-breakpoint
ALTER TABLE "platform_settings" ADD CONSTRAINT "platform_settings_default_max_orders_check" CHECK ("platform_settings"."default_max_orders_per_month" IS NULL OR "platform_settings"."default_max_orders_per_month" BETWEEN 1 AND 31);--> statement-breakpoint
ALTER TABLE "platform_settings" ADD CONSTRAINT "platform_settings_default_max_per_order_check" CHECK ("platform_settings"."default_max_budget_per_order_minor" IS NULL OR "platform_settings"."default_max_budget_per_order_minor" BETWEEN 1 AND 9007199254740991);--> statement-breakpoint
ALTER TABLE "platform_settings" ADD CONSTRAINT "platform_settings_default_monthly_budget_check" CHECK ("platform_settings"."default_monthly_budget_minor" IS NULL OR "platform_settings"."default_monthly_budget_minor" BETWEEN 1 AND 9007199254740991);