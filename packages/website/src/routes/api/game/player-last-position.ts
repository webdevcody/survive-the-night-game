import { createFileRoute } from "@tanstack/react-router";
import {
  persistGameServerDisconnectSnapshot,
  updateLastTilePosition,
} from "~/data-access/user-stats";
import { coercePlayerQuestState } from "@survive-the-night/game-shared/quests/player-quest-state";
import { requireGameServerApiKey } from "~/utils/game-server-api-auth";

/**
 * Game server → website: save last open-world tile when the player disconnects.
 * POST JSON { userId, lastTileX, lastTileY, questProgress?, characterAllocations? } with X-API-Key.
 * When `questProgress` and `characterAllocations` are included, all fields are written in one update (trusted).
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
            questProgress?: unknown;
            characterAllocations?: unknown;
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

          const hasSnapshot =
            body.questProgress !== undefined &&
            body.questProgress !== null &&
            body.characterAllocations !== undefined &&
            body.characterAllocations !== null;

          const updated = hasSnapshot
            ? await persistGameServerDisconnectSnapshot(body.userId, {
                lastTileX: tx,
                lastTileY: ty,
                questProgress: coercePlayerQuestState(body.questProgress),
                characterAllocations:
                  typeof body.characterAllocations === "object" &&
                  body.characterAllocations !== null &&
                  !Array.isArray(body.characterAllocations)
                    ? (body.characterAllocations as Record<string, number>)
                    : {},
              })
            : await updateLastTilePosition(body.userId, tx, ty);

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
