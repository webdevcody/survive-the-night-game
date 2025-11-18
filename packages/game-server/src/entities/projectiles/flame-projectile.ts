import Collidable from "@/extensions/collidable";
import Destructible from "@/extensions/destructible";
import Ignitable from "@/extensions/ignitable";
import Groupable from "@/extensions/groupable";
import Movable from "@/extensions/movable";
import Positionable from "@/extensions/positionable";
import Updatable from "@/extensions/updatable";
import { IGameManagers } from "@/managers/types";
import { Entities } from "@/constants";
import { Direction, normalizeDirection } from "@/util/direction";
import { Entity } from "@/entities/entity";
import { distance } from "@/util/physics";
import { IEntity } from "@/entities/types";
import Vector2 from "@/util/vector2";
import { Line, Rectangle } from "@/util/shape";
import { Player } from "@/entities/players/player";
import PoolManager from "@shared/util/pool-manager";

// Random distance range for flame projectiles
const MIN_TRAVEL_DISTANCE = 100;
const MAX_TRAVEL_DISTANCE = 200;

const FLAME_SPREAD_ANGLE = 15;

export class FlameProjectile extends Entity {
  private traveledDistance: number = 0;
  private static readonly FLAME_SPEED = 200; // Slower than bullets
  private static get FLAME_SIZE(): Vector2 {
    return PoolManager.getInstance().vector2.claim(8, 8);
  }
  private lastPosition: Vector2;
  private shooterId: number = 0;
  private damage: number;
  private maxDistance: number; // Random max distance for this projectile

  constructor(gameManagers: IGameManagers, damage: number = 1) {
    super(gameManagers, Entities.FLAME_PROJECTILE);
    this.damage = damage;
    // Set random max distance for this projectile
    this.maxDistance =
      MIN_TRAVEL_DISTANCE + Math.random() * (MAX_TRAVEL_DISTANCE - MIN_TRAVEL_DISTANCE);

    const poolManager = PoolManager.getInstance();
    const flameSize = poolManager.vector2.claim(8, 8);
    this.addExtension(new Positionable(this).setSize(flameSize));
    this.addExtension(new Movable(this).setHasFriction(false));
    this.addExtension(new Updatable(this, this.updateFlame.bind(this)));
    this.addExtension(new Collidable(this).setSize(flameSize));

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

    // Add 5-degree spread (±2.5 degrees from center)
    const spreadAngle = (Math.random() - 0.5) * FLAME_SPREAD_ANGLE * (Math.PI / 180); // Convert to radians
    const cos = Math.cos(spreadAngle);
    const sin = Math.sin(spreadAngle);

    // Rotate the direction vector
    const rotatedX = normalized.x * cos - normalized.y * sin;
    const rotatedY = normalized.x * sin + normalized.y * cos;

    this.getExt(Movable).setVelocity(
      poolManager.vector2.claim(rotatedX * FlameProjectile.FLAME_SPEED, rotatedY * FlameProjectile.FLAME_SPEED)
    );
  }

  /**
   * Set flame direction from an angle in radians with random spread
   * @param angle Angle in radians (0 = right, PI/2 = down, PI = left, 3PI/2 = up)
   */
  setDirectionFromAngle(angle: number) {
    const poolManager = PoolManager.getInstance();
    // Add random spread (±7.5 degrees from center)
    const spreadAngle = (Math.random() - 0.5) * FLAME_SPREAD_ANGLE * (Math.PI / 180);
    const totalAngle = angle + spreadAngle;

    const dirX = Math.cos(totalAngle);
    const dirY = Math.sin(totalAngle);

    this.getExt(Movable).setVelocity(
      poolManager.vector2.claim(dirX * FlameProjectile.FLAME_SPEED, dirY * FlameProjectile.FLAME_SPEED)
    );
  }

  getHitbox(): Rectangle {
    return this.getExt(Collidable).getHitBox();
  }

  private updateFlame(deltaTime: number) {
    const currentPosition = this.getPosition();

    // Break down the movement into smaller steps to prevent tunneling
    const numSteps = Math.ceil((FlameProjectile.FLAME_SPEED * deltaTime) / 10);
    const stepDelta = deltaTime / numSteps;

    let lastStepPosition = currentPosition;
    let hitSomething = false;

    for (let i = 0; i < numSteps && !hitSomething; i++) {
      // Update position for this step
      this.updatePositions(stepDelta);
      const newStepPosition = this.getPosition();

      // Check for collisions with collidables (walls, trees, etc.)
      const collidingEntity = this.getEntityManager().isColliding(this, [
        Entities.PLAYER,
        Entities.FLAME_PROJECTILE,
      ]);
      if (collidingEntity && collidingEntity.getId() !== this.shooterId) {
        // Hit a collidable, spawn fire and destroy projectile
        this.spawnFireOnGround(newStepPosition);
        this.getEntityManager().markEntityForRemoval(this);
        hitSomething = true;
        break;
      }

      // Check for collisions with enemies
      hitSomething = this.handleIntersections(lastStepPosition, newStepPosition);

      // Update for next step
      lastStepPosition = newStepPosition;
    }

    if (!hitSomething) {
      this.handleMaxDistanceLogic(currentPosition);
    }
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
    const flameRadius = 4; // FLAME_SIZE.x / 2 = 8 / 2 = 4
    
    const fromCenter = poolManager.vector2.claim(
      fromPosition.x + flameRadius,
      fromPosition.y + flameRadius
    );
    const toCenter = poolManager.vector2.claim(
      toPosition.x + flameRadius,
      toPosition.y + flameRadius
    );

    const flamePath = poolManager.line.claim(fromCenter, toCenter);

    // Calculate a bounding box that encompasses the flame's path plus its size
    const minX = Math.min(fromCenter.x, toCenter.x) - flameRadius;
    const minY = Math.min(fromCenter.y, toCenter.y) - flameRadius;
    const maxX = Math.max(fromCenter.x, toCenter.x) + flameRadius;
    const maxY = Math.max(fromCenter.y, toCenter.y) + flameRadius;

    const boundingBoxPos = poolManager.vector2.claim(minX, minY);
    const boundingBoxSize = poolManager.vector2.claim(maxX - minX, maxY - minY);
    const boundingBox = poolManager.rectangle.claim(boundingBoxPos, boundingBoxSize);
    poolManager.vector2.release(boundingBoxPos);
    poolManager.vector2.release(boundingBoxSize);

    const isEnemy = (entity: IEntity) =>
      entity.hasExt(Groupable) && entity.getExt(Groupable).getGroup() === "enemy";

    const enemies = this.getEntityManager()
      .getNearbyIntersectingDestructableEntities(this)
      .filter(isEnemy);

    // Sort enemies by distance to flame start position to ensure we hit the closest enemy first
    enemies.sort((a, b) => {
      const distA = distance(fromCenter, a.getExt(Positionable).getPosition());
      const distB = distance(fromCenter, b.getExt(Positionable).getPosition());
      return distA - distB;
    });

    for (const enemy of enemies) {
      const hitbox = enemy.getExt(Destructible).getDamageBox();
      let collision = false;

      // Expand the rectangle by the flame's radius to account for the flame's size
      const expandedPos = poolManager.vector2.claim(
        hitbox.position.x - flameRadius,
        hitbox.position.y - flameRadius
      );
      const expandedSize = poolManager.vector2.claim(
        hitbox.size.x + flameRadius * 2,
        hitbox.size.y + flameRadius * 2
      );
      const expandedRect = poolManager.rectangle.claim(expandedPos, expandedSize);
      poolManager.vector2.release(expandedPos);
      poolManager.vector2.release(expandedSize);

      // Check if either the flame path intersects the expanded rectangle
      collision = flamePath.intersects(expandedRect);
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
          return Math.sqrt(dx * dx + dy * dy) <= flameRadius;
        };

        collision = isPointNearRect(fromCenter) || isPointNearRect(toCenter);
      }

      if (collision) {
        poolManager.line.release(flamePath);
        poolManager.rectangle.release(boundingBox);
        poolManager.vector2.release(fromCenter);
        poolManager.vector2.release(toCenter);
        // Spawn fire on ground where enemy was hit
        this.spawnFireOnGround(toCenter);
        this.getEntityManager().markEntityForRemoval(this);
        const destructible = enemy.getExt(Destructible);
        const wasAlive = !destructible.isDead();
        destructible.damage(this.damage);

        // Set enemy on fire
        if (!enemy.hasExt(Ignitable)) {
          enemy.addExtension(new Ignitable(enemy));
        }

        // If the enemy died from this hit, increment the shooter's kill count
        if (wasAlive && destructible.isDead()) {
          const shooter = this.getEntityManager().getEntityById(this.shooterId);
          if (shooter instanceof Player) {
            shooter.incrementKills();
          }
        }
        return true;
      }
    }

    poolManager.line.release(flamePath);
    poolManager.rectangle.release(boundingBox);
    poolManager.vector2.release(fromCenter);
    poolManager.vector2.release(toCenter);
    return false;
  }

  private handleMaxDistanceLogic(lastPosition: Vector2) {
    this.traveledDistance += distance(lastPosition, this.getPosition());

    if (this.traveledDistance > this.maxDistance) {
      // Reached max distance, spawn fire and destroy projectile
      this.spawnFireOnGround(this.getPosition());
      this.getEntityManager().markEntityForRemoval(this);
    }
  }

  private spawnFireOnGround(position: Vector2): void {
    const fire = this.getEntityManager().createEntity(Entities.FIRE);
    if (fire) {
      fire.getExt(Positionable).setPosition(position);
      this.getEntityManager().addEntity(fire);
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
