/**
 * Build spawn table dynamically from item, weapon, and resource registries
 * Items/weapons/resources with spawn.enabled === true will be included
 */
export declare function buildSpawnTable(): Array<{
    chance: number;
    entityType: string;
}>;
