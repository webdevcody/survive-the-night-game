/**
 * World map `spawns` layer tile IDs (shared by editor + game-server).
 * Must stay in sync with ZombieFactory.ZombieType order for indices 2–6.
 */
export const SPAWN_TILE_NONE = 0;
export const SPAWN_TILE_PLAYER = 1;

/** Zombie spawn tile IDs 2–6 map to these types in order. */
export const SPAWN_ZOMBIE_TYPES = ["regular", "fast", "big", "bat", "spitter"] as const;

export type SpawnZombiePaletteType = (typeof SPAWN_ZOMBIE_TYPES)[number];

export function isPlayerSpawnTile(id: number): boolean {
  return id === SPAWN_TILE_PLAYER;
}

export function isEnemySpawnTile(id: number): boolean {
  return id >= 2 && id <= 6;
}

/** Returns zombie type for tile id 2–6, or null if not an enemy spawn tile. */
export function spawnTileIdToZombieType(id: number): SpawnZombiePaletteType | null {
  if (id < 2 || id > 6) {
    return null;
  }
  return SPAWN_ZOMBIE_TYPES[id - 2];
}

/** Milliseconds after a fixture zombie dies before respawning at the same tile (per palette type). */
export const ENEMY_SPAWN_RESPAWN_MS_BY_TYPE: Record<SpawnZombiePaletteType, number> = {
  regular: 180_000,
  fast: 120_000,
  big: 240_000,
  bat: 150_000,
  spitter: 200_000,
};

export function getEnemySpawnRespawnMs(type: SpawnZombiePaletteType): number {
  return ENEMY_SPAWN_RESPAWN_MS_BY_TYPE[type];
}

export interface SpawnPaletteEntry {
  id: number;
  label: string;
  /** CSS color for editor buttons / overlay tint */
  color: string;
}

export const SPAWN_PALETTE_ENTRIES: readonly SpawnPaletteEntry[] = [
  { id: SPAWN_TILE_NONE, label: "None", color: "transparent" },
  { id: SPAWN_TILE_PLAYER, label: "Player", color: "rgba(34,197,94,0.55)" },
  { id: 2, label: "Zombie", color: "rgba(239,68,68,0.5)" },
  { id: 3, label: "Fast", color: "rgba(249,115,22,0.5)" },
  { id: 4, label: "Big", color: "rgba(168,85,247,0.5)" },
  { id: 5, label: "Bat", color: "rgba(59,130,246,0.5)" },
  { id: 6, label: "Spitter", color: "rgba(234,179,8,0.5)" },
] as const;
