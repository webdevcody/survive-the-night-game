import { zombieRegistry } from "./zombie-registry";
import { ZOMBIE_CONFIGS } from "./zombie-configs";
import { weaponRegistry } from "./weapon-registry";
import { WEAPON_CONFIGS } from "./weapon-configs";
import { itemRegistry } from "./item-registry";
import { ITEM_CONFIGS } from "./item-configs";
import { resourceRegistry } from "./resource-registry";
import { RESOURCE_CONFIGS } from "./resource-configs";
import { decalRegistry } from "./decal-registry";
import { DECAL_CONFIGS } from "./decal-configs";
import { projectileRegistry } from "./projectile-registry";
import { PROJECTILE_CONFIGS } from "./projectile-configs";
import { environmentRegistry } from "./environment-registry";
import { ENVIRONMENT_CONFIGS } from "./environment-configs";
import { characterRegistry } from "./character-registry";
import { CHARACTER_CONFIGS } from "./character-configs";
import { initializeEntities, Zombies } from "../constants";
import { generateEntities } from "../constants/entity-generator";
import { entityTypeRegistry } from "../util/entity-type-encoding";

// Export behavior configs for use by systems
export * from "./behavior-configs";

// Register all zombie configurations
Object.values(ZOMBIE_CONFIGS).forEach((config) => {
  zombieRegistry.register(config);
});

// Register all weapon configurations
Object.values(WEAPON_CONFIGS).forEach((config) => {
  weaponRegistry.register(config);
});

// Register all item configurations
Object.values(ITEM_CONFIGS).forEach((config) => {
  itemRegistry.register(config);
});

// Register all resource configurations
Object.values(RESOURCE_CONFIGS).forEach((config) => {
  resourceRegistry.register(config);
});

// Register all decal configurations
Object.values(DECAL_CONFIGS).forEach((config) => {
  decalRegistry.register(config);
});

// Register all projectile configurations
Object.values(PROJECTILE_CONFIGS).forEach((config) => {
  projectileRegistry.register(config);
});

// Register all environment configurations
Object.values(ENVIRONMENT_CONFIGS).forEach((config) => {
  environmentRegistry.register(config);
});

// Register all character configurations
Object.values(CHARACTER_CONFIGS).forEach((config) => {
  characterRegistry.register(config);
});

// Populate the Zombies array after registration
Zombies.length = 0; // Clear the array
Zombies.push(...zombieRegistry.getAllZombieTypes());

// Auto-generate Entities constant from all registries after they're all populated
// This ensures adding a new item/weapon/etc. to configs automatically adds it to Entities
const generatedEntities = generateEntities();
initializeEntities(generatedEntities);

// Initialize entity type registry for efficient serialization (1 byte per type)
entityTypeRegistry.initialize();

export * from "./zombie-registry";
export * from "./zombie-configs";
export * from "./weapon-registry";
export * from "./weapon-configs";
export * from "./item-registry";
export * from "./item-configs";
export * from "./resource-registry";
export * from "./resource-configs";
export * from "./decal-registry";
export * from "./decal-configs";
export * from "./projectile-registry";
export * from "./projectile-configs";
export * from "./environment-registry";
export * from "./environment-configs";
export * from "./character-registry";
export * from "./character-configs";
