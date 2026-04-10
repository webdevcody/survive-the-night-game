import { itemRegistry, weaponRegistry, resourceRegistry } from "@shared/entities";
/**
 * Build spawn table dynamically from item, weapon, and resource registries
 * Items/weapons/resources with spawn.enabled === true will be included
 */
export function buildSpawnTable() {
    const spawnTable = [];
    // Add items with spawn enabled
    itemRegistry.getAll().forEach((itemConfig) => {
        var _a;
        if ((_a = itemConfig.spawn) === null || _a === void 0 ? void 0 : _a.enabled) {
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
        var _a;
        if ((_a = weaponConfig.spawn) === null || _a === void 0 ? void 0 : _a.enabled) {
            spawnTable.push({
                chance: weaponConfig.spawn.chance,
                entityType: weaponConfig.id,
            });
        }
    });
    // Add resources with spawn enabled
    resourceRegistry.getAll().forEach((resourceConfig) => {
        var _a;
        if ((_a = resourceConfig.spawn) === null || _a === void 0 ? void 0 : _a.enabled) {
            spawnTable.push({
                chance: resourceConfig.spawn.chance,
                entityType: resourceConfig.id,
            });
        }
    });
    return spawnTable;
}
