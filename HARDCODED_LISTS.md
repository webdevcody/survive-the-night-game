# Comprehensive Hard-Coded Lists and Enums in Survive the Night

This document catalogs ALL hard-coded arrays, objects, enums, and type definitions that contain item, weapon, entity, biome, or other game classification lists. These are the points where new content must be manually registered or updated.

## Core Type Definition Lists

### 1. WEAPON_TYPES (Type Union with Entities Constants)
**Location:** `packages/game-shared/src/types/weapons.ts:3-18`
**Type:** `const` object mapping to Entities constants
**Current Count:** 9 weapons
```typescript
export const WEAPON_TYPES = {
  KNIFE: Entities.KNIFE,
  BASEBALL_BAT: Entities.BASEBALL_BAT,
  SHOTGUN: Entities.SHOTGUN,
  PISTOL: Entities.PISTOL,
  GRENADE: Entities.GRENADE,
  BOLT_ACTION_RIFLE: Entities.BOLT_ACTION_RIFLE,
  AK47: Entities.AK47,
  GRENADE_LAUNCHER: Entities.GRENADE_LAUNCHER,
  FLAMETHROWER: Entities.FLAMETHROWER,
} as const;

export type WeaponType = (typeof WEAPON_TYPES)[keyof typeof WEAPON_TYPES];
export const WEAPON_TYPE_VALUES: WeaponType[] = Object.values(WEAPON_TYPES);
```
**Usage:** Weapon type validation and iteration
**Maintenance:** Must be updated when adding new weapons

### 2. ITEM_TYPES (Hardcoded Array)
**Location:** `packages/game-shared/src/util/inventory.ts:5-34`
**Type:** `const` tuple array
**Current Count:** 29 items
```typescript
export const ITEM_TYPES = [
  "knife", "baseball_bat", "shotgun", "pistol", "wood", "wall",
  "bandage", "cloth", "torch", "gasoline", "spikes", "pistol_ammo",
  "shotgun_ammo", "landmine", "grenade", "coin", "bolt_action_rifle",
  "ak47", "grenade_launcher", "bolt_action_ammo", "ak47_ammo",
  "grenade_launcher_ammo", "flamethrower", "flamethrower_ammo",
  "sentry_gun", "crate", "miners_hat", "bear_trap",
] as const;
export type ItemType = (typeof ITEM_TYPES)[number];
```
**Usage:** Type definition for inventory items
**Maintenance:** CRITICAL - Must be updated when adding items, weapons, or ammo

### 3. WeaponKey (Type Union for Weapons)
**Location:** `packages/game-shared/src/util/inventory.ts:42-51`
**Type:** Type union
**Current Count:** 9 weapons
```typescript
export type WeaponKey =
  | "knife"
  | "baseball_bat"
  | "shotgun"
  | "pistol"
  | "bolt_action_rifle"
  | "ak47"
  | "grenade"
  | "grenade_launcher"
  | "flamethrower";
```
**Usage:** Weapon selection in events
**Maintenance:** Must match weapon configs

### 4. RESOURCE_ITEMS_ARRAY (Resource Definition)
**Location:** `packages/game-shared/src/util/inventory.ts:58`
**Type:** `const` array with ResourceType derived type
**Current Count:** 2 resources
```typescript
const RESOURCE_ITEMS_ARRAY = ["wood", "cloth"] as const;
export type ResourceType = (typeof RESOURCE_ITEMS_ARRAY)[number];
export const RESOURCE_ITEMS: ReadonlySet<ItemType> = new Set(RESOURCE_ITEMS_ARRAY);
```
**Usage:** Identifying resources for resource bag vs inventory
**Maintenance:** Update when adding new resource types

---

## Configuration Objects (Data-Driven Lists)

### 5. WEAPON_CONFIGS (Record Object)
**Location:** `packages/game-shared/src/entities/weapon-configs.ts:4-170`
**Type:** `Record<string, WeaponConfig>`
**Current Count:** 9 weapons configured
**Weapons:**
- knife (melee)
- baseball_bat (melee)
- pistol (ranged)
- shotgun (ranged)
- bolt_action_rifle (ranged)
- ak47 (ranged)
- grenade_launcher (ranged)
- flamethrower (ranged)

**Usage:** Weapon stats, assets, sounds, spawn config
**Maintenance:** Add new weapons here

### 6. ZOMBIE_CONFIGS (Record Object)
**Location:** `packages/game-shared/src/entities/zombie-configs.ts:5-250`
**Type:** `Record<string, ZombieConfig>`
**Current Count:** 7 zombie variants
**Zombies:**
- zombie (melee, regular)
- big_zombie (melee, slow, tanky)
- fast_zombie (melee, fast, weak)
- exploding_zombie (explodes on death)
- bat_zombie (flying, melee)
- spitter_zombie (ranged, acid)
- leaping_zombie (melee, leaping attack)

**Usage:** Zombie stats, animations, AI strategies
**Maintenance:** Add new zombies here

### 7. ITEM_CONFIGS (Record Object)
**Location:** `packages/game-shared/src/entities/item-configs.ts:3-337`
**Type:** `Record<string, ItemConfig>`
**Current Count:** 26 items
**Categories:**
- Consumables: bandage, cloth, coin, miners_hat
- Ammo: pistol_ammo, shotgun_ammo, bolt_action_ammo, ak47_ammo, grenade_launcher_ammo, flamethrower_ammo
- Placeables: landmine, torch, gasoline, spikes, bear_trap, wall
- Throwables: grenade
- Structures: crate, sentry_gun, tree

**Usage:** Item spawn chance, merchant prices, recipes, asset definitions
**Maintenance:** Add items here with spawn/merchant/recipe configs

### 8. ENVIRONMENT_CONFIGS (Record Object)
**Location:** `packages/game-shared/src/entities/environment-configs.ts:3-97`
**Type:** `Record<string, EnvironmentConfig>`
**Current Count:** 9 environment entities
**Entities:**
- tree (resource)
- wood (resource)
- wall (structure)
- car (structure)
- merchant (obstacle)
- boundary (obstacle)
- fire (obstacle)
- campsite_fire (obstacle)

**Usage:** Environment asset definitions
**Maintenance:** Add environment entities here

### 9. CHARACTER_CONFIGS (Record Object)
**Location:** `packages/game-shared/src/entities/character-configs.ts:3-59`
**Type:** `Record<string, CharacterConfig>`
**Current Count:** 3 characters
**Characters:**
- player (player category)
- player_wdc (player category)
- survivor (npc category)

**Usage:** Player and NPC asset definitions
**Maintenance:** Add character variants here

### 10. PROJECTILE_CONFIGS (Record Object)
**Location:** `packages/game-shared/src/entities/projectile-configs.ts:3-44`
**Type:** `Record<string, ProjectileConfig>`
**Current Count:** 4 projectiles
**Projectiles:**
- bullet (bullet)
- acid_projectile (acid)
- grenade_projectile (explosive)
- flame_projectile (explosive)

**Usage:** Projectile asset definitions
**Maintenance:** Add projectiles here

### 11. DECAL_CONFIGS (Record Object)
**Location:** `packages/game-shared/src/entities/decal-configs.ts:3-86`
**Type:** `Record<string, DecalConfig>`
**Current Count:** 6 decals
**Decals:**
- flame (animated effect)
- fire (single effect)
- explosion (animated effect)
- swing (directional animation)
- zombie_swing (directional animation)
- spikes (structure decal)

**Usage:** Visual effect and animation definitions
**Maintenance:** Add decals here

---

## Enum Definitions

### 12. WaveState (Enum)
**Location:** `packages/game-shared/src/types/wave.ts:11-20`
**Type:** String enum
**Values:**
```typescript
export enum WaveState {
  PREPARATION = "PREPARATION",
  ACTIVE = "ACTIVE",
  COMPLETED = "COMPLETED",
}
```
**Usage:** Wave lifecycle management
**Maintenance:** Add new wave states here if game mechanics expand

### 13. RecipeType (Enum)
**Location:** `packages/game-shared/src/util/recipes.ts:6-12`
**Type:** String enum
**Current Count:** 5 recipe types
```typescript
export enum RecipeType {
  Bandage = "bandage",
  Wall = "wall",
  Spike = "spike",
  Torch = "torch",
  SentryGun = "sentry_gun",
}
```
**Usage:** Recipe type definition
**Maintenance:** Should extend with new recipes

### 14. Direction (Enum)
**Location:** `packages/game-shared/src/util/direction.ts:3-12`
**Type:** Numeric enum
**Current Count:** 8 directions
```typescript
export enum Direction {
  Down,
  DownLeft,
  DownRight,
  Left,
  Right,
  Up,
  UpLeft,
  UpRight,
}
```
**Usage:** Movement and animation direction
**Maintenance:** Static - unlikely to change

### 15. EntityCategories (Const Object - acts like enum)
**Location:** `packages/game-shared/src/entities/zombie-registry.ts:4-12`
**Type:** `const` object with `as const`
**Current Count:** 7 categories
```typescript
export const EntityCategories = {
  ZOMBIE: "zombie",
  PLAYER: "player",
  ITEM: "item",
  WEAPON: "weapon",
  PROJECTILE: "projectile",
  ENVIRONMENT: "environment",
  STRUCTURE: "structure",
} as const;
```
**Usage:** Entity categorization
**Maintenance:** Add new categories here for new entity types

---

## Entity Registration Functions

### 16. Server Entity Registration
**Location:** `packages/game-server/src/entities/register-custom-entities.ts:55-115`
**Type:** Function with ~40 `register()` calls
**Registrations:**
- 7 zombie types
- 4 projectile types
- 13 item types
- 6 ammo types
- 8 weapon types
- 5 environment types
- 1 player (special)

**Usage:** Maps entity type strings to class implementations
**Maintenance:** CRITICAL - Must register every new entity class

### 17. Client Entity Registration
**Location:** `packages/game-client/src/entities/register-custom-entities.ts:57-117`
**Type:** Function with ~40 `register()` calls (mirrors server)
**Usage:** Client-side entity class mappings
**Maintenance:** CRITICAL - Must match server registrations

---

## Entity Type Filter Sets

### 18. NON_SPAWNABLE Set
**Location:** `packages/game-shared/src/constants/index.ts:15-24`
**Type:** `Set<EntityType>`
**Current Count:** 8 entity types
```typescript
export const NON_SPAWNABLE = new Set<EntityType>([
  "player",
  "bullet",
  "boundary",
  "acid_projectile",
  "grenade_projectile",
  "flame_projectile",
  "merchant",
  "car",
]);
```
**Usage:** Filtering what can be randomly spawned
**Maintenance:** Update when adding new non-spawnable entities

### 19. FRIENDLY_TYPES Set
**Location:** `packages/game-shared/src/constants/index.ts:81`
**Type:** `Set<EntityType>`
**Current Count:** 3 entity types
```typescript
export const FRIENDLY_TYPES = new Set<EntityType>(["car", "player", "survivor"]);
```
**Usage:** Zombie targeting - identifies friendly entities
**Maintenance:** Update when adding new friendly entities

### 20. PLAYER_TYPES Set
**Location:** `packages/game-shared/src/constants/index.ts:84`
**Type:** `Set<EntityType>`
**Current Count:** 1 entity type
```typescript
export const PLAYER_TYPES = new Set<EntityType>(["player"]);
```
**Usage:** Player identification
**Maintenance:** Rarely changes

### 21. FIRE_TYPES Set
**Location:** `packages/game-shared/src/constants/index.ts:87`
**Type:** `Set<EntityType>`
**Current Count:** 1 entity type
```typescript
export const FIRE_TYPES = new Set<EntityType>(["fire"]);
```
**Usage:** Fire entity identification
**Maintenance:** Rarely changes

### 22. ATTACKABLE_TYPES Set
**Location:** `packages/game-shared/src/constants/index.ts:90-96`
**Type:** `Set<EntityType>`
**Current Count:** 5 entity types
```typescript
export const ATTACKABLE_TYPES = new Set<EntityType>([
  "wall",
  "player",
  "sentry_gun",
  "car",
  "survivor",
]);
```
**Usage:** Combat targeting - what zombies can attack
**Maintenance:** Update when adding new attackable structures/entities

---

## Biome Definitions

### 23. Biome Type Exports
**Location:** `packages/game-server/src/biomes/index.ts:1-12`
**Type:** Module exports
**Current Count:** 12 biome types
```typescript
export { CAMPSITE } from "./campsite";
export { CITY } from "./city";
export { DOCK } from "./dock";
export { FARM } from "./farm";
export { FOREST1 } from "./forest1";
export { FOREST2 } from "./forest2";
export { FOREST3 } from "./forest3";
export { FOREST4 } from "./forest4";
export { GAS_STATION } from "./gas-station";
export { MERCHANT } from "./merchant";
export { SHED } from "./shed";
export { WATER } from "./water";
```
**Usage:** Map generation and biome positioning
**Maintenance:** Add new biomes as separate files and export here

### 24. BiomeData (Map Positions)
**Location:** `packages/game-server/src/managers/map-manager.ts:133-141`
**Type:** Object with biome position mappings
**Current Count:** 7 special biome positions + merchant array
```typescript
biomePositions: {
  campsite: { x: centerBiomeX, y: centerBiomeY },
  farm: this.farmBiomePosition,
  gasStation: this.gasStationBiomePosition,
  city: this.cityBiomePosition,
  dock: this.dockBiomePosition,
  shed: this.shedBiomePosition,
  merchants: this.merchantBiomePositions,
}
```
**Usage:** Tracking special biome positions
**Maintenance:** Update when adding new biome types

---

## Network Compression Maps

### 25. PROPERTY_KEYS (Compression Mapping)
**Location:** `packages/game-shared/src/util/compression.ts:39-186`
**Type:** Array of property names
**Current Count:** 100+ property names
**Purpose:** Maps property names to single/double character codes for network compression

**Sample properties:**
- Core: id, type, extensions, resourceType
- Extensions: inventory, destructible, groupable, positionable, collidable, movable, etc.
- Entity properties: activeItem, input, facing, dx, dy, fire, drop, etc.
- Game state: entities, dayNumber, waveState, biomePositions, etc.

**Usage:** Network packet compression
**Maintenance:** Add new properties here when they're networked

### 26. STRING_VALUE_KEYS (String Compression Mapping)
**Location:** `packages/game-shared/src/util/compression.ts:189-284`
**Type:** Array of string values
**Current Count:** 100+ string values
**Purpose:** Maps entity/extension type strings to compression codes

**Sample values:**
- Extension types: inventory, destructible, positionable, collidable, etc.
- Entity types: zombie, player, item, weapon, bullet, tree, wall, etc.
- Zombie types: zombie, bat_zombie, big_zombie, fast_zombie, spitter_zombie, etc.
- Item types: knife, ak47, shotgun, pistol, etc.
- Biome types: ground, farm, gasStation, campsite, dock, shed, merchants

**Usage:** Network string value compression
**Maintenance:** Add new entity/extension type strings here

---

## Hardcoded String Comparisons (Type Checks)

### 27. Item Type Equality Checks (Multiple Files)
**Locations and patterns found:**
- `packages/game-server/src/entities/player.ts:499` - `currentItem.itemType === "wall"`
- `packages/game-server/src/entities/player.ts:690` - `activeItem?.itemType === "torch"`
- `packages/game-server/src/managers/server-socket-manager.ts:409-411` - Checks for "wall", "sentry_gun", "gasoline"
- `packages/game-client/src/entities/player.ts:334` - `item.itemType === "miners_hat"`
- `packages/game-client/src/entities/player.ts:379` - `this.activeItem.itemType === "knife"`
- `packages/game-client/src/managers/input.ts:114` - `item?.itemType === "bandage"`
- `packages/game-server/src/entities/items/grenade.ts:76` - `item.itemType === "grenade"`
- `packages/website/app/routes/play/components/CraftingPanel.tsx:206-208` - Checks for "wood" and "cloth"
- `packages/website/app/routes/play/components/CraftingPanel.tsx:230-231` - Checks for "wood" and "cloth"

**Type:** Direct string comparisons
**Issue:** Scattered across multiple files, hard to maintain
**Recommendation:** Use extension checks or config-based flags instead

---

## Summary by Category

### Data-Driven (Lower Maintenance)
1. WEAPON_CONFIGS - Add weapon stats/sprites here
2. ZOMBIE_CONFIGS - Add zombie variants here
3. ITEM_CONFIGS - Add items/ammo here
4. ENVIRONMENT_CONFIGS - Add environment entities here
5. CHARACTER_CONFIGS - Add character variants here
6. PROJECTILE_CONFIGS - Add projectiles here
7. DECAL_CONFIGS - Add visual effects here

### Type Definitions (Must Update for New Content)
8. WEAPON_TYPES - Enum-like object for weapons
9. ITEM_TYPES - Master type union for all inventory items
10. WeaponKey - Type union for weapons
11. RESOURCE_ITEMS_ARRAY - Resource type definitions
12. EntityCategories - Entity categorization
13. RecipeType - Enum for recipes
14. Direction - Directional enum
15. WaveState - Wave lifecycle enum

### Entity Registration (Critical - Easy to Forget)
16. Server registerCustomEntities() - Class -> type mapping (server)
17. Client registerCustomEntities() - Class -> type mapping (client)

### Entity Filtering (Used in AI/Combat Logic)
18. NON_SPAWNABLE - Entities that shouldn't spawn randomly
19. FRIENDLY_TYPES - Entities zombies target
20. PLAYER_TYPES - Player identification
21. FIRE_TYPES - Fire entity identification
22. ATTACKABLE_TYPES - Combat-relevant entities

### World Generation (Biome System)
23. Biome Exports - All biome type definitions
24. BiomeData Map - Special biome position tracking

### Network Compression
25. PROPERTY_KEYS - Property name compression codes
26. STRING_VALUE_KEYS - String value compression codes

### Code Smell (Scattered String Checks)
27. Hardcoded item type checks in multiple files

---

## Maintenance Checklist for Adding New Content

### New Weapon
- [ ] Add weapon config to WEAPON_CONFIGS
- [ ] Update WEAPON_TYPES enum/object if not auto-generated
- [ ] Add to server registerCustomEntities()
- [ ] Add to client registerCustomEntities()
- [ ] Add property names to PROPERTY_KEYS if networked
- [ ] Add string values to STRING_VALUE_KEYS if networked

### New Item
- [ ] Add item config to ITEM_CONFIGS
- [ ] Add to ITEM_TYPES array
- [ ] Consider: Add to RESOURCE_ITEMS_ARRAY if it's a resource
- [ ] Add to server registerCustomEntities()
- [ ] Add to client registerCustomEntities()
- [ ] Update ITEM_DROP_TABLE if loot table exists
- [ ] Update hardcoded type checks if item has special behavior

### New Zombie Variant
- [ ] Add zombie config to ZOMBIE_CONFIGS
- [ ] Check EntityCategories has ZOMBIE category
- [ ] Add to server registerCustomEntities()
- [ ] Add to client registerCustomEntities()
- [ ] Add string values to STRING_VALUE_KEYS
- [ ] Consider: Add to NON_SPAWNABLE if it shouldn't spawn naturally

### New Biome
- [ ] Create biome file: `packages/game-server/src/biomes/new-biome.ts`
- [ ] Export from `packages/game-server/src/biomes/index.ts`
- [ ] Add to map generation logic in MapManager
- [ ] Consider: Add biome position tracking to BiomeData map

### New Entity Type
- [ ] Add category to EntityCategories if new category
- [ ] Add config to appropriate registry (items/weapons/environment/etc)
- [ ] Add to server/client registerCustomEntities()
- [ ] Update entity filter sets (ATTACKABLE_TYPES, FRIENDLY_TYPES, etc.) if relevant
- [ ] Add string values to STRING_VALUE_KEYS
- [ ] Update type filter functions if needed

---

## Refactoring Opportunities

1. **Auto-generate ITEM_TYPES** from combined registries instead of manual array
2. **Auto-generate WEAPON_TYPES** from weaponRegistry
3. **Move RESOURCE_ITEMS_ARRAY to item configs** - Add `isResource: boolean` flag
4. **Move recipe definitions** to item/weapon configs (already partially done)
5. **Auto-register entities** using reflection or decorators instead of manual registration
6. **Replace string checks** with extension checks or config-based flags
7. **Generate filter sets from entity configs** - Add flags like `spawnable`, `friendly`, `attackable`
8. **Centralize biome definitions** - Consider registry pattern like items/weapons

