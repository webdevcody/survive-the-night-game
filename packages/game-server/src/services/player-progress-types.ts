import type { ProfessionProgress } from "@shared/util/professions";
import type { PlayerQuestStatePayload } from "@shared/quests/player-quest-state";
import type { PlayerInventoryPersistedPayload } from "@shared/util/persisted-inventory-payload";
import type { PlayerBankPersistedPayload } from "@shared/util/persisted-bank-payload";

export type PersistedPlayerProgress = {
  experience: number;
  abilityAllocations: Record<string, number>;
  characterAllocations: Record<string, number>;
  professionProgress: ProfessionProgress;
  /** Open world: last tile indices when the player disconnected (alive). */
  lastTileX?: number | null;
  lastTileY?: number | null;
  /** Open world: respawn tile from last campsite-fire bind (hydrated on connect). */
  respawnTileX?: number | null;
  respawnTileY?: number | null;
  questProgress?: PlayerQuestStatePayload;
  /** Bag + equipment from website `user_stats.saved_inventory` when present. */
  savedInventory?: PlayerInventoryPersistedPayload | null;
  /** Personal bank from website `user_stats.saved_bank` when present. */
  savedBank?: PlayerBankPersistedPayload | null;
};
