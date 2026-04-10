import { createFileRoute } from "@tanstack/react-router";
import {
  persistGameServerDisconnectSnapshot,
  persistOpenWorldSessionFields,
  updateLastTilePosition,
} from "~/data-access/user-stats";
import { coercePlayerQuestState } from "@survive-the-night/game-shared/quests/player-quest-state";
import { requireGameServerApiKey } from "~/utils/game-server-api-auth";

/**
 * Game server → website: save last open-world tile when the player disconnects.
 * POST JSON { userId, lastTileX, lastTileY, questProgress?, characterAllocations?, skillAllocations?, savedInventory?, respawnTileX?, respawnTileY? } with X-API-Key.
 * Default (disconnect): last tile + optional respawn + optional character — does **not** overwrite quest_progress (quests use /api/game/player-quest-progress).
 * Legacy: if both questProgress and characterAllocations are sent, full snapshot including quests is written.
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
            respawnTileX?: unknown;
            respawnTileY?: unknown;
            questProgress?: unknown;
            characterAllocations?: unknown;
            skillAllocations?: unknown;
            savedInventory?: unknown;
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

          let respawnTileX: number | null | undefined = undefined;
          let respawnTileY: number | null | undefined = undefined;
          if (body.respawnTileX !== undefined || body.respawnTileY !== undefined) {
            const rx =
              typeof body.respawnTileX === "number" && Number.isFinite(body.respawnTileX)
                ? Math.floor(body.respawnTileX)
                : null;
            const ry =
              typeof body.respawnTileY === "number" && Number.isFinite(body.respawnTileY)
                ? Math.floor(body.respawnTileY)
                : null;
            if (rx !== null && ry !== null) {
              respawnTileX = rx;
              respawnTileY = ry;
            } else {
              respawnTileX = null;
              respawnTileY = null;
            }
          }

          let updated;
          const skillRaw = body.skillAllocations;
          const skillAllocations =
            skillRaw !== undefined &&
            skillRaw !== null &&
            typeof skillRaw === "object" &&
            !Array.isArray(skillRaw)
              ? (skillRaw as Record<string, number>)
              : undefined;

          const savedInventory =
            body.savedInventory !== undefined && body.savedInventory !== null
              ? body.savedInventory
              : undefined;

          if (hasSnapshot) {
            updated = await persistGameServerDisconnectSnapshot(body.userId, {
              lastTileX: tx,
              lastTileY: ty,
              questProgress: coercePlayerQuestState(body.questProgress),
              characterAllocations:
                typeof body.characterAllocations === "object" &&
                body.characterAllocations !== null &&
                !Array.isArray(body.characterAllocations)
                  ? (body.characterAllocations as Record<string, number>)
                  : {},
              ...(skillAllocations !== undefined ? { skillAllocations } : {}),
              ...(savedInventory !== undefined ? { savedInventory } : {}),
              ...(respawnTileX !== undefined ? { respawnTileX, respawnTileY } : {}),
            });
          } else {
            const charRaw = body.characterAllocations;
            const characterAllocations =
              charRaw !== undefined &&
              charRaw !== null &&
              typeof charRaw === "object" &&
              !Array.isArray(charRaw)
                ? (charRaw as Record<string, number>)
                : undefined;

            const hasSideFields =
              characterAllocations !== undefined ||
              skillAllocations !== undefined ||
              savedInventory !== undefined ||
              respawnTileX !== undefined;

            if (hasSideFields) {
              updated = await persistOpenWorldSessionFields(body.userId, {
                lastTileX: tx,
                lastTileY: ty,
                ...(characterAllocations !== undefined ? { characterAllocations } : {}),
                ...(skillAllocations !== undefined ? { skillAllocations } : {}),
                ...(savedInventory !== undefined ? { savedInventory } : {}),
                ...(respawnTileX !== undefined ? { respawnTileX, respawnTileY } : {}),
              });
            } else {
              updated = await updateLastTilePosition(body.userId, tx, ty);
            }
          }

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
