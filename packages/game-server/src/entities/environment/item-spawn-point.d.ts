import { Entity } from "@/entities/entity";
import { IGameManagers } from "@/managers/types";
import type { EntityType } from "@shared/types/entity";
/**
 * Authored map fixture: spawns and respawns a pickup item at a fixed tile (spawns layer tile ids from ITEM_SPAWN_TILE_ID_MIN).
 */
export declare class ItemSpawnPoint extends Entity {
    private readonly itemEntityType;
    private readonly tileX;
    private readonly tileY;
    private readonly useAuthoredPlacementRules;
    private readonly respawnDelayMs;
    private activeItemId;
    private respawnAtMs;
    constructor(gameManagers: IGameManagers, itemEntityType: EntityType, tileX: number, tileY: number, useAuthoredPlacementRules: boolean, respawnIntervalMsOverride?: number);
    private getFixturePixelPosition;
    private placementAllowsSpawn;
    private trySpawnInitialItem;
    private tick;
}
