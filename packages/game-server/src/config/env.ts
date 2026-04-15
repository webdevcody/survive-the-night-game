import dotenv from "dotenv";

dotenv.config();

/** HTTP + WebSocket listen port. Railway and most PaaS set {@code PORT}; local dev often uses 3001. */
export const LISTEN_PORT: number = (() => {
  const raw = process.env.PORT;
  if (raw != null && raw !== "") {
    const n = Number(raw);
    if (Number.isInteger(n) && n > 0 && n < 65536) {
      return n;
    }
    console.warn(`[env] Invalid PORT "${raw}", using 3001`);
  }
  return 3001;
})();

export const DEFAULT_ADMIN_PASSWORD = "default-admin-password";

export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;

// Website API URL for session validation
export const WEBSITE_API_URL = process.env.WEBSITE_API_URL || "http://localhost:3000";

// API key for server-to-server authentication (game server → website API)
export const GAME_SERVER_API_KEY = process.env.GAME_SERVER_API_KEY || "abc123";

/** Stable numeric id for this process (registry + session leases). Optional in dev. */
export const GAME_SERVER_ID = (process.env.GAME_SERVER_ID ?? "").trim();

/** Public WebSocket URL browsers use (e.g. wss://game.example.com). Required for registry when GAME_SERVER_ID is set. */
export const GAME_SERVER_PUBLIC_WS_URL = (process.env.GAME_SERVER_PUBLIC_WS_URL ?? "").trim();

/** Optional label in the server picker (registry). */
export const GAME_SERVER_DISPLAY_NAME = (process.env.GAME_SERVER_DISPLAY_NAME ?? "").trim();
