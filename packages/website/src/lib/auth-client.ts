import { createAuthClient } from "better-auth/react";
import { publicEnv } from "~/config/publicEnv";
export const authClient = createAuthClient({
  baseURL: publicEnv.BETTER_AUTH_URL,
});
