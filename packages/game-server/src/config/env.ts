import dotenv from "dotenv";

dotenv.config();

export const DEFAULT_ADMIN_PASSWORD = "default-admin-password";

export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;
