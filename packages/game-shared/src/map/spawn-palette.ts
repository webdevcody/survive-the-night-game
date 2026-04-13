/**
 * World map `spawns` layer tile IDs (shared by editor + game-server).
 * Zombie palette tile IDs 2–6 map to standard types (see SPAWN_ZOMBIE_TYPES).
 * Extended enemies / bosses: fixed ids 252+ (append-only; outside item range; after NPC 250–251).
 * Item fixture tile IDs: ITEM_SPAWN_TILE_ID_MIN .. ITEM_SPAWN_TILE_ID_END-1 (see ITEM_FIXTURE_SPAWN_TYPES).
 * Dialogue NPCs: fixed ids 250–251 (see rewriteSpawnsLayerDialogueNpcTiles on map load).
 */
import { ENTITY_REGISTRATION_CONFIG, type EntityCategory } from "../config/entity-registration";
import type { EntityType } from "../types/entity";
import { CRAFT_RECIPE_COMPONENT_ENTITY_TYPES } from "../util/recipes";
import { getMerchantBuyPriceForEntityType } from "../util/merchant-pricing";
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
 * Types that must appear **after** all other fixture types in tile-ID order.
 * Spawns-layer tile IDs 7+ are indices into `ITEM_FIXTURE_SPAWN_TYPES`. Inserting a new type
 * in the middle of `ENTITY_REGISTRATION_CONFIG` would shift every later index and break
 * existing maps — so new pickup fixtures go here (append-only) until we version the map format.
 */
const ITEM_FIXTURE_APPEND_ONLY_TYPES = new Set<EntityType>(["pain_pills"]);

/**
 * Recipe ingredients (and similar pickup types) that are not part of the registration-order fixture list
 * still get stable tile ids appended at the end (see {@link buildItemFixtureSpawnTypes}).
 */

/** True if this type can be spawned as a map pickup via item / weapon / resource configs. */
function isRegistryPickupFixtureCandidate(type: EntityType): boolean {
  if (ITEM_FIXTURE_EXCLUDED_TYPES.has(type)) {
    return false;
  }
  return (
    itemRegistry.has(type) ||
    weaponRegistry.has(type) ||
    resourceRegistry.has(type)
  );
}

function buildItemFixtureSpawnTypes(): EntityType[] {
  const registrationOrder = ENTITY_REGISTRATION_CONFIG.filter(
    (e) =>
      (e.category === "items" || e.category === "ammo" || e.category === "weapons") &&
      !ITEM_FIXTURE_EXCLUDED_TYPES.has(e.type),
  ).map((e) => e.type);

  const core = registrationOrder.filter((t) => !ITEM_FIXTURE_APPEND_ONLY_TYPES.has(t));
  const appended = registrationOrder.filter((t) => ITEM_FIXTURE_APPEND_ONLY_TYPES.has(t));
  const base = [...core, ...appended];
  const baseSet = new Set(base);

  const recipeIngredientAppend = [...CRAFT_RECIPE_COMPONENT_ENTITY_TYPES]
    .filter((t) => !baseSet.has(t) && isRegistryPickupFixtureCandidate(t))
    .sort((a, b) => {
      const pa = getMerchantBuyPriceForEntityType(a);
      const pb = getMerchantBuyPriceForEntityType(b);
      if (pb !== pa) {
        return pb - pa;
      }
      return a.localeCompare(b);
    });

  return [...base, ...recipeIngredientAppend];
}

/**
 * Pickup types placeable as item spawn fixtures. Order = stable tile IDs from 7 upward
 * (registration order + {@link ITEM_FIXTURE_APPEND_ONLY_TYPES} + recipe-ingredient append list).
 */
export const ITEM_FIXTURE_SPAWN_TYPES: readonly EntityType[] = buildItemFixtureSpawnTypes();

/** First spawns-layer tile id used for item fixtures (after player + 5 zombie types). */
export const ITEM_SPAWN_TILE_ID_MIN = 7;

export const ITEM_SPAWN_TILE_COUNT = ITEM_FIXTURE_SPAWN_TYPES.length;

/**
 * Exclusive end of the item-fixture id range: ids `ITEM_SPAWN_TILE_ID_MIN` .. `ITEM_SPAWN_TILE_ID_END - 1`.
 * Dialogue NPC markers use **fixed** ids below so adding item types never collides with NPC tiles.
 */
export const ITEM_SPAWN_TILE_ID_END = ITEM_SPAWN_TILE_ID_MIN + ITEM_SPAWN_TILE_COUNT;

/**
 * Fixed spawns-layer ids for dialogue NPCs (must stay outside the item range7 .. ITEM_SPAWN_TILE_ID_END-1).
 * Previously these were `ITEM_SPAWN_TILE_ID_END` and `+1`, which broke maps whenever a new item fixture
 * was appended (same numeric id as the last item slot).
 */
export const NPC_DIALOGUE_SURVIVOR_SPAWN_TILE_ID = 250;

/** Healer variant; message / heal flag live under `dialogueNpcs` in world-map.json. */
export const NPC_HEALER_DIALOGUE_SPAWN_TILE_ID = 251;

/**
 * Grave Tyrant spawner tile id (first extended-enemy slot; keep stable for existing maps).
 * @deprecated Prefer {@link EXTENDED_ZOMBIE_SPAWN_FIXTURES}.
 */
export const BOSS_ZOMBIE_SPAWN_TILE_ID = 252;

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

export const EXTENDED_ZOMBIE_SPAWN_KINDS = [
  "grave_tyrant",
  "charging_tyrant",
  "acid_flyer",
  "splitter_boss",
  "exploding_zombie",
  "leaping_zombie",
] as const;

export type ExtendedZombieSpawnFixtureKind = (typeof EXTENDED_ZOMBIE_SPAWN_KINDS)[number];

/**
 * Authored extended / boss enemy markers on the spawns layer (fixed tile ids; append new rows only).
 * `editorGroup` drives the spawner panel typeahead sections (boss vs extra zombie variants).
 */
export const EXTENDED_ZOMBIE_SPAWN_FIXTURES: readonly {
  readonly id: number;
  readonly kind: ExtendedZombieSpawnFixtureKind;
  readonly editorGroup: "zombies" | "boss";
  readonly label: string;
  readonly shortLabel: string;
  readonly color: string;
}[] = [
  {
    id: 252,
    kind: "grave_tyrant",
    editorGroup: "boss",
    label: "Grave Tyrant",
    shortLabel: "GT",
    color: "rgba(220,38,127,0.55)",
  },
  {
    id: 253,
    kind: "charging_tyrant",
    editorGroup: "boss",
    label: "Charging Tyrant (tank)",
    shortLabel: "TNK",
    color: "rgba(185,28,28,0.55)",
  },
  {
    id: 254,
    kind: "acid_flyer",
    editorGroup: "boss",
    label: "Acid Flyer",
    shortLabel: "ACD",
    color: "rgba(101,163,13,0.55)",
  },
  {
    id: 255,
    kind: "splitter_boss",
    editorGroup: "boss",
    label: "Splitter Boss",
    shortLabel: "SPL",
    color: "rgba(147,51,234,0.55)",
  },
  {
    id: 256,
    kind: "exploding_zombie",
    editorGroup: "zombies",
    label: "Exploding zombie",
    shortLabel: "BOOM",
    color: "rgba(245,158,11,0.5)",
  },
  {
    id: 257,
    kind: "leaping_zombie",
    editorGroup: "zombies",
    label: "Leaping zombie",
    shortLabel: "LEAP",
    color: "rgba(14,165,233,0.5)",
  },
];

const EXTENDED_SPAWN_TILE_TO_KIND: ReadonlyMap<number, ExtendedZombieSpawnFixtureKind> = new Map(
  EXTENDED_ZOMBIE_SPAWN_FIXTURES.map((e) => [e.id, e.kind]),
);

/** Tile ids 2–6 (standard) or fixed extended ids (see {@link EXTENDED_ZOMBIE_SPAWN_FIXTURES}). */
export function spawnTileIdToZombieFixtureKind(id: number): ZombieSpawnFixtureKind | null {
  const palette = spawnTileIdToZombieType(id);
  if (palette != null) {
    return palette;
  }
  const ext = EXTENDED_SPAWN_TILE_TO_KIND.get(id);
  return ext ?? null;
}

export function isZombieSpawnFixtureTile(id: number): boolean {
  return spawnTileIdToZombieFixtureKind(id) != null;
}

/** Milliseconds after a fixture zombie dies before respawning at the same tile (per palette type). */
export const ENEMY_SPAWN_RESPAWN_MS_BY_TYPE: Record<SpawnZombiePaletteType, number> = {
  regular: 180_000,
  fast: 120_000,
  big: 240_000,
  bat: 150_000,
  spitter: 200_000,
};

/** Standard palette zombies (2–6) plus fixed-tile extended enemies (see {@link EXTENDED_ZOMBIE_SPAWN_FIXTURES}). */
export type ZombieSpawnFixtureKind = SpawnZombiePaletteType | ExtendedZombieSpawnFixtureKind;

export const ZOMBIE_SPAWN_FIXTURE_RESPAWN_MS: Record<ZombieSpawnFixtureKind, number> = {
  ...ENEMY_SPAWN_RESPAWN_MS_BY_TYPE,
  grave_tyrant: 600_000,
  charging_tyrant: 600_000,
  acid_flyer: 480_000,
  splitter_boss: 600_000,
  exploding_zombie: 200_000,
  leaping_zombie: 160_000,
};

export function getZombieSpawnFixtureRespawnMs(kind: ZombieSpawnFixtureKind): number {
  return ZOMBIE_SPAWN_FIXTURE_RESPAWN_MS[kind];
}

export function getEnemySpawnRespawnMs(type: SpawnZombiePaletteType): number {
  return getZombieSpawnFixtureRespawnMs(type);
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

export function isNpcHealerDialogueSpawnTile(id: number): boolean {
  return id === NPC_HEALER_DIALOGUE_SPAWN_TILE_ID;
}

export function isNpcDialogueSpawnTile(id: number): boolean {
  return isNpcDialogueSurvivorSpawnTile(id) || isNpcHealerDialogueSpawnTile(id);
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

/**
 * Default respawn interval in whole seconds for editor display / server fallback (enemy + item fixtures only).
 */
export function getAuthoredSpawnerDefaultRespawnSec(spawnTileId: number): number | null {
  if (spawnTileId <= 0 || isPlayerSpawnTile(spawnTileId)) {
    return null;
  }
  const zKind = spawnTileIdToZombieFixtureKind(spawnTileId);
  if (zKind != null) {
    return Math.round(getZombieSpawnFixtureRespawnMs(zKind) / 1000);
  }
  if (isItemSpawnTile(spawnTileId)) {
    const t = spawnTileIdToItemFixtureType(spawnTileId);
    return t == null ? null : Math.round(getItemFixtureRespawnMs(t) / 1000);
  }
  return null;
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

const EXTENDED_ZOMBIE_SPAWN_PALETTE_ENTRIES: readonly SpawnPaletteEntry[] =
  EXTENDED_ZOMBIE_SPAWN_FIXTURES.map((e) => ({
    id: e.id,
    label: e.label,
    color: e.color,
  }));

const NPC_DIALOGUE_SURVIVOR_PALETTE_ENTRY: SpawnPaletteEntry = {
  id: NPC_DIALOGUE_SURVIVOR_SPAWN_TILE_ID,
  label: "Dialogue NPC",
  color: "rgba(52,211,153,0.55)",
};

const NPC_HEALER_DIALOGUE_PALETTE_ENTRY: SpawnPaletteEntry = {
  id: NPC_HEALER_DIALOGUE_SPAWN_TILE_ID,
  label: "Healer NPC",
  color: "rgba(56,189,248,0.55)",
};

/** Full spawns-layer palette: player, zombies, item fixtures, dialogue NPCs. */
export const SPAWN_PALETTE_ENTRIES: readonly SpawnPaletteEntry[] = [
  ...SPAWN_BASE_PALETTE_ENTRIES,
  ...EXTENDED_ZOMBIE_SPAWN_PALETTE_ENTRIES,
  ...ITEM_SPAWN_PALETTE_ENTRIES,
  NPC_DIALOGUE_SURVIVOR_PALETTE_ENTRY,
  NPC_HEALER_DIALOGUE_PALETTE_ENTRY,
];

/**
 * Spawner tiles editable from the map editor Spawner modal (player, zombies, item fixtures).
 * Excludes empty, dialogue NPCs, and the palette "None" entry.
 */
export const SPAWNER_META_CONFIGURABLE_ENTRIES: readonly SpawnPaletteEntry[] =
  SPAWN_PALETTE_ENTRIES.filter(
    (e) => e.id !== SPAWN_TILE_NONE && !isNpcDialogueSpawnTile(e.id),
  );

/**
 * Spawn-type groups for the editor spawner panel typeahead (fixtures are split by registration category).
 * Player spawn (tile id 1) is shown above these groups without a section header.
 */
export type SpawnerMetaTypeaheadGroupId =
  | "zombies"
  | "boss"
  | "weapons"
  | "ammo"
  | "crafting"
  | "items";

export const SPAWNER_META_TYPEAHEAD_GROUP_ORDER: readonly SpawnerMetaTypeaheadGroupId[] = [
  "zombies",
  "boss",
  "weapons",
  "ammo",
  "crafting",
  "items",
] as const;

export const SPAWNER_META_TYPEAHEAD_GROUP_LABEL: Record<SpawnerMetaTypeaheadGroupId, string> = {
  zombies: "Zombies",
  boss: "Boss",
  weapons: "Weapons",
  ammo: "Ammo",
  crafting: "Crafting",
  items: "Items",
};

function itemFixtureCategory(entityType: EntityType): EntityCategory | null {
  const reg = ENTITY_REGISTRATION_CONFIG.find((e) => e.type === entityType);
  return reg?.category ?? null;
}

/**
 * Classifies a spawns-layer tile for grouped typeahead UIs (editor).
 * Returns null for the player spawn tile — render that row separately (ungrouped).
 */
export function getSpawnerMetaTypeaheadGroupId(
  spawnTileId: number,
): SpawnerMetaTypeaheadGroupId | null {
  if (isPlayerSpawnTile(spawnTileId)) {
    return null;
  }
  if (isEnemySpawnTile(spawnTileId)) {
    return "zombies";
  }
  const ext = EXTENDED_ZOMBIE_SPAWN_FIXTURES.find((e) => e.id === spawnTileId);
  if (ext) {
    return ext.editorGroup;
  }
  if (isItemSpawnTile(spawnTileId)) {
    const t = spawnTileIdToItemFixtureType(spawnTileId);
    if (t) {
      if (CRAFT_RECIPE_COMPONENT_ENTITY_TYPES.has(t)) {
        return "crafting";
      }
      const cat = itemFixtureCategory(t);
      if (cat === "weapons") {
        return "weapons";
      }
      if (cat === "ammo") {
        return "ammo";
      }
    }
  }
  return "items";
}

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
  const extShort = EXTENDED_ZOMBIE_SPAWN_FIXTURES.find((e) => e.id === spawnTileId);
  if (extShort) return extShort.shortLabel;
  if (isNpcDialogueSurvivorSpawnTile(spawnTileId)) return "NPC";
  if (isNpcHealerDialogueSpawnTile(spawnTileId)) return "HEAL";
  return "?";
}
