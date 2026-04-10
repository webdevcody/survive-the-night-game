import { IGameManagers } from "@/managers/types";
import { BaseEnemy } from "@/entities/enemies/base-enemy";
import Vector2 from "@shared/util/vector2";
export type ZombieType = "regular" | "fast" | "big" | "bat" | "spitter";
export interface ZombieSpawnOptions {
    /** Position to spawn the zombie at */
    position?: Vector2 | {
        x: number;
        y: number;
    };
    /** Whether to add the zombie to the entity manager */
    addToManager?: boolean;
}
/**
 * Factory for creating zombies
 * Consolidates zombie creation logic to reduce duplication
 */
export declare class ZombieFactory {
    /**
     * Creates a zombie of the specified type
     */
    static createZombie(zombieType: ZombieType, gameManagers: IGameManagers, options?: ZombieSpawnOptions): BaseEnemy;
    /**
     * Creates and spawns a zombie at a location
     * Convenience method that combines creation, positioning, and registration
     */
    static spawnZombieAtLocation(zombieType: ZombieType, location: {
        x: number;
        y: number;
    }, gameManagers: IGameManagers): BaseEnemy;
}
