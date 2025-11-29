import Positionable from "@/extensions/positionable";
import Destructible from "@/extensions/destructible";
import { Direction, normalizeDirection, angleToDirection } from "@/util/direction";
import { IEntity } from "../types";
import { IEntityManager, IGameManagers } from "@/managers/types";
import Vector2 from "@/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import Inventory from "@/extensions/inventory";
import Static from "@/extensions/static";
import { PlayerAttackedEvent } from "@shared/events/server-sent/events/player-attacked-event";
import { Player } from "@/entities/players/player";

export function knockBack(
  entityManager: IEntityManager,
  entity: IEntity,
  facing: Direction,
  distance: number
) {
  const isStatic = entity.hasExt(Static);

  if (isStatic) {
    return;
  }

  const positionable = entity.getExt(Positionable);
  const originalPosition = { ...positionable.getPosition() };
  const newPosition = { ...originalPosition };

  if (facing === Direction.Right) {
    newPosition.x += distance;
  } else if (facing === Direction.Left) {
    newPosition.x -= distance;
  } else if (facing === Direction.Up) {
    newPosition.y -= distance;
  } else if (facing === Direction.Down) {
    newPosition.y += distance;
  }

  const poolManager = PoolManager.getInstance();
  positionable.setPosition(poolManager.vector2.claim(newPosition.x, newPosition.y));

  if (entityManager.isColliding(entity)) {
    positionable.setPosition(poolManager.vector2.claim(originalPosition.x, originalPosition.y));
  }
}

/**
 * Attempts to consume one unit of ammo from the player's inventory.
 * Returns true if ammo was successfully consumed, false otherwise.
 */
export function consumeAmmo(inventory: Inventory, ammoType: string): boolean {
  // TODO: item? the item should never be undefined
  const ammoItem = inventory.getItems().find((item) => item?.itemType === ammoType);

  if (!ammoItem || !ammoItem.state?.count || ammoItem.state.count <= 0) {
    return false;
  }

  const ammoIndex = inventory.getItems().findIndex((item) => item?.itemType === ammoType);
  if (ammoIndex === -1) {
    // This shouldn't happen since we found ammoItem, but handle it gracefully
    return false;
  }

  inventory.updateItemState(ammoIndex, { count: ammoItem.state.count - 1 });

  if (ammoItem.state.count <= 0) {
    inventory.removeItem(ammoIndex);
  }

  return true;
}

/**
 * Calculate velocity vector from an aim angle (radians) and speed.
 * @param aimAngle Angle in radians (0 = right, PI/2 = down, PI = left, 3PI/2 = up)
 * @param speed The speed/magnitude of the velocity
 * @returns A new Vector2 representing the velocity
 */
export function calculateVelocityFromAngle(aimAngle: number, speed: number): Vector2 {
  const poolManager = PoolManager.getInstance();
  const dirX = Math.cos(aimAngle);
  const dirY = Math.sin(aimAngle);
  return poolManager.vector2.claim(dirX * speed, dirY * speed);
}

/**
 * Calculate velocity vector from a facing direction and speed.
 * @param facing The cardinal direction
 * @param speed The speed/magnitude of the velocity
 * @returns A new Vector2 representing the velocity
 */
export function calculateVelocityFromDirection(facing: Direction, speed: number): Vector2 {
  const poolManager = PoolManager.getInstance();
  const normalized = normalizeDirection(facing);
  return poolManager.vector2.claim(normalized.x * speed, normalized.y * speed);
}

/**
 * Calculate velocity vector from either an aim angle or facing direction.
 * Prefers aimAngle if provided, otherwise uses facing direction.
 * @param facing The cardinal direction (fallback)
 * @param speed The speed/magnitude of the velocity
 * @param aimAngle Optional angle in radians (preferred if provided)
 * @returns A new Vector2 representing the velocity
 */
export function calculateProjectileVelocity(
  facing: Direction,
  speed: number,
  aimAngle?: number
): Vector2 {
  if (aimAngle !== undefined) {
    return calculateVelocityFromAngle(aimAngle, speed);
  }
  return calculateVelocityFromDirection(facing, speed);
}

/**
 * Configuration for a melee attack
 */
export interface MeleeAttackConfig {
  /** The entity manager for finding nearby entities */
  entityManager: IEntityManager;
  /** The game managers for broadcasting events */
  gameManagers: IGameManagers;
  /** The attacker's ID */
  attackerId: number;
  /** The attacker's center position */
  position: Vector2;
  /** The facing direction (used if aimAngle is not provided) */
  facing: Direction;
  /** Optional aim angle in radians (preferred over facing if provided) */
  aimAngle?: number;
  /** The attack range in pixels */
  attackRange: number;
  /** The damage to deal */
  damage: number;
  /** Optional knockback distance */
  knockbackDistance?: number;
  /** The weapon key for the attack event (e.g., "knife") */
  weaponKey: string;
  /** Custom target filter function - return true if entity is a valid target */
  targetFilter: (entity: IEntity, attackerId: number) => boolean;
  /** Optional callback when a target is hit */
  onHit?: (target: IEntity, attacker: IEntity | null) => void;
}

/**
 * Get the attack direction from an aim angle or facing direction.
 * @param facing The facing direction (fallback)
 * @param aimAngle Optional aim angle in radians
 * @returns The attack direction
 */
export function getAttackDirection(facing: Direction, aimAngle?: number): Direction {
  if (aimAngle !== undefined && !isNaN(aimAngle)) {
    return angleToDirection(aimAngle);
  }
  return facing;
}

/**
 * Check if a target is in the attack direction from the attacker's position.
 * @param attackerPos The attacker's position
 * @param targetPos The target's position
 * @param attackDirection The direction of the attack
 * @returns true if the target is in the attack direction
 */
export function isTargetInDirection(
  attackerPos: Vector2,
  targetPos: Vector2,
  attackDirection: Direction
): boolean {
  const dx = targetPos.x - attackerPos.x;
  const dy = targetPos.y - attackerPos.y;

  switch (attackDirection) {
    case Direction.Right:
      return dx >= 0;
    case Direction.Left:
      return dx <= 0;
    case Direction.Up:
      return dy <= 0;
    case Direction.Down:
      return dy >= 0;
    default:
      return true;
  }
}

/**
 * Find the closest valid target for a melee attack.
 * @param config The melee attack configuration
 * @param attackDirection The attack direction
 * @returns The closest valid target, or null if none found
 */
export function findMeleeTarget(
  config: MeleeAttackConfig,
  attackDirection: Direction
): IEntity | null {
  const nearbyEntities = config.entityManager.getNearbyEntities(
    config.position,
    config.attackRange + 24
  );

  let closestTarget: IEntity | null = null;
  let closestDistance = Infinity;

  for (const entity of nearbyEntities) {
    // Must have Destructible extension
    if (!entity.hasExt(Destructible)) continue;

    // Must pass custom target filter
    if (!config.targetFilter(entity, config.attackerId)) continue;

    // Must not be dead
    const destructible = entity.getExt(Destructible);
    if (destructible.isDead()) continue;

    // Must have position
    if (!entity.hasExt(Positionable)) continue;

    const targetPos = entity.getExt(Positionable).getCenterPosition();
    const dx = targetPos.x - config.position.x;
    const dy = targetPos.y - config.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Must be within attack range
    if (distance > config.attackRange) continue;

    // Must be in attack direction
    if (!isTargetInDirection(config.position, targetPos, attackDirection)) continue;

    // Track closest target
    if (distance < closestDistance) {
      closestDistance = distance;
      closestTarget = entity;
    }
  }

  return closestTarget;
}

/**
 * Perform a melee attack with the given configuration.
 * Handles finding targets, dealing damage, knockback, kill tracking, and broadcasting events.
 * @param config The melee attack configuration
 * @returns true if a target was hit, false otherwise
 */
export function performMeleeAttack(config: MeleeAttackConfig): boolean {
  const attackDirection = getAttackDirection(config.facing, config.aimAngle);
  const target = findMeleeTarget(config, attackDirection);
  let hitTarget = false;

  if (target) {
    const destructible = target.getExt(Destructible);
    const wasAlive = !destructible.isDead();

    destructible.damage(config.damage, config.attackerId);

    // Apply knockback if configured
    if (config.knockbackDistance && config.knockbackDistance > 0) {
      knockBack(config.entityManager, target, attackDirection, config.knockbackDistance);
    }

    // Track kills if attacker is a player
    if (wasAlive && destructible.isDead()) {
      const attacker = config.entityManager.getEntityById(config.attackerId);
      if (attacker instanceof Player) {
        attacker.incrementKills();
      }
    }

    // Call optional onHit callback
    if (config.onHit) {
      const attacker = config.entityManager.getEntityById(config.attackerId);
      config.onHit(target, attacker);
    }

    hitTarget = true;
  }

  // Broadcast attack event
  config.gameManagers.getBroadcaster().broadcastEvent(
    new PlayerAttackedEvent({
      playerId: config.attackerId,
      weaponKey: config.weaponKey,
      attackDirection,
    })
  );

  return hitTarget;
}
