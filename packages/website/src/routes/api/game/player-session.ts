import { createFileRoute } from "@tanstack/react-router";
import {
  claimGameSessionLease,
  heartbeatGameSessionLease,
  releaseGameSessionLease,
} from "~/data-access/user-game-session";
import { requireGameServerApiKey } from "~/utils/game-server-api-auth";

/**
 * Game server → website: distributed single-active-session lease per user.
 * POST JSON { action, userId, sessionId, serverId? } with X-API-Key.
 */
export const Route = createFileRoute("/api/game/player-session")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const authError = requireGameServerApiKey(request);
          if (authError) {
            return authError;
          }

          const body = (await request.json()) as {
            action?: unknown;
            userId?: unknown;
            sessionId?: unknown;
            serverId?: unknown;
          };

          const action = body.action;
          if (action !== "claim" && action !== "heartbeat" && action !== "release") {
            return new Response(JSON.stringify({ success: false, error: "Invalid action" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          if (!body.userId || typeof body.userId !== "string") {
            return new Response(JSON.stringify({ success: false, error: "Missing userId" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          if (!body.sessionId || typeof body.sessionId !== "string") {
            return new Response(JSON.stringify({ success: false, error: "Missing sessionId" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          const userId = body.userId;
          const sessionId = body.sessionId;

          if (action === "claim") {
            if (!body.serverId || typeof body.serverId !== "string") {
              return new Response(JSON.stringify({ success: false, error: "Missing serverId" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
              });
            }
            const result = await claimGameSessionLease(userId, sessionId, body.serverId);
            if (result.ok === false) {
              const reason = result.reason;
              return new Response(
                JSON.stringify({
                  success: false,
                  error: reason === "user_not_found" ? "User not found" : "ACTIVE_SESSION",
                  code: reason === "user_not_found" ? "USER_NOT_FOUND" : "ACTIVE_SESSION",
                }),
                {
                  status: reason === "user_not_found" ? 404 : 409,
                  headers: { "Content-Type": "application/json" },
                },
              );
            }
            return new Response(JSON.stringify({ success: true }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          }

          if (action === "heartbeat") {
            const hb = await heartbeatGameSessionLease(userId, sessionId);
            return new Response(JSON.stringify({ success: true, stillOwner: hb.stillOwner }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          }

          await releaseGameSessionLease(userId, sessionId);
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          console.error("player-session POST error:", error);
          return new Response(JSON.stringify({ success: false, error: "Internal server error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
