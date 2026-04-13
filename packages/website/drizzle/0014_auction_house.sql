CREATE TABLE "auction_house_listing" (
	"id" text PRIMARY KEY NOT NULL,
	"seller_user_id" text NOT NULL,
	"item_type" text NOT NULL,
	"item_state" jsonb,
	"price" integer NOT NULL,
	"item_category" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"buyer_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sold_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "auction_house_listing" ADD CONSTRAINT "auction_house_listing_seller_user_id_user_id_fk" FOREIGN KEY ("seller_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "user_stats" ADD COLUMN "auction_claimable_coins" integer DEFAULT 0 NOT NULL;
