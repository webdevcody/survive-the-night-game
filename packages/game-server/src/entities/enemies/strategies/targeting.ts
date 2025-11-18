import { BaseEnemy } from "../base-enemy";
import { IEntity } from "@/entities/types";
import { EntityType } from "@/types/entity";
import { ATTACKABLE_TYPES, FRIENDLY_TYPES } from "@/constants";
import Vector2 from "@/util/vector2";
import Positionable from "@/extensions/positionable";
import Destructible from "@/extensions/destructible";
import Groupable from "@/extensions/groupable";

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
   * Finds the closest friendly entity within search radius.
   * Filters entities by Groupable extension with "friendly" group.
   * This ensures only rescued survivors and other friendly entities are targeted.
   */
  static findClosestFriendlyEntity(
    zombie: BaseEnemy,
    searchRadius: number = 500,
    filterTypes?: EntityType[]
  ): TargetResult | null {
    const zombiePos = zombie.getCenterPosition();
    // Use a broad filter for performance, then filter by group
    const typesSet = filterTypes ? new Set<EntityType>(filterTypes) : FRIENDLY_TYPES;

    // Use spatial grid to efficiently find nearby entities
    const nearbyEntities = zombie
      .getEntityManager()
      .getNearbyEntities(zombiePos, searchRadius, typesSet);

    let closestEntity: IEntity | null = null;
    let closestPosition: Vector2 | null = null;
    let closestDistance = Infinity;

    for (const entity of nearbyEntities) {
      if (!entity.hasExt(Positionable)) continue;

      // Filter by Groupable extension - only target entities in "friendly" group
      if (!entity.hasExt(Groupable) || entity.getExt(Groupable).getGroup() !== "friendly") {
        continue;
      }

      // Skip dead entities
      if (entity.hasExt(Destructible) && entity.getExt(Destructible).isDead()) {
        continue;
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

      // Skip dead entities
      if (entity.getExt(Destructible).isDead()) {
        continue;
      }

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
