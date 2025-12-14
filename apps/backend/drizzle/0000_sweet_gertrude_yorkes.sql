CREATE TYPE "public"."platform_status" AS ENUM('active', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('active', 'revoked', 'expired');--> statement-breakpoint
CREATE TYPE "public"."suggested_name_status" AS ENUM('suggested', 'dismissed', 'claimed');--> statement-breakpoint
CREATE TYPE "public"."username_check_source" AS ENUM('manual', 'watchlist');--> statement-breakpoint
CREATE TYPE "public"."username_check_status" AS ENUM('available', 'taken', 'unknown', 'invalid', 'error');--> statement-breakpoint
CREATE TYPE "public"."watchlist_item_status" AS ENUM('active', 'paused', 'archived');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "favorites" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"platform_id" integer NOT NULL,
	"handle" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "platforms" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"status" "platform_status" DEFAULT 'active' NOT NULL,
	"base_url" text NOT NULL,
	"profile_url_template" text NOT NULL,
	"handle_regex" text,
	"icon_url" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"token" text NOT NULL,
	"status" "session_status" DEFAULT 'active' NOT NULL,
	"user_agent" text,
	"ip_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"last_seen_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "suggested_names" (
	"id" serial PRIMARY KEY NOT NULL,
	"platform_id" integer NOT NULL,
	"handle" text NOT NULL,
	"status" "suggested_name_status" DEFAULT 'suggested' NOT NULL,
	"source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "username_checks" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"session_id" integer,
	"platform_id" integer NOT NULL,
	"handle" text NOT NULL,
	"source" "username_check_source" DEFAULT 'manual' NOT NULL,
	"status" "username_check_status" NOT NULL,
	"profile_url" text,
	"error_message" text,
	"response_ms" integer,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "watchlist_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"platform_id" integer NOT NULL,
	"handle" text NOT NULL,
	"status" "watchlist_item_status" DEFAULT 'active' NOT NULL,
	"last_status" "username_check_status",
	"last_checked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "favorites" ADD CONSTRAINT "favorites_platform_id_platforms_id_fk" FOREIGN KEY ("platform_id") REFERENCES "public"."platforms"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "suggested_names" ADD CONSTRAINT "suggested_names_platform_id_platforms_id_fk" FOREIGN KEY ("platform_id") REFERENCES "public"."platforms"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "username_checks" ADD CONSTRAINT "username_checks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "username_checks" ADD CONSTRAINT "username_checks_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "username_checks" ADD CONSTRAINT "username_checks_platform_id_platforms_id_fk" FOREIGN KEY ("platform_id") REFERENCES "public"."platforms"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "watchlist_items" ADD CONSTRAINT "watchlist_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "watchlist_items" ADD CONSTRAINT "watchlist_items_platform_id_platforms_id_fk" FOREIGN KEY ("platform_id") REFERENCES "public"."platforms"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "favorites_user_id_idx" ON "favorites" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "favorites_platform_id_idx" ON "favorites" USING btree ("platform_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "favorites_user_platform_handle_unique" ON "favorites" USING btree ("user_id","platform_id","handle");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "platforms_key_unique" ON "platforms" USING btree ("key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "platforms_status_idx" ON "platforms" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "platforms_sort_order_idx" ON "platforms" USING btree ("sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sessions_token_unique" ON "sessions" USING btree ("token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "suggested_names_platform_id_idx" ON "suggested_names" USING btree ("platform_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "suggested_names_platform_handle_unique" ON "suggested_names" USING btree ("platform_id","handle");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "username_checks_user_id_idx" ON "username_checks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "username_checks_session_id_idx" ON "username_checks" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "username_checks_platform_id_idx" ON "username_checks" USING btree ("platform_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "username_checks_platform_handle_idx" ON "username_checks" USING btree ("platform_id","handle");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_unique" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "watchlist_items_user_id_idx" ON "watchlist_items" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "watchlist_items_platform_id_idx" ON "watchlist_items" USING btree ("platform_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "watchlist_items_user_platform_handle_unique" ON "watchlist_items" USING btree ("user_id","platform_id","handle");