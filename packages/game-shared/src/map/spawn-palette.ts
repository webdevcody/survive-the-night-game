/**
 * World map `spawns` layer tile IDs (shared by editor + game-server).
 * Must stay in sync with ZombieFactory.ZombieType order for indices 2–6.
 * Item fixture tile IDs start at ITEM_SPAWN_TILE_ID_MIN (see ITEM_FIXTURE_SPAWN_TYPES).
 */
import { ENTITY_REGISTRATION_CONFIG } from "../config/entity-registration";
import type { EntityType } from "../types/entity";
import { itemRegistry } from "../entities/item-registry";
import { weaponRegistry } from "../entities/weapon-registry";
import { resourceRegistry } from "../entities/resource-registry";

export const SPAWN_TILE_NONE = 0;
export const SPAWN_TILE_PLAYER = 1;

/** Zombie spawn tile IDs 2–6 map to these types in order. */
export const SPAWN_ZOMBIE_TYPES = ["regular", "fast", "big", "bat", "spitter"] as const;

export type SpawnZombiePaletteType = (typeof SPAWN_ZOMBIE_TYPES)[number];

const ITEM_FIXTURE_EXCLUDED_TYPES = new Set<EntityType>(["boundary", "crate"]);

/**
 * Pickup types placeable as item spawn fixtures (registration order = stable tile IDs from 7 upward).
 */
export const ITEM_FIXTURE_SPAWN_TYPES: readonly EntityType[] = ENTITY_REGISTRATION_CONFIG.filter(
  (e) =>
    (e.category === "items" || e.category === "ammo" || e.category === "weapons") &&
    !ITEM_FIXTURE_EXCLUDED_TYPES.has(e.type),
).map((e) => e.type);

/** First spawns-layer tile id used for item fixtures (after player + 5 zombie types). */
export const ITEM_SPAWN_TILE_ID_MIN = 7;

export const ITEM_SPAWN_TILE_COUNT = ITEM_FIXTURE_SPAWN_TYPES.length;

/** One past the last item-fixture tile id (exclusive). */
export const ITEM_SPAWN_TILE_ID_END = ITEM_SPAWN_TILE_ID_MIN + ITEM_SPAWN_TILE_COUNT;

/**
 * Spawns-layer tile id for a static dialogue NPC (survivor sprite). Message is stored in
 * `world-map.json` under `dialogueNpcs` (see `WorldMapDialogueNpcEntry`).
 */
export const NPC_DIALOGUE_SURVIVOR_SPAWN_TILE_ID = ITEM_SPAWN_TILE_ID_END;

export const DEFAULT_ITEM_FIXTURE_RESPAWN_MS = 120_000;

/** Max authored dialogue length per line for map JSON and server spawn (chars). */
export const DIALOGUE_NPC_MAX_MESSAGE_LENGTH = 1000;

/** Max number of dialog lines per NPC in authored map data. */
export const DIALOGUE_NPC_MAX_LINE_COUNT = 32;

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

export function isItemSpawnTile(id: number): boolean {
  return id >= ITEM_SPAWN_TILE_ID_MIN && id < ITEM_SPAWN_TILE_ID_END;
}

export function spawnTileIdToItemFixtureType(id: number): EntityType | null {
  if (!isItemSpawnTile(id)) {
    return null;
  }
  return ITEM_FIXTURE_SPAWN_TYPES[id - ITEM_SPAWN_TILE_ID_MIN] ?? null;
}

export function isNpcDialogueSurvivorSpawnTile(id: number): boolean {
  return id === NPC_DIALOGUE_SURVIVOR_SPAWN_TILE_ID;
}

export function getItemFixtureRespawnMs(entityType: EntityType): number {
  const item = itemRegistry.get(entityType);
  if (item?.fixtureRespawnMs != null) {
    return item.fixtureRespawnMs;
  }
  const weapon = weaponRegistry.get(entityType);
  if (weapon?.fixtureRespawnMs != null) {
    return weapon.fixtureRespawnMs;
  }
  const resource = resourceRegistry.get(entityType);
  if (resource?.fixtureRespawnMs != null) {
    return resource.fixtureRespawnMs;
  }
  return DEFAULT_ITEM_FIXTURE_RESPAWN_MS;
}

export interface SpawnPaletteEntry {
  id: number;
  label: string;
  /** CSS color for editor buttons / overlay tint */
  color: string;
}

/** Player + zombie spawn markers only (tile ids 0–6). */
export const SPAWN_BASE_PALETTE_ENTRIES: readonly SpawnPaletteEntry[] = [
  { id: SPAWN_TILE_NONE, label: "None", color: "transparent" },
  { id: SPAWN_TILE_PLAYER, label: "Player", color: "rgba(34,197,94,0.55)" },
  { id: 2, label: "Zombie", color: "rgba(239,68,68,0.5)" },
  { id: 3, label: "Fast", color: "rgba(249,115,22,0.5)" },
  { id: 4, label: "Big", color: "rgba(168,85,247,0.5)" },
  { id: 5, label: "Bat", color: "rgba(59,130,246,0.5)" },
  { id: 6, label: "Spitter", color: "rgba(234,179,8,0.5)" },
] as const;

function itemFixtureLabel(type: EntityType): string {
  return type.replace(/_/g, " ");
}

function itemFixtureColor(index: number): string {
  const hue = (index * 47) % 360;
  return `hsla(${hue}, 42%, 52%, 0.5)`;
}

/** Item / ammo / weapon fixture markers (tile ids from ITEM_SPAWN_TILE_ID_MIN). */
export const ITEM_SPAWN_PALETTE_ENTRIES: readonly SpawnPaletteEntry[] = ITEM_FIXTURE_SPAWN_TYPES.map(
  (type, i) => ({
    id: ITEM_SPAWN_TILE_ID_MIN + i,
    label: itemFixtureLabel(type),
    color: itemFixtureColor(i),
  }),
);

const NPC_DIALOGUE_SURVIVOR_PALETTE_ENTRY: SpawnPaletteEntry = {
  id: NPC_DIALOGUE_SURVIVOR_SPAWN_TILE_ID,
  label: "Dialogue NPC",
  color: "rgba(52,211,153,0.55)",
};

/** Full spawns-layer palette: player, zombies, item fixtures, then dialogue NPC. */
export const SPAWN_PALETTE_ENTRIES: readonly SpawnPaletteEntry[] = [
  ...SPAWN_BASE_PALETTE_ENTRIES,
  ...ITEM_SPAWN_PALETTE_ENTRIES,
  NPC_DIALOGUE_SURVIVOR_PALETTE_ENTRY,
];

const SPAWN_TILE_SHORT: Record<number, string> = {
  [SPAWN_TILE_NONE]: "",
  [SPAWN_TILE_PLAYER]: "P",
  2: "Z1",
  3: "Z2",
  4: "Z3",
  5: "Z4",
  6: "Z5",
};

/** Short label drawn inside editor spawn cells (2–4 chars). */
export function getSpawnTileShortLabel(spawnTileId: number): string {
  if (spawnTileId <= 0) return "";
  if (SPAWN_TILE_SHORT[spawnTileId]) return SPAWN_TILE_SHORT[spawnTileId]!;
  if (isItemSpawnTile(spawnTileId)) {
    const t = spawnTileIdToItemFixtureType(spawnTileId);
    if (!t) return "?";
    const short = t.replace(/_/g, "");
    return short.length <= 4 ? short : short.slice(0, 4);
  }
  if (isNpcDialogueSurvivorSpawnTile(spawnTileId)) return "NPC";
  return "?";
}
