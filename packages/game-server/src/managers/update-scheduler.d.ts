/**
 * ========================================================================
 * UPDATE SCHEDULER
 * ========================================================================
 * Manages tiered entity updates based on distance to players.
 * Reduces update frequency for entities far from players to improve performance.
 */
import { IEntity } from "@/entities/types";
import { Player } from "@/entities/players/player";
/**
 * Manages tiered entity updates based on distance to nearest player.
 * Entities are grouped into tiers and updated at different frequencies.
 */
export declare class UpdateScheduler {
    private entityStates;
    private currentFrame;
    private readonly tiers;
    /**
     * Projectile entity types that should always update (fast-moving, need frequent updates)
     */
    private readonly PROJECTILE_TYPES;
    /**
     * Advance the frame counter and update the scheduler
     */
    advanceFrame(): void;
    /**
     * Get the current frame number
     */
    getCurrentFrame(): number;
    /**
     * Register an entity with the scheduler
     */
    registerEntity(entity: IEntity): void;
    /**
     * Unregister an entity from the scheduler
     */
    unregisterEntity(entityId: number): void;
    /**
     * Check if an entity should be updated this frame
     */
    shouldUpdate(entity: IEntity, players: Player[]): boolean;
    /**
     * Check if an entity should always be updated regardless of distance
     */
    private shouldAlwaysUpdate;
    /**
     * Calculate which tier an entity belongs to based on distance to nearest player
     */
    private calculateTier;
    /**
     * Get the distance to the nearest alive player
     */
    private getDistanceToNearestPlayer;
    /**
     * Get the update interval for a given tier
     */
    private getUpdateInterval;
    /**
     * Clear all entity states (useful for cleanup or reset)
     */
    clear(): void;
}
