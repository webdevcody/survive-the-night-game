ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "last_game_login_at" timestamp with time zone;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "active_game_session_id" text;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "active_game_server_id" text;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "active_game_heartbeat_at" timestamp with time zone;
