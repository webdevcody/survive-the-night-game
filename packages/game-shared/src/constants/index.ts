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
export const SPAWNABLE_ENTITY_TYPES: EntityType[] = new Proxy([] as EntityType[], {
  get(target, prop) {
    if (!_spawableEntityTypes) {
      _spawableEntityTypes = getSpawableEntityTypes();
    }
    return (_spawableEntityTypes as any)[prop];
  },
  ownKeys() {
    if (!_spawableEntityTypes) {
      _spawableEntityTypes = getSpawableEntityTypes();
    }
    return Object.keys(_spawableEntityTypes);
  },
}) as EntityType[];

// Zombies array will be populated by zombie registry after initialization
// Import zombieRegistry where you need to access all zombie types
export let Zombies: EntityType[] = [];
