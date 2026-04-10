import { createFileRoute } from "@tanstack/react-router";
import { clearRespawnBind, updateRespawnBind } from "~/data-access/user-stats";
import { requireGameServerApiKey } from "~/utils/game-server-api-auth";

/**
 * Game server → website: save or clear campsite-fire respawn tile bind.
 * POST JSON { userId, respawnTileX?, respawnTileY?, clear?: boolean } with X-API-Key.
 */
export const Route = createFileRoute("/api/game/player-respawn-bind")({
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
            respawnTileX?: unknown;
            respawnTileY?: unknown;
            clear?: unknown;
          };

          if (!body.userId || typeof body.userId !== "string") {
            return new Response(JSON.stringify({ success: false, error: "Missing userId" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          if (body.clear === true) {
            const updated = await clearRespawnBind(body.userId);
            return new Response(
              JSON.stringify({
                success: true,
                respawnTileX: updated.respawnTileX ?? null,
                respawnTileY: updated.respawnTileY ?? null,
              }),
              { status: 200, headers: { "Content-Type": "application/json" } },
            );
          }

          const tx =
            typeof body.respawnTileX === "number" && Number.isFinite(body.respawnTileX)
              ? Math.floor(body.respawnTileX)
              : null;
          const ty =
            typeof body.respawnTileY === "number" && Number.isFinite(body.respawnTileY)
              ? Math.floor(body.respawnTileY)
              : null;

          if (tx === null || ty === null) {
            return new Response(
              JSON.stringify({
                success: false,
                error: "respawnTileX and respawnTileY must be numbers, or use clear: true",
              }),
              {
                status: 400,
                headers: { "Content-Type": "application/json" },
              },
            );
          }

          const updated = await updateRespawnBind(body.userId, tx, ty);
          return new Response(
            JSON.stringify({
              success: true,
              respawnTileX: updated.respawnTileX,
              respawnTileY: updated.respawnTileY,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        } catch (error) {
          console.error("player-respawn-bind POST error:", error);
          return new Response(JSON.stringify({ success: false, error: "Internal server error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
