import { createFileRoute } from "@tanstack/react-router";
import { upsertGameServerRegistration } from "~/data-access/game-server-registry";
import { requireGameServerApiKey } from "~/utils/game-server-api-auth";

/**
 * Game server → website: upsert this instance in the public registry.
 * POST JSON { id: number, publicWsUrl: string, displayName?: string, listenPort?: number } with X-API-Key.
 */
export const Route = createFileRoute("/api/game/servers/register")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const authError = requireGameServerApiKey(request);
          if (authError) {
            return authError;
          }

          const body = (await request.json()) as {
            id?: unknown;
            publicWsUrl?: unknown;
            displayName?: unknown;
            listenPort?: unknown;
          };

          if (typeof body.id !== "number" || !Number.isInteger(body.id)) {
            return new Response(JSON.stringify({ success: false, error: "Missing or invalid id" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          if (!body.publicWsUrl || typeof body.publicWsUrl !== "string") {
            return new Response(JSON.stringify({ success: false, error: "Missing publicWsUrl" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          const listenPort =
            body.listenPort === undefined || body.listenPort === null
              ? null
              : typeof body.listenPort === "number" && Number.isInteger(body.listenPort)
                ? body.listenPort
                : null;

          await upsertGameServerRegistration({
            id: body.id,
            publicWsUrl: body.publicWsUrl.trim(),
            displayName:
              typeof body.displayName === "string" && body.displayName.trim() !== ""
                ? body.displayName.trim()
                : null,
            listenPort,
          });

          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          console.error("POST /api/game/servers/register error:", error);
          return new Response(JSON.stringify({ success: false, error: "Internal server error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
