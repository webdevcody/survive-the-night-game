import Collidable from "@/extensions/collidable";
import Destructible from "@/extensions/destructible";
import Movable from "@/extensions/movable";
import Positionable from "@/extensions/positionable";
import Updatable from "@/extensions/updatable";
import { IGameManagers } from "@/managers/types";
import { Entities } from "@/constants";
import { getConfig } from "@shared/config";
import { Direction, normalizeDirection } from "@/util/direction";
import { Entity } from "@/entities/entity";
import { normalizeVector, distance } from "@/util/physics";
import { IEntity } from "@/entities/types";
import Vector2 from "@/util/vector2";
import { Line, Rectangle } from "@/util/shape";
import { Player } from "@/entities/players/player";
import PoolManager from "@shared/util/pool-manager";

const MAX_TRAVEL_DISTANCE = getConfig().combat.TRAVEL_DISTANCE_MEDIUM;
export class Bullet extends Entity {
  private traveledDistance: number = 0;
  private static readonly BULLET_SPEED = getConfig().combat.BULLET_SPEED;
  private lastPosition: Vector2;
  private shooterId: number = 0;
  private damage: number;

  constructor(gameManagers: IGameManagers, damage: number = 1) {
    super(gameManagers, Entities.BULLET);
    this.damage = damage;

    this.addExtension(new Positionable(this));
    this.addExtension(new Movable(this).setHasFriction(false));
    this.addExtension(new Updatable(this, this.updateBullet.bind(this)));
    const poolManager = PoolManager.getInstance();
    this.addExtension(
      new Collidable(this).setSize(
        poolManager.vector2.claim(getConfig().combat.BULLET_SIZE, getConfig().combat.BULLET_SIZE)
      )
    );

    this.lastPosition = this.getPosition();
  }

  setShooterId(id: number) {
    this.shooterId = id;
  }

  getShooterId(): number {
    return this.shooterId;
  }

  setDirection(direction: Direction) {
    const poolManager = PoolManager.getInstance();
    const normalized = normalizeDirection(direction);
    this.getExt(Movable).setVelocity(
      poolManager.vector2.claim(
        normalized.x * Bullet.BULLET_SPEED,
        normalized.y * Bullet.BULLET_SPEED
      )
    );
  }

  setDirectionWithOffset(direction: Direction, offsetAngle: number) {
    const normalized = normalizeDirection(direction);

    // Convert offsetAngle from degrees to radians
    const radians = (offsetAngle * Math.PI) / 180;

    // Apply rotation to the normalized vector
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);

    const rotatedX = normalized.x * cos - normalized.y * sin;
    const rotatedY = normalized.x * sin + normalized.y * cos;

    // Normalize the rotated vector
    const length = Math.sqrt(rotatedX * rotatedX + rotatedY * rotatedY);

    const poolManager = PoolManager.getInstance();
    this.getExt(Movable).setVelocity(
      poolManager.vector2.claim(
        (rotatedX / length) * Bullet.BULLET_SPEED,
        (rotatedY / length) * Bullet.BULLET_SPEED
      )
    );
  }

  getHitbox(): Rectangle {
    return this.getExt(Collidable).getHitBox();
  }

  setDirectionFromVelocity(velocity: Vector2) {
    const poolManager = PoolManager.getInstance();
    if (velocity.x === 0 && velocity.y === 0) {
      // Default direction (right) if no velocity
      this.getExt(Movable).setVelocity(poolManager.vector2.claim(Bullet.BULLET_SPEED, 0));
      return;
    }

    const normalized = normalizeVector(velocity);
    this.getExt(Movable).setVelocity(
      poolManager.vector2.claim(
        normalized.x * Bullet.BULLET_SPEED,
        normalized.y * Bullet.BULLET_SPEED
      )
    );
  }

  /**
   * Set bullet direction from an angle in radians
   * @param angle Angle in radians (0 = right, PI/2 = down, PI = left, 3PI/2 = up)
   */
  setDirectionFromAngle(angle: number) {
    const poolManager = PoolManager.getInstance();
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);

    this.getExt(Movable).setVelocity(
      poolManager.vector2.claim(dirX * Bullet.BULLET_SPEED, dirY * Bullet.BULLET_SPEED)
    );
  }

  private updateBullet(deltaTime: number) {
    const currentPosition = this.getPosition();

    // Break down the movement into smaller steps to prevent tunneling
    const stepSize = getConfig().combat.PROJECTILE_STEP_SIZE;
    const numSteps = Math.ceil((Bullet.BULLET_SPEED * deltaTime) / stepSize);
    const stepDelta = deltaTime / numSteps;

    let lastStepPosition = currentPosition;
    let hitSomething = false;

    for (let i = 0; i < numSteps && !hitSomething; i++) {
      // Update position for this step
      this.updatePositions(stepDelta);
      const newStepPosition = this.getPosition();

      hitSomething = this.handleIntersections(lastStepPosition, newStepPosition);

      // Update for next step
      lastStepPosition = newStepPosition;
    }

    this.handleMaxDistanceLogic(currentPosition);
    this.lastPosition = this.getPosition();
  }

  private updatePositions(deltaTime: number) {
    const poolManager = PoolManager.getInstance();
    const movable = this.getExt(Movable);
    const velocity = movable.getVelocity();
    const positionable = this.getExt(Positionable);

    positionable.setPosition(
      poolManager.vector2.claim(
        positionable.getPosition().x + velocity.x * deltaTime,
        positionable.getPosition().y + velocity.y * deltaTime
      )
    );
  }

  private handleIntersections(fromPosition: Vector2, toPosition: Vector2): boolean {
    const poolManager = PoolManager.getInstance();
    // Convert corner positions to center positions for more accurate collision
    const bulletRadius = getConfig().combat.BULLET_SIZE / 2;
    const bulletCenterOffset = bulletRadius;

    const fromCenter = poolManager.vector2.claim(
      fromPosition.x + bulletCenterOffset,
      fromPosition.y + bulletCenterOffset
    );
    const toCenter = poolManager.vector2.claim(
      toPosition.x + bulletCenterOffset,
      toPosition.y + bulletCenterOffset
    );

    const bulletPath = poolManager.line.claim(fromCenter, toCenter);

    // Use game mode strategy to determine valid targets
    const strategy = this.getGameManagers().getGameServer().getGameLoop().getGameModeStrategy();
    const isValidTarget = (entity: IEntity) =>
      strategy.shouldDamageTarget(this, entity, this.shooterId);

    const targets = this.getEntityManager()
      .getNearbyIntersectingDestructableEntities(this)
      .filter(isValidTarget);

    // Sort targets by distance to bullet start position to ensure we hit the closest target first
    targets.sort((a, b) => {
      const distA = distance(fromCenter, a.getExt(Positionable).getPosition());
      const distB = distance(fromCenter, b.getExt(Positionable).getPosition());
      return distA - distB;
    });

    for (const target of targets) {
      const hitbox = target.getExt(Destructible).getDamageBox();
      let collision = false;

      // Expand the rectangle by the bullet's radius to account for the bullet's size
      const expandedPos = poolManager.vector2.claim(
        hitbox.position.x - bulletRadius,
        hitbox.position.y - bulletRadius
      );
      const expandedSize = poolManager.vector2.claim(
        hitbox.size.x + bulletRadius * 2,
        hitbox.size.y + bulletRadius * 2
      );
      const expandedRect = poolManager.rectangle.claim(expandedPos, expandedSize);
      poolManager.vector2.release(expandedPos);
      poolManager.vector2.release(expandedSize);

      // Check if either the bullet path intersects the expanded rectangle
      collision = bulletPath.intersects(expandedRect);
      poolManager.rectangle.release(expandedRect);

      // Additional check for edge case: if either endpoint is inside or very close to the rectangle
      if (!collision) {
        const isPointNearRect = (point: Vector2) => {
          const dx = Math.max(
            hitbox.position.x - point.x,
            0,
            point.x - (hitbox.position.x + hitbox.size.x)
          );
          const dy = Math.max(
            hitbox.position.y - point.y,
            0,
            point.y - (hitbox.position.y + hitbox.size.y)
          );
          return Math.sqrt(dx * dx + dy * dy) <= bulletRadius;
        };

        collision = isPointNearRect(fromCenter) || isPointNearRect(toCenter);
      }

      if (collision) {
        poolManager.line.release(bulletPath);
        poolManager.vector2.release(fromCenter);
        poolManager.vector2.release(toCenter);
        this.getEntityManager().markEntityForRemoval(this);
        const destructible = target.getExt(Destructible);
        const wasAlive = !destructible.isDead();
        destructible.damage(this.damage, this.shooterId);

        // If the target died from this hit, increment the shooter's kill count
        if (wasAlive && destructible.isDead()) {
          const shooter = this.getEntityManager().getEntityById(this.shooterId);
          if (shooter instanceof Player) {
            shooter.incrementKills();
          }
        }
        return true;
      }
    }

    poolManager.line.release(bulletPath);
    poolManager.vector2.release(fromCenter);
    poolManager.vector2.release(toCenter);
    return false;
  }

  private handleMaxDistanceLogic(lastPosition: Vector2) {
    this.traveledDistance += distance(lastPosition, this.getPosition());

    if (this.traveledDistance > MAX_TRAVEL_DISTANCE) {
      this.getEntityManager().markEntityForRemoval(this);
    }
  }

  getPosition(): Vector2 {
    return this.getExt(Positionable).getPosition();
  }

  setPosition(position: Vector2) {
    this.getExt(Positionable).setPosition(position);
  }

  getCenterPosition(): Vector2 {
    return this.getPosition();
  }

  getVelocity(): Vector2 {
    return this.getExt(Movable).getVelocity();
  }

  setVelocity(velocity: Vector2) {
    this.getExt(Movable).setVelocity(velocity);
  }
}
