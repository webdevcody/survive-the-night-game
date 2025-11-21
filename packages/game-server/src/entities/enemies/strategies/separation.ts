import { BaseEnemy } from "../base-enemy";
import Vector2 from "@/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import { getZombieTypesSet } from "@shared/constants";
import { normalizeVector } from "@/util/physics";
import Positionable from "@/extensions/positionable";
import Destructible from "@/extensions/destructible";

/**
 * Configuration for zombie separation behavior
 */
export const SEPARATION_CONFIG = {
  /**
   * Radius to check for nearby zombies (in pixels)
   */
  SEPARATION_RADIUS: 8,

  /**
   * Maximum strength of separation force
   */
  SEPARATION_STRENGTH: 200,

  /**
   * Weight of separation force relative to pathfinding velocity (0-1)
   * Higher values mean separation has more influence
   */
  SEPARATION_WEIGHT: 0.3,

  /**
   * Minimum distance before separation kicks in (in pixels)
   * Prevents jittery movement when zombies are far apart
   */
  MIN_SEPARATION_DISTANCE: 4,
} as const;

/**
 * Calculates separation force to push zombie away from nearby zombies.
 * Uses inverse distance weighting - closer zombies have stronger repulsion.
 *
 * @param zombie The zombie to calculate separation for
 * @returns Separation velocity vector (normalized direction * strength)
 */
export function calculateSeparationForce(zombie: BaseEnemy): Vector2 {
  const poolManager = PoolManager.getInstance();
  const zombiePos = zombie.getCenterPosition();
  const zombieTypesSet = getZombieTypesSet();

  // Find nearby zombies using spatial grid
  const nearbyZombies = zombie
    .getEntityManager()
    .getNearbyEntities(zombiePos, SEPARATION_CONFIG.SEPARATION_RADIUS, zombieTypesSet);

  // If no nearby zombies, return zero vector
  if (nearbyZombies.length === 0) {
    return poolManager.vector2.claim(0, 0);
  }

  let separationX = 0;
  let separationY = 0;
  let totalWeight = 0;

  for (const otherZombie of nearbyZombies) {
    // Skip self
    if (otherZombie === zombie) {
      continue;
    }

    // Skip dead zombies
    if (otherZombie.hasExt(Destructible) && otherZombie.getExt(Destructible).isDead()) {
      continue;
    }

    // Get other zombie's position
    if (!otherZombie.hasExt(Positionable)) {
      continue;
    }

    const otherPos = otherZombie.getExt(Positionable).getCenterPosition();
    const dx = zombiePos.x - otherPos.x;
    const dy = zombiePos.y - otherPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Skip if too far or too close (avoid division by zero)
    if (
      distance < SEPARATION_CONFIG.MIN_SEPARATION_DISTANCE ||
      distance > SEPARATION_CONFIG.SEPARATION_RADIUS
    ) {
      continue;
    }

    // Inverse distance weighting - closer zombies have stronger repulsion
    const weight = 1 / distance;
    const normalizedDx = dx / distance;
    const normalizedDy = dy / distance;

    separationX += normalizedDx * weight;
    separationY += normalizedDy * weight;
    totalWeight += weight;
  }

  // Normalize and scale by strength
  if (totalWeight > 0) {
    const magnitude = Math.sqrt(separationX * separationX + separationY * separationY);
    if (magnitude > 0) {
      const normalizedSeparation = normalizeVector(
        poolManager.vector2.claim(separationX, separationY)
      );
      const separationForce = poolManager.vector2.claim(
        normalizedSeparation.x * SEPARATION_CONFIG.SEPARATION_STRENGTH,
        normalizedSeparation.y * SEPARATION_CONFIG.SEPARATION_STRENGTH
      );
      poolManager.vector2.release(normalizedSeparation);
      return separationForce;
    }
  }

  return poolManager.vector2.claim(0, 0);
}

/**
 * Blends separation force with pathfinding velocity.
 *
 * @param pathfindingVelocity The velocity from pathfinding (towards target)
 * @param separationForce The separation force (away from nearby zombies)
 * @returns Blended velocity vector
 */
export function blendSeparationForce(
  pathfindingVelocity: Vector2,
  separationForce: Vector2
): Vector2 {
  const poolManager = PoolManager.getInstance();

  // Blend: (1 - weight) * pathfinding + weight * separation
  const pathWeight = 1 - SEPARATION_CONFIG.SEPARATION_WEIGHT;
  const blendedX =
    pathfindingVelocity.x * pathWeight + separationForce.x * SEPARATION_CONFIG.SEPARATION_WEIGHT;
  const blendedY =
    pathfindingVelocity.y * pathWeight + separationForce.y * SEPARATION_CONFIG.SEPARATION_WEIGHT;

  return poolManager.vector2.claim(blendedX, blendedY);
}
