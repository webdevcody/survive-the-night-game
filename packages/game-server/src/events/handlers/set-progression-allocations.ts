import { HandlerContext } from "../context";
import { SocketEventHandler } from "./types";
import { ISocketAdapter } from "@shared/network/socket-adapter";
import { WEBSITE_API_URL, GAME_SERVER_API_KEY } from "@/config/env";
import {
  normalizeCharacterAllocations,
  normalizeSkillAllocations,
  validateCharacterAllocations,
  validateSkillAllocations,
} from "@shared/util/progression-allocation";
import type { SetProgressionAllocationsEventData } from "@shared/events/client-sent/events/set-progression-allocations";

async function persistSkillAllocations(userId: string, allocations: Record<string, number>): Promise<boolean> {
  if (!GAME_SERVER_API_KEY) return false;
  try {
    const res = await fetch(`${WEBSITE_API_URL}/api/game/skill-allocations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": GAME_SERVER_API_KEY,
      },
      body: JSON.stringify({ userId, allocations }),
    });
    return res.ok;
  } catch (e) {
    console.error("[setProgressionAllocations] skill persist failed", e);
    return false;
  }
}

async function persistCharacterAllocations(
  userId: string,
  allocations: Record<string, number>,
): Promise<boolean> {
  if (!GAME_SERVER_API_KEY) return false;
  try {
    const res = await fetch(`${WEBSITE_API_URL}/api/game/character-allocations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": GAME_SERVER_API_KEY,
      },
      body: JSON.stringify({ userId, allocations }),
    });
    return res.ok;
  } catch (e) {
    console.error("[setProgressionAllocations] character persist failed", e);
    return false;
  }
}

export function setProgressionAllocations(
  context: HandlerContext,
  socket: ISocketAdapter,
  payload: SetProgressionAllocationsEventData,
): void {
  const player = context.players.get(socket.id);
  if (!player) {
    return;
  }

  const userId = context.userSessionCache.getUserIdBySocket(socket.id);
  if (!userId) {
    return;
  }

  const xp = player.getTotalExperience();

  void (async () => {
    if (payload.kind === "skill") {
      const normalized = normalizeSkillAllocations(payload.allocations);
      const err = validateSkillAllocations(normalized, xp);
      if (err) {
        console.warn("[setProgressionAllocations] skill validation failed", err);
        return;
      }
      player.applyPersistedProgress(
        normalized as Record<string, number>,
        player.getCharacterAllocationRecord(),
      );
      const ok = await persistSkillAllocations(userId, normalized as Record<string, number>);
      if (!ok && GAME_SERVER_API_KEY) {
        console.warn(
          "[setProgressionAllocations] skill allocations applied in-memory but website persist failed (check API key / website)",
        );
      }
      return;
    }

    const normalized = normalizeCharacterAllocations(payload.allocations);
    const err = validateCharacterAllocations(normalized, xp);
    if (err) {
      console.warn("[setProgressionAllocations] character validation failed", err);
      return;
    }
    player.applyPersistedProgress(player.getSkillAllocationRecord(), normalized as Record<string, number>);
    const ok = await persistCharacterAllocations(userId, normalized as Record<string, number>);
    if (!ok && GAME_SERVER_API_KEY) {
      console.warn(
        "[setProgressionAllocations] character allocations applied in-memory but website persist failed (check API key / website)",
      );
    }
  })();
}

export const setProgressionAllocationsHandler: SocketEventHandler<SetProgressionAllocationsEventData> = {
  event: "SET_PROGRESSION_ALLOCATIONS",
  handler: setProgressionAllocations,
};
