import { BaseEnemy } from "../base-enemy";
import { IEntity } from "@/entities/types";
import { EntityType } from "@/types/entity";
import Vector2 from "@/util/vector2";
export interface TargetResult {
    entity: IEntity;
    position: Vector2;
    distance: number;
}
/**
 * Centralized targeting system for enemy entities.
 * Uses spatial grid for efficient entity queries.
 */
export declare class TargetingSystem {
    /**
     * Finds the closest friendly entity within search radius.
     * Filters entities by Groupable extension with "friendly" group.
     * This ensures only rescued survivors and other friendly entities are targeted.
     */
    static findClosestFriendlyEntity(zombie: BaseEnemy, searchRadius?: number, filterTypes?: EntityType[]): TargetResult | null;
    /**
     * Finds nearby entities that can be attacked (have Destructible extension).
     * Filters out survivors in special biomes and entities without Destructible.
     */
    static findNearbyAttackableEntities(zombie: BaseEnemy, searchRadius: number): TargetResult[];
    /**
     * Finds the closest attackable entity within search radius.
     * Returns the closest entity, its position, and distance.
     */
    static findClosestAttackableEntity(zombie: BaseEnemy, searchRadius: number): TargetResult | null;
    /**
     * Wrapper for getClosestAlivePlayer with optional radius check.
     * Returns the player entity, position, and distance if within radius.
     */
    static findClosestPlayer(zombie: BaseEnemy, searchRadius?: number): TargetResult | null;
}
