CREATE TABLE IF NOT EXISTS "game_server" (
	"id" integer PRIMARY KEY NOT NULL,
	"public_ws_url" text NOT NULL,
	"display_name" text,
	"listen_port" integer,
	"last_seen_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL DEFAULT now(),
	"updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
