import { itemRegistry, weaponRegistry, resourceRegistry } from "@shared/entities";

/**
 * Build spawn table dynamically from item, weapon, and resource registries
 * Items/weapons/resources with spawn.enabled === true will be included
 */
export function buildSpawnTable(): Array<{ chance: number; entityType: string }> {
  const spawnTable: Array<{ chance: number; entityType: string }> = [];

  // Add items with spawn enabled
  itemRegistry.getAll().forEach((itemConfig) => {
    if (itemConfig.spawn?.enabled) {
      // Map item ID to EntityType (most match directly)
      const entityType = itemConfig.id;

      spawnTable.push({
        chance: itemConfig.spawn.chance,
        entityType,
      });
    }
  });

  // Add weapons with spawn enabled
  weaponRegistry.getAll().forEach((weaponConfig) => {
    if (weaponConfig.spawn?.enabled) {
      spawnTable.push({
        chance: weaponConfig.spawn.chance,
        entityType: weaponConfig.id,
      });
    }
  });

  // Add resources with spawn enabled
  resourceRegistry.getAll().forEach((resourceConfig) => {
    if (resourceConfig.spawn?.enabled) {
      spawnTable.push({
        chance: resourceConfig.spawn.chance,
        entityType: resourceConfig.id,
      });
    }
  });

  return spawnTable;
}
