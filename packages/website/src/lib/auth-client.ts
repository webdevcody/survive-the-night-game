import { createAuthClient } from "better-auth/react";
export const authClient = createAuthClient({
  baseURL: process.env.VITE_BETTER_AUTH_URL || "http://localhost:3000",
});
