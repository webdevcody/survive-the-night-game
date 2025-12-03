import dotenv from "dotenv";

dotenv.config();

export const DEFAULT_ADMIN_PASSWORD = "default-admin-password";

export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;

// Website API URL for session validation
export const WEBSITE_API_URL = process.env.WEBSITE_API_URL || "http://localhost:3000";

// API key for server-to-server authentication (game server → website API)
export const GAME_SERVER_API_KEY = process.env.GAME_SERVER_API_KEY || "abc123";
