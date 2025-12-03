import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { auth } from "~/utils/auth";
import { findUserById } from "~/data-access/users";
import crypto from "crypto";

/**
 * Generate a short-lived game authentication token for WebSocket connections.
 * This token is safe to expose to client-side JavaScript since it:
 * 1. Is short-lived (expires in 5 minutes)
 * 2. Can only be used for game server authentication
 * 3. Is tied to the user's session
 */
export const getGameAuthToken = createServerFn({ method: "GET" }).handler(
  async () => {
    const headers = getRequest().headers;
    const session = await auth.api.getSession({
      headers: headers as unknown as Headers,
    });

    if (!session?.user) {
      return { token: null, userId: null, displayName: null };
    }

    // Create a simple signed token: base64(userId:timestamp:signature)
    const userId = session.user.id;
    const timestamp = Date.now();
    const expiresAt = timestamp + 5 * 60 * 1000; // 5 minutes

    // Fetch user to get displayName
    const user = await findUserById(userId);
    const displayName = user?.displayName || user?.name || "Survivor";

    // Use GAME_SERVER_API_KEY as the signing secret
    const secret = process.env.GAME_SERVER_API_KEY;
    if (!secret) {
      console.warn("GAME_SERVER_API_KEY not set - game auth tokens disabled");
      return { token: null, userId: null, displayName };
    }

    const payload = `${userId}:${expiresAt}`;
    const signature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    const token = Buffer.from(`${payload}:${signature}`).toString("base64");

    return { token, userId, displayName };
  }
);
