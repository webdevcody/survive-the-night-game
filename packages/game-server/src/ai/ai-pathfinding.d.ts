import { IGameManagers } from "@/managers/types";
import Vector2 from "@/util/vector2";
/**
 * AI pathfinding using ground + collidables from the map.
 */
export declare class AIPathfinder {
    private gameManagers;
    private readonly BIOME_SIZE;
    private readonly TILE_SIZE;
    constructor(gameManagers: IGameManagers);
    pathTowardsAvoidingToxic(start: Vector2, target: Vector2): Vector2 | null;
    isToxicPosition(_position: Vector2): boolean;
    getMapCenter(): Vector2;
    findNearestSafePosition(_currentPos: Vector2): Vector2 | null;
    pathTowardsSafety(_start: Vector2): Vector2 | null;
    pathThroughToxic(start: Vector2, target: Vector2): Vector2 | null;
}
