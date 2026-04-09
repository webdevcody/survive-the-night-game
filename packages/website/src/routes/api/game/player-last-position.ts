import { createFileRoute } from "@tanstack/react-router";
import { updateLastTilePosition } from "~/data-access/user-stats";
import { requireGameServerApiKey } from "~/utils/game-server-api-auth";

/**
 * Game server → website: save last open-world tile when the player disconnects.
 * POST JSON { userId, lastTileX, lastTileY } with X-API-Key
 */
export const Route = createFileRoute("/api/game/player-last-position")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const authError = requireGameServerApiKey(request);
          if (authError) {
            return authError;
          }

          const body = (await request.json()) as {
            userId?: unknown;
            lastTileX?: unknown;
            lastTileY?: unknown;
          };

          if (!body.userId || typeof body.userId !== "string") {
            return new Response(JSON.stringify({ success: false, error: "Missing userId" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          const tx =
            typeof body.lastTileX === "number" && Number.isFinite(body.lastTileX)
              ? Math.floor(body.lastTileX)
              : null;
          const ty =
            typeof body.lastTileY === "number" && Number.isFinite(body.lastTileY)
              ? Math.floor(body.lastTileY)
              : null;

          if (tx === null || ty === null) {
            return new Response(
              JSON.stringify({ success: false, error: "lastTileX and lastTileY must be numbers" }),
              {
                status: 400,
                headers: { "Content-Type": "application/json" },
              },
            );
          }

          const updated = await updateLastTilePosition(body.userId, tx, ty);

          return new Response(
            JSON.stringify({
              success: true,
              lastTileX: updated.lastTileX,
              lastTileY: updated.lastTileY,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        } catch (error) {
          console.error("player-last-position POST error:", error);
          return new Response(JSON.stringify({ success: false, error: "Internal server error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
