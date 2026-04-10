import { Entity } from "@/entities/entity";
import { IGameManagers } from "@/managers/types";
import { type ZombieType } from "@/util/zombie-factory";
/**
 * Open-world fixture: spawns and respawns a zombie at a fixed tile (editor spawns layer or procedural picks).
 */
export declare class ZombieSpawnPoint extends Entity {
    private readonly zombieType;
    private readonly tileX;
    private readonly tileY;
    private readonly useAuthoredPlacementRules;
    private readonly respawnDelayMs;
    private activeZombieId;
    private respawnAtMs;
    constructor(gameManagers: IGameManagers, zombieType: ZombieType, tileX: number, tileY: number, useAuthoredPlacementRules: boolean, respawnIntervalMsOverride?: number);
    private getFixturePixelPosition;
    private placementAllowsSpawn;
    private trySpawnInitialZombie;
    private tick;
}
