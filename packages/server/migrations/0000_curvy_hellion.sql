CREATE TYPE "public"."tokenStatus" AS ENUM('active', 'revoked', 'expired');--> statement-breakpoint
CREATE TYPE "public"."tokenType" AS ENUM('access', 'refresh');--> statement-breakpoint
CREATE TYPE "public"."userStatus" AS ENUM('active', 'inactive', 'pending');--> statement-breakpoint
CREATE TYPE "public"."document_classification" AS ENUM('identity', 'verification');--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"name" text NOT NULL,
	"description" text,
	"resource" text NOT NULL,
	"action" text NOT NULL,
	CONSTRAINT "permissions_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role_id" text NOT NULL,
	"permission_id" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "role_permissions_role_id_permission_id_pk" PRIMARY KEY("role_id","permission_id")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"name" text NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"token_family" text NOT NULL,
	"previous_hash" text,
	"previous_valid_until" timestamp,
	"previous_used_at" timestamp,
	"type" "tokenType" DEFAULT 'refresh',
	"status" "tokenStatus" DEFAULT 'active',
	"expires_at" timestamp NOT NULL,
	CONSTRAINT "tokens_token_family_unique" UNIQUE("token_family")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"name" text,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false,
	"phone" text,
	"phone_verified" boolean DEFAULT false,
	"password" text NOT NULL,
	"image" text DEFAULT 'noavatar.png',
	"status" "userStatus" DEFAULT 'pending',
	"role_id" text,
	"last_login" timestamp,
	"failed_login_attempts" integer DEFAULT 0,
	"lockout_until" timestamp,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "document_objects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"private_household_id" uuid NOT NULL,
	"classification" "document_classification" NOT NULL,
	"storage_path" text NOT NULL,
	"media_type" varchar(160) NOT NULL,
	"byte_size" bigint NOT NULL,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "document_objects_storage_path_unique" UNIQUE("storage_path")
);
--> statement-breakpoint
CREATE TABLE "private_households" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guardian_legal_name" text NOT NULL,
	"exact_address" text NOT NULL,
	"phone" varchar(40),
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tokens" ADD CONSTRAINT "tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_objects" ADD CONSTRAINT "document_objects_private_household_id_private_households_id_fk" FOREIGN KEY ("private_household_id") REFERENCES "public"."private_households"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_objects" ADD CONSTRAINT "document_objects_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "private_households" ADD CONSTRAINT "private_households_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tokens_user_id_idx" ON "tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tokens_expires_at_idx" ON "tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "users_role_id_idx" ON "users" USING btree ("role_id");