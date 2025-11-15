import { EntityType } from "@/types/entity";

// Entities constant - auto-generated from all registries
// Auto-generation happens in entities/index.ts after all registries are populated
// This ensures adding a new item/weapon/etc. to configs automatically adds it here
// Starts empty and gets populated after registries initialize
export let Entities: Record<string, string> = {};

export function initializeEntities(entities: Record<string, string>): void {
  // Replace Entities with auto-generated version
  Entities = entities;
}

// Use string literals for NON_SPAWNABLE to avoid circular reference issues
export const NON_SPAWNABLE = new Set<EntityType>([
  "player",
  "bullet",
  "arrow",
  "boundary",
  "acid_projectile",
  "grenade_projectile",
  "flame_projectile",
  "merchant",
  "car",
]);

// Computed lazily to avoid circular reference during module initialization
export function getSpawableEntityTypes(): EntityType[] {
  return Object.values(Entities)
    .filter((entity) => !NON_SPAWNABLE.has(entity as any))
    .sort();
}

// For backwards compatibility - computed on first access
let _spawableEntityTypes: EntityType[] | null = null;

function getSpawableEntityTypesArray(): EntityType[] {
  if (!_spawableEntityTypes) {
    _spawableEntityTypes = getSpawableEntityTypes();
  }
  return _spawableEntityTypes;
}

// Proxy that properly handles all array operations for React
// This ensures the array is computed lazily but works correctly with React's iteration
export const SPAWNABLE_ENTITY_TYPES: EntityType[] = new Proxy([] as EntityType[], {
  get(target, prop) {
    const array = getSpawableEntityTypesArray();
    const value = (array as any)[prop];
    // If it's a function (like map, filter, etc.), bind it to the array
    if (typeof value === "function") {
      return value.bind(array);
    }
    return value;
  },
  ownKeys() {
    const array = getSpawableEntityTypesArray();
    return Reflect.ownKeys(array);
  },
  getOwnPropertyDescriptor(target, prop) {
    const array = getSpawableEntityTypesArray();
    return Reflect.getOwnPropertyDescriptor(array, prop);
  },
  has(target, prop) {
    const array = getSpawableEntityTypesArray();
    return Reflect.has(array, prop);
  },
  getPrototypeOf() {
    return Array.prototype;
  },
}) as EntityType[];

// Zombies array will be populated by zombie registry after initialization
// Import zombieRegistry where you need to access all zombie types
export let Zombies: EntityType[] = [];

// Entity type filter Sets for use with getNearbyEntities
// These Sets provide better performance than arrays for filtering
// Using string literals to avoid dependency on Entities being initialized

// Friendly entities that zombies target
export const FRIENDLY_TYPES = new Set<EntityType>(["car", "player", "survivor"]);

// Player entity type
export const PLAYER_TYPES = new Set<EntityType>(["player"]);

// Fire entity type
export const FIRE_TYPES = new Set<EntityType>(["fire"]);

// Attackable entities (walls, players, sentry guns, cars, survivors)
export const ATTACKABLE_TYPES = new Set<EntityType>([
  "wall",
  "player",
  "sentry_gun",
  "car",
  "survivor",
]);

// Get zombie types as a Set (computed from Zombies array)
export function getZombieTypesSet(): Set<EntityType> {
  return new Set<EntityType>(Zombies);
}
