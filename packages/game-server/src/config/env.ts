import dotenv from "dotenv";

dotenv.config();

export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "default-admin-password";
