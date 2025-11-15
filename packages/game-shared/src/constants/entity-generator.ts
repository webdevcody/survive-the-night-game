// Import registries directly to avoid circular dependency with Entities constant
import { itemRegistry } from "../entities/item-registry";
import { weaponRegistry } from "../entities/weapon-registry";
import { resourceRegistry } from "../entities/resource-registry";
import { zombieRegistry } from "../entities/zombie-registry";
import { projectileRegistry } from "../entities/projectile-registry";
import { environmentRegistry } from "../entities/environment-registry";
import { characterRegistry } from "../entities/character-registry";

/**
 * Auto-generates the Entities constant from all registries
 * This ensures that adding a new item/weapon/etc. to configs automatically
 * adds it to the Entities constant without manual updates
 */
export function generateEntities() {
  const entities: Record<string, string> = {};

  // Add all items
  itemRegistry.getAll().forEach((config) => {
    if (!config || !config.id) {
      console.warn("Item config missing or invalid:", config);
      return;
    }
    const key = config.id.toUpperCase().replace(/-/g, "_");
    entities[key] = config.id;
  });

  // Add all weapons
  weaponRegistry.getAll().forEach((config) => {
    if (!config || !config.id) {
      console.warn("Weapon config missing or invalid:", config);
      return;
    }
    const key = config.id.toUpperCase().replace(/-/g, "_");
    entities[key] = config.id;
  });

  // Add all resources
  resourceRegistry.getAll().forEach((config) => {
    if (!config || !config.id) {
      console.warn("Resource config missing or invalid:", config);
      return;
    }
    const key = config.id.toUpperCase().replace(/-/g, "_");
    entities[key] = config.id;
  });

  // Add all zombies
  zombieRegistry.getAll().forEach((config) => {
    if (!config || !config.id) {
      console.warn("Zombie config missing or invalid:", config);
      return;
    }
    const key = config.id.toUpperCase().replace(/-/g, "_");
    entities[key] = config.id;
  });

  // Add all projectiles
  projectileRegistry.getAll().forEach((config) => {
    if (!config || !config.id) {
      console.warn("Projectile config missing or invalid:", config);
      return;
    }
    const key = config.id.toUpperCase().replace(/-/g, "_");
    entities[key] = config.id;
  });

  // Add all environment entities
  environmentRegistry.getAll().forEach((config) => {
    if (!config || !config.id) {
      console.warn("Environment config missing or invalid:", config);
      return;
    }
    const key = config.id.toUpperCase().replace(/-/g, "_");
    entities[key] = config.id;
  });

  // Add all characters
  characterRegistry.getAll().forEach((config) => {
    if (!config || !config.id) {
      console.warn("Character config missing or invalid:", config);
      return;
    }
    const key = config.id.toUpperCase().replace(/-/g, "_");
    entities[key] = config.id;
  });

  // Add special entities that aren't in registries
  entities["PLAYER"] = "player";
  entities["BOUNDARY"] = "boundary";

  return entities;
}

/**
 * Converts entity ID to constant name
 * e.g., "pistol_ammo" -> "PISTOL_AMMO"
 */
export function entityIdToConstantName(id: string): string {
  return id.toUpperCase().replace(/-/g, "_");
}
