import { BaseEnemy } from "../base-enemy";
import { IEntity } from "@/entities/types";
import { EntityType } from "@/types/entity";
import { Entities, ATTACKABLE_TYPES, FRIENDLY_TYPES } from "@/constants";
import Vector2 from "@/util/vector2";
import Positionable from "@/extensions/positionable";
import Destructible from "@/extensions/destructible";
import { MapManager } from "@/managers/map-manager";

export interface TargetResult {
  entity: IEntity;
  position: Vector2;
  distance: number;
}

/**
 * Centralized targeting system for enemy entities.
 * Uses spatial grid for efficient entity queries.
 */
export class TargetingSystem {
  /**
   * Finds the closest friendly entity (car, player, or survivor) within search radius.
   * Automatically filters out survivors in special biomes.
   */
  static findClosestFriendlyEntity(
    zombie: BaseEnemy,
    searchRadius: number = 500,
    filterTypes?: EntityType[]
  ): TargetResult | null {
    const zombiePos = zombie.getCenterPosition();
    const friendlyTypesSet = filterTypes ? new Set<EntityType>(filterTypes) : FRIENDLY_TYPES;

    // Use spatial grid to efficiently find nearby friendly entities
    const nearbyEntities = zombie
      .getEntityManager()
      .getNearbyEntities(zombiePos, searchRadius, friendlyTypesSet);

    let closestEntity: IEntity | null = null;
    let closestPosition: Vector2 | null = null;
    let closestDistance = Infinity;

    for (const entity of nearbyEntities) {
      if (!entity.hasExt(Positionable)) continue;

      // Skip survivors in special biomes (they are invincible there)
      if (entity.getType() === Entities.SURVIVOR) {
        const positionable = entity.getExt(Positionable);
        const entityCenterPos = positionable.getCenterPosition();
        const mapManager = zombie.getGameManagers().getMapManager() as MapManager;
        if (mapManager.isPositionInSpecialBiome(entityCenterPos)) {
          continue; // Skip this survivor - they're in a special biome and invincible
        }
      }

      const position = entity.getExt(Positionable).getCenterPosition();
      const distance = zombiePos.distance(position);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestEntity = entity;
        closestPosition = position;
      }
    }

    if (closestEntity && closestPosition) {
      return { entity: closestEntity, position: closestPosition, distance: closestDistance };
    }

    return null;
  }

  /**
   * Finds nearby entities that can be attacked (have Destructible extension).
   * Filters out survivors in special biomes and entities without Destructible.
   */
  static findNearbyAttackableEntities(zombie: BaseEnemy, searchRadius: number): TargetResult[] {
    const zombiePos = zombie.getCenterPosition();

    const nearbyEntities = zombie
      .getEntityManager()
      .getNearbyEntities(zombiePos, searchRadius, ATTACKABLE_TYPES);

    const results: TargetResult[] = [];

    for (const entity of nearbyEntities) {
      if (!entity.hasExt(Destructible) || !entity.hasExt(Positionable)) continue;

      const position = entity.getExt(Positionable).getCenterPosition();
      const distance = zombiePos.distance(position);

      results.push({ entity, position, distance });
    }

    return results;
  }

  /**
   * Finds the closest attackable entity within search radius.
   * Returns the closest entity, its position, and distance.
   */
  static findClosestAttackableEntity(zombie: BaseEnemy, searchRadius: number): TargetResult | null {
    const attackableEntities = this.findNearbyAttackableEntities(zombie, searchRadius);

    if (attackableEntities.length === 0) {
      return null;
    }

    // Find the closest one
    let closest = attackableEntities[0];
    for (const target of attackableEntities) {
      if (target.distance < closest.distance) {
        closest = target;
      }
    }

    return closest;
  }

  /**
   * Wrapper for getClosestAlivePlayer with optional radius check.
   * Returns the player entity, position, and distance if within radius.
   */
  static findClosestPlayer(zombie: BaseEnemy, searchRadius?: number): TargetResult | null {
    const player = zombie.getEntityManager().getClosestAlivePlayer(zombie);
    if (!player || !player.hasExt(Positionable)) {
      return null;
    }

    const zombiePos = zombie.getCenterPosition();
    const playerPos = player.getExt(Positionable).getCenterPosition();
    const distance = zombiePos.distance(playerPos);

    // If radius is specified, check if player is within range
    if (searchRadius !== undefined && distance > searchRadius) {
      return null;
    }

    return { entity: player, position: playerPos, distance };
  }
}
