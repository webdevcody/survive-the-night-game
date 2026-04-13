import { createFileRoute } from "@tanstack/react-router";
import {
  persistGameServerDisconnectSnapshot,
  persistOpenWorldSessionFields,
  updateLastTilePosition,
} from "~/data-access/user-stats";
import { coercePlayerQuestState } from "@survive-the-night/game-shared/quests/player-quest-state";
import { normalizeProfessionProgress } from "@survive-the-night/game-shared/util/professions";
import { requireGameServerApiKey } from "~/utils/game-server-api-auth";

/**
 * Game server → website: save last open-world tile when the player disconnects.
 * POST JSON { userId, lastTileX, lastTileY, questProgress?, characterAllocations?, abilityAllocations?, professionProgress?, savedInventory?, savedBank?, respawnTileX?, respawnTileY? } with X-API-Key.
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
            abilityAllocations?: unknown;
            skillAllocations?: unknown;
            professionProgress?: unknown;
            savedInventory?: unknown;
            savedBank?: unknown;
            mapExploration?: unknown;
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
          const abilityRaw = body.abilityAllocations;
          const skillRaw = body.skillAllocations;
          const abilityAllocations = (
            (abilityRaw !== undefined &&
              abilityRaw !== null &&
              typeof abilityRaw === "object" &&
              !Array.isArray(abilityRaw)
              ? (abilityRaw as Record<string, number>)
              : undefined) ??
            (skillRaw !== undefined &&
              skillRaw !== null &&
              typeof skillRaw === "object" &&
              !Array.isArray(skillRaw)
              ? (skillRaw as Record<string, number>)
              : undefined));
          const professionProgress =
            body.professionProgress !== undefined &&
            body.professionProgress !== null &&
            typeof body.professionProgress === "object" &&
            !Array.isArray(body.professionProgress)
              ? normalizeProfessionProgress(body.professionProgress)
              : undefined;

          const savedInventory =
            body.savedInventory !== undefined && body.savedInventory !== null
              ? body.savedInventory
              : undefined;

          const savedBank =
            body.savedBank !== undefined && body.savedBank !== null ? body.savedBank : undefined;

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
              ...(abilityAllocations !== undefined ? { abilityAllocations } : {}),
              ...(professionProgress !== undefined ? { professionProgress } : {}),
              ...(savedInventory !== undefined ? { savedInventory } : {}),
              ...(savedBank !== undefined ? { savedBank } : {}),
              ...(respawnTileX !== undefined ? { respawnTileX, respawnTileY } : {}),
              ...(body.mapExploration !== undefined ? { mapExploration: body.mapExploration } : {}),
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
              abilityAllocations !== undefined ||
              professionProgress !== undefined ||
              savedInventory !== undefined ||
              savedBank !== undefined ||
              respawnTileX !== undefined ||
              body.mapExploration !== undefined;

            if (hasSideFields) {
              updated = await persistOpenWorldSessionFields(body.userId, {
                lastTileX: tx,
                lastTileY: ty,
                ...(characterAllocations !== undefined ? { characterAllocations } : {}),
                ...(abilityAllocations !== undefined ? { abilityAllocations } : {}),
                ...(professionProgress !== undefined ? { professionProgress } : {}),
                ...(savedInventory !== undefined ? { savedInventory } : {}),
                ...(savedBank !== undefined ? { savedBank } : {}),
                ...(respawnTileX !== undefined ? { respawnTileX, respawnTileY } : {}),
                ...(body.mapExploration !== undefined ? { mapExploration: body.mapExploration } : {}),
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
