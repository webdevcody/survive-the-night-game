import type { PlayerQuestStatePayload } from "@shared/quests/player-quest-state";

export type PersistedPlayerProgress = {
  experience: number;
  skillAllocations: Record<string, number>;
  characterAllocations: Record<string, number>;
  /** Open world: last tile indices when the player disconnected (alive). */
  lastTileX?: number | null;
  lastTileY?: number | null;
  questProgress?: PlayerQuestStatePayload;
};
