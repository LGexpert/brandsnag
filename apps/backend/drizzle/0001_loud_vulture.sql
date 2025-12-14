CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
ALTER TABLE "favorites" ADD COLUMN "tags" text;--> statement-breakpoint
ALTER TABLE "favorites" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_hash" text NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" "user_role" DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "watchlist_items" ADD COLUMN "tags" text;--> statement-breakpoint
ALTER TABLE "watchlist_items" ADD COLUMN "notes" text;