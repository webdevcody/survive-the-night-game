import { IGameManagers } from "@/managers/types";
import { Entities } from "@/constants";
import { getConfig } from "@shared/config";
import Vector2 from "@/util/vector2";
import { AttackStrategy, BaseEnemy, MovementStrategy } from "./base-enemy";
import { pathTowards, velocityTowards } from "@/util/physics";
import Positionable from "@/extensions/positionable";
import Movable from "@/extensions/movable";
import Destructible from "@/extensions/destructible";
import Snared from "@/extensions/snared";
import { ZombieAttackedEvent } from "@shared/events/server-sent/zombie-attacked-event";
import { Cooldown } from "@/entities/util/cooldown";
import { IEntity } from "@/entities/types";

export class IdleMovementStrategy implements MovementStrategy {
  private pathRecalculationTimer: number = 0;
  private static readonly PATH_RECALCULATION_INTERVAL = 1;
  private static readonly ACTIVATION_RADIUS = 100; // Pixels
  private currentWaypoint: Vector2 | null = null;
  private isActivated: boolean = false;

  update(zombie: BaseEnemy, deltaTime: number): boolean {
    // If zombie is snared, don't move
    if (zombie.hasExt(Snared)) {
      zombie.getExt(Movable).setVelocity(new Vector2(0, 0));
      return false;
    }

    const zombiePos = zombie.getCenterPosition();
    let targetPos: Vector2 | null = null;
    let distanceToTarget = Infinity;

    // First check for players to determine if zombie should activate
    const player = zombie.getEntityManager().getClosestAlivePlayer(zombie);
    let playerPos: Vector2 | null = null;
    let distanceToPlayer = Infinity;

    if (player) {
      playerPos = player.getExt(Positionable).getCenterPosition();
      distanceToPlayer = zombiePos.distance(playerPos);

      // Check if player is within activation radius
      if (distanceToPlayer <= IdleMovementStrategy.ACTIVATION_RADIUS) {
        this.isActivated = true;
      }
    }

    // If not activated yet, stay idle (don't target car)
    if (!this.isActivated) {
      zombie.getExt(Movable).setVelocity(new Vector2(0, 0));
      return false;
    }

    // Once activated, check for car
    const carEntities = zombie.getEntityManager().getEntities().filter(
      (entity) => entity.getType() === Entities.CAR
    );
    let carPos: Vector2 | null = null;
    let distanceToCar = Infinity;

    if (carEntities.length > 0 && carEntities[0].hasExt(Positionable)) {
      carPos = carEntities[0].getExt(Positionable).getCenterPosition();
      distanceToCar = zombiePos.distance(carPos);
    }

    // Prioritize car if it's closer, otherwise target player
    if (carPos && (!playerPos || distanceToCar <= distanceToPlayer)) {
      targetPos = carPos;
      distanceToTarget = distanceToCar;
    } else if (playerPos) {
      targetPos = playerPos;
      distanceToTarget = distanceToPlayer;
    }

    if (!targetPos) {
      // No target nearby, stay idle
      zombie.getExt(Movable).setVelocity(new Vector2(0, 0));
      return false;
    }

    // Once activated, behave like a normal zombie
    this.pathRecalculationTimer += deltaTime;

    // If we don't have a waypoint or we've reached the current one, get a new one
    const needNewWaypoint = !this.currentWaypoint || zombiePos.distance(this.currentWaypoint) <= 1;

    // Update path periodically or when we need a new waypoint
    if (
      needNewWaypoint ||
      this.pathRecalculationTimer >= IdleMovementStrategy.PATH_RECALCULATION_INTERVAL
    ) {
      const mapManager = zombie.getGameManagers().getMapManager();
      this.currentWaypoint = pathTowards(
        zombiePos,
        targetPos,
        mapManager.getGroundLayer(),
        mapManager.getCollidablesLayer()
      );
      this.pathRecalculationTimer = 0;
    }

    // If we have a waypoint, move towards it
    if (this.currentWaypoint) {
      const velocity = velocityTowards(zombiePos, this.currentWaypoint);
      zombie.getExt(Movable).setVelocity(velocity.mul(zombie.getSpeed()));
    } else {
      // If no waypoint found, stop moving
      zombie.getExt(Movable).setVelocity(new Vector2(0, 0));
    }

    return false; // Let base enemy handle collision movement
  }
}

export class MeleeMovementStrategy implements MovementStrategy {
  private pathRecalculationTimer: number = 0;
  private static readonly PATH_RECALCULATION_INTERVAL = 1;
  private currentWaypoint: Vector2 | null = null;

  update(zombie: BaseEnemy, deltaTime: number): boolean {
    // If zombie is snared, don't move
    if (zombie.hasExt(Snared)) {
      zombie.getExt(Movable).setVelocity(new Vector2(0, 0));
      return false;
    }

    this.pathRecalculationTimer += deltaTime;
    const zombiePos = zombie.getCenterPosition();
    let targetPos: Vector2 | null = null;

    // Check for car first
    const carEntities = zombie.getEntityManager().getEntities().filter(
      (entity) => entity.getType() === Entities.CAR
    );
    let carPos: Vector2 | null = null;
    let distanceToCar = Infinity;

    if (carEntities.length > 0 && carEntities[0].hasExt(Positionable)) {
      carPos = carEntities[0].getExt(Positionable).getCenterPosition();
      distanceToCar = zombiePos.distance(carPos);
    }

    // Then check for players
    const player = zombie.getEntityManager().getClosestAlivePlayer(zombie);
    let playerPos: Vector2 | null = null;
    let distanceToPlayer = Infinity;

    if (player) {
      playerPos = player.getExt(Positionable).getCenterPosition();
      distanceToPlayer = zombiePos.distance(playerPos);
    }

    // Prioritize car if it's closer, otherwise target player
    if (carPos && (!playerPos || distanceToCar <= distanceToPlayer)) {
      targetPos = carPos;
    } else if (playerPos) {
      targetPos = playerPos;
    }

    if (!targetPos) return false;

    // If we don't have a waypoint or we've reached the current one, get a new one
    const needNewWaypoint = !this.currentWaypoint || zombiePos.distance(this.currentWaypoint) <= 1;

    // Update path periodically or when we need a new waypoint
    if (
      needNewWaypoint ||
      this.pathRecalculationTimer >= MeleeMovementStrategy.PATH_RECALCULATION_INTERVAL
    ) {
      const mapManager = zombie.getGameManagers().getMapManager();
      this.currentWaypoint = pathTowards(
        zombiePos,
        targetPos,
        mapManager.getGroundLayer(),
        mapManager.getCollidablesLayer()
      );
      this.pathRecalculationTimer = 0;
    }

    // If we have a waypoint, move towards it
    if (this.currentWaypoint) {
      const velocity = velocityTowards(zombiePos, this.currentWaypoint);
      zombie.getExt(Movable).setVelocity(velocity.mul(zombie.getSpeed()));
    } else {
      // If no waypoint found, stop moving
      zombie.getExt(Movable).setVelocity(new Vector2(0, 0));
    }

    return false; // Let base enemy handle collision movement
  }
}

export class MeleeAttackStrategy implements AttackStrategy {
  onEntityDamaged?: (entity: IEntity) => void;

  /**
   * Calculate the shortest distance from a point to a rectangle (AABB)
   */
  private distanceToRect(point: Vector2, rectPos: Vector2, rectSize: Vector2): number {
    // Find the closest point on the rectangle to the given point
    const closestX = Math.max(rectPos.x, Math.min(point.x, rectPos.x + rectSize.x));
    const closestY = Math.max(rectPos.y, Math.min(point.y, rectPos.y + rectSize.y));

    // Calculate distance from point to closest point on rectangle
    const dx = point.x - closestX;
    const dy = point.y - closestY;

    return Math.sqrt(dx * dx + dy * dy);
  }

  update(zombie: BaseEnemy, _deltaTime: number): void {
    if (!zombie.getAttackCooldown().isReady()) return;

    const zombieCenter = zombie.getCenterPosition();
    const attackRadius = getConfig().combat.ZOMBIE_ATTACK_RADIUS;

    // Get all nearby entities that can be attacked
    // Use a larger search radius to account for rectangular hitboxes
    const searchRadius = attackRadius + 20; // Add buffer for rectangular entities
    const nearbyEntities = zombie
      .getEntityManager()
      .getNearbyEntities(zombieCenter, searchRadius, [
        Entities.WALL,
        Entities.PLAYER,
        Entities.SENTRY_GUN,
        Entities.CAR,
      ]);

    // Find the closest entity to attack using rectangle-to-point distance
    let closestEntity = null;
    let closestDistance = Infinity;

    for (const entity of nearbyEntities) {
      if (!entity.hasExt(Destructible) || !entity.hasExt(Positionable)) continue;

      const positionable = entity.getExt(Positionable);
      const entityPos = positionable.getPosition();
      const entitySize = positionable.getSize();

      // Use rectangle-to-point distance for better accuracy with rectangular hitboxes
      const distance = this.distanceToRect(zombieCenter, entityPos, entitySize);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestEntity = entity;
      }
    }

    // Attack the closest entity if within range
    if (
      closestEntity &&
      closestEntity.hasExt(Destructible) &&
      closestDistance <= getConfig().combat.ZOMBIE_ATTACK_RADIUS
    ) {
      closestEntity.getExt(Destructible).damage(zombie.getAttackDamage());

      // Call the damage hook if provided
      if (this.onEntityDamaged) {
        this.onEntityDamaged(closestEntity);
      }

      zombie
        .getGameManagers()
        .getBroadcaster()
        .broadcastEvent(new ZombieAttackedEvent(zombie.getId()));
      zombie.getAttackCooldown().reset();
    }
  }
}

export class Zombie extends BaseEnemy {
  constructor(gameManagers: IGameManagers, isIdle: boolean = false) {
    super(gameManagers, Entities.ZOMBIE);

    // Use IdleMovementStrategy for idle zombies, otherwise use normal MeleeMovementStrategy
    if (isIdle) {
      this.setMovementStrategy(new IdleMovementStrategy());
    } else {
      this.setMovementStrategy(new MeleeMovementStrategy());
    }

    this.setAttackStrategy(new MeleeAttackStrategy());
  }

  getAttackCooldown(): Cooldown {
    return this.attackCooldown;
  }

  getAttackDamage(): number {
    return this.attackDamage;
  }
}
