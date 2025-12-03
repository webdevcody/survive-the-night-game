ALTER TABLE "user_stats" ADD COLUMN "waves_completed" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_stats" ADD COLUMN "max_wave" integer DEFAULT 0 NOT NULL;