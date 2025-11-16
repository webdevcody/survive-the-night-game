/**
 * ========================================================================
 * UPDATE SCHEDULER
 * ========================================================================
 * Manages tiered entity updates based on distance to players.
 * Reduces update frequency for entities far from players to improve performance.
 */

import { IEntity } from "@/entities/types";
import { Entity } from "@/entities/entity";
import { Player } from "@/entities/player";
import Positionable from "@/extensions/positionable";
import { getConfig } from "@shared/config";
import { Entities } from "@/constants";
import { EntityType } from "@shared/types/entity";
import { distance } from "@/util/physics";
import Vector2 from "@/util/vector2";

/**
 * Update tier for an entity
 */
enum UpdateTier {
  TIER_1 = 1, // Active range (0-500px)
  TIER_2 = 2, // Medium range (500-1000px)
  TIER_3 = 3, // Far range (1000+px)
  ALWAYS_UPDATE = 0, // Always update (players, projectiles, entities without positions)
}

/**
 * Entity update state tracked by the scheduler
 */
interface EntityUpdateState {
  tier: UpdateTier;
  lastUpdateFrame: number;
  lastTierRecalculationFrame: number;
}

/**
 * Manages tiered entity updates based on distance to nearest player.
 * Entities are grouped into tiers and updated at different frequencies.
 */
export class UpdateScheduler {
  private entityStates: Map<number, EntityUpdateState> = new Map();
  private currentFrame: number = 0;
  private readonly tiers = getConfig().simulation.UPDATE_TIERS;

  /**
   * Projectile entity types that should always update (fast-moving, need frequent updates)
   */
  private readonly PROJECTILE_TYPES: Set<EntityType> = new Set([
    "bullet",
    "acid_projectile",
    "grenade_projectile",
    "flame_projectile",
  ]);

  /**
   * Advance the frame counter and update the scheduler
   */
  public advanceFrame(): void {
    this.currentFrame++;
  }

  /**
   * Get the current frame number
   */
  public getCurrentFrame(): number {
    return this.currentFrame;
  }

  /**
   * Register an entity with the scheduler
   */
  public registerEntity(entity: IEntity): void {
    const entityId = entity.getId();
    if (!this.entityStates.has(entityId)) {
      // Initialize with always-update tier, will be recalculated on first update
      this.entityStates.set(entityId, {
        tier: UpdateTier.ALWAYS_UPDATE,
        lastUpdateFrame: -1,
        lastTierRecalculationFrame: -1,
      });
    }
  }

  /**
   * Unregister an entity from the scheduler
   */
  public unregisterEntity(entityId: number): void {
    this.entityStates.delete(entityId);
  }

  /**
   * Check if an entity should be updated this frame
   */
  public shouldUpdate(entity: IEntity, players: Player[]): boolean {
    // If tiered updates are disabled, always update
    if (!this.tiers.ENABLED) {
      return true;
    }

    const entityId = entity.getId();
    let state = this.entityStates.get(entityId);

    // Register entity if not already registered
    if (!state) {
      this.registerEntity(entity);
      state = this.entityStates.get(entityId)!;
    }

    // Always update certain entity types
    if (this.shouldAlwaysUpdate(entity)) {
      state.tier = UpdateTier.ALWAYS_UPDATE;
      state.lastUpdateFrame = this.currentFrame;
      return true;
    }

    // Recalculate tier if needed
    const needsTierRecalculation =
      this.currentFrame - state.lastTierRecalculationFrame >=
      this.tiers.TIER_RECALCULATION_INTERVAL;

    if (needsTierRecalculation) {
      state.tier = this.calculateTier(entity, players);
      state.lastTierRecalculationFrame = this.currentFrame;
    }

    // Check if entity should update based on its tier
    const updateInterval = this.getUpdateInterval(state.tier);
    const framesSinceLastUpdate = this.currentFrame - state.lastUpdateFrame;

    if (framesSinceLastUpdate >= updateInterval) {
      state.lastUpdateFrame = this.currentFrame;
      return true;
    }

    return false;
  }

  /**
   * Check if an entity should always be updated regardless of distance
   */
  private shouldAlwaysUpdate(entity: IEntity): boolean {
    const entityType = entity.getType();

    // Always update players
    if (entityType === Entities.PLAYER) {
      return true;
    }

    // Always update projectiles (fast-moving, need frequent updates)
    if (this.PROJECTILE_TYPES.has(entityType)) {
      return true;
    }

    // Always update entities without positions (can't calculate distance)
    if (!entity.hasExt(Positionable)) {
      return true;
    }

    return false;
  }

  /**
   * Calculate which tier an entity belongs to based on distance to nearest player
   */
  private calculateTier(entity: IEntity, players: Player[]): UpdateTier {
    // If no players, default to tier 3 (lowest priority)
    if (players.length === 0) {
      return UpdateTier.TIER_3;
    }

    // Entity must have position to calculate distance
    if (!entity.hasExt(Positionable)) {
      return UpdateTier.ALWAYS_UPDATE;
    }

    const entityPos = entity.getExt(Positionable).getCenterPosition();
    const nearestPlayerDistance = this.getDistanceToNearestPlayer(entityPos, players);

    // Determine tier based on distance
    if (nearestPlayerDistance <= this.tiers.TIER_1.MAX_RANGE) {
      return UpdateTier.TIER_1;
    } else if (nearestPlayerDistance <= this.tiers.TIER_2.MAX_RANGE) {
      return UpdateTier.TIER_2;
    } else {
      return UpdateTier.TIER_3;
    }
  }

  /**
   * Get the distance to the nearest alive player
   */
  private getDistanceToNearestPlayer(entityPos: Vector2, players: Player[]): number {
    let minDistance = Infinity;

    for (const player of players) {
      if (player.isDead()) continue;
      if (!player.hasExt(Positionable)) continue;

      const playerPos = player.getExt(Positionable).getCenterPosition();
      const dist = distance(entityPos, playerPos);

      if (dist < minDistance) {
        minDistance = dist;
      }
    }

    return minDistance === Infinity ? this.tiers.TIER_3.MAX_RANGE : minDistance;
  }

  /**
   * Get the update interval for a given tier
   */
  private getUpdateInterval(tier: UpdateTier): number {
    switch (tier) {
      case UpdateTier.ALWAYS_UPDATE:
      case UpdateTier.TIER_1:
        return this.tiers.TIER_1.UPDATE_INTERVAL;
      case UpdateTier.TIER_2:
        return this.tiers.TIER_2.UPDATE_INTERVAL;
      case UpdateTier.TIER_3:
        return this.tiers.TIER_3.UPDATE_INTERVAL;
      default:
        return 1;
    }
  }

  /**
   * Clear all entity states (useful for cleanup or reset)
   */
  public clear(): void {
    this.entityStates.clear();
    this.currentFrame = 0;
  }
}
