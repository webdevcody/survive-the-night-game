import Collidable from "@/extensions/collidable";
import Destructible from "@/extensions/destructible";
import Inventory from "@/extensions/inventory";
import Movable from "@/extensions/movable";
import Positionable from "@/extensions/positionable";
import Updatable from "@/extensions/updatable";
import Carryable from "@/extensions/carryable";
import { IGameManagers } from "@/managers/types";
import { getConfig } from "@shared/config";
import { Direction, normalizeDirection } from "@/util/direction";
import { Entity } from "@/entities/entity";
import { normalizeVector, distance } from "@/util/physics";
import { IEntity } from "@/entities/types";
import Vector2 from "@/util/vector2";
import { Rectangle } from "@/util/shape";
import { Player } from "@/entities/players/player";
import { Car } from "@/entities/environment/car";
import PoolManager from "@shared/util/pool-manager";
import { Entities } from "@/constants";

const MAX_TRAVEL_DISTANCE = getConfig().combat.TRAVEL_DISTANCE_SHORT;

export class ThrowingKnifeProjectile extends Entity {
  private traveledDistance: number = 0;
  private static readonly KNIFE_SPEED = getConfig().combat.PROJECTILE_SPEED_STANDARD;
  private lastPosition: Vector2;
  private shooterId: number = 0;

  constructor(gameManagers: IGameManagers) {
    super(gameManagers, Entities.THROWING_KNIFE_PROJECTILE);

    const poolManager = PoolManager.getInstance();
    const bulletSize = getConfig().combat.BULLET_SIZE;
    const bulletRadius = bulletSize / 2;
    this.addExtension(new Positionable(this));
    this.addExtension(new Movable(this).setHasFriction(false));
    this.addExtension(new Updatable(this, this.updateKnife.bind(this)));
    this.addExtension(
      new Collidable(this)
        .setSize(poolManager.vector2.claim(bulletSize, bulletSize))
        .setOffset(poolManager.vector2.claim(-bulletRadius, -bulletRadius))
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
        normalized.x * ThrowingKnifeProjectile.KNIFE_SPEED,
        normalized.y * ThrowingKnifeProjectile.KNIFE_SPEED
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
        (rotatedX / length) * ThrowingKnifeProjectile.KNIFE_SPEED,
        (rotatedY / length) * ThrowingKnifeProjectile.KNIFE_SPEED
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
      this.getExt(Movable).setVelocity(
        poolManager.vector2.claim(ThrowingKnifeProjectile.KNIFE_SPEED, 0)
      );
      return;
    }

    const normalized = normalizeVector(velocity);
    this.getExt(Movable).setVelocity(
      poolManager.vector2.claim(
        normalized.x * ThrowingKnifeProjectile.KNIFE_SPEED,
        normalized.y * ThrowingKnifeProjectile.KNIFE_SPEED
      )
    );
  }

  /**
   * Set knife direction from an angle in radians
   * @param angle Angle in radians (0 = right, PI/2 = down, PI = left, 3PI/2 = up)
   */
  setDirectionFromAngle(angle: number) {
    const poolManager = PoolManager.getInstance();
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);

    this.getExt(Movable).setVelocity(
      poolManager.vector2.claim(
        dirX * ThrowingKnifeProjectile.KNIFE_SPEED,
        dirY * ThrowingKnifeProjectile.KNIFE_SPEED
      )
    );
  }

  private updateKnife(deltaTime: number) {
    const currentPosition = this.getPosition();

    // Break down the movement into smaller steps to prevent tunneling
    const stepSize = getConfig().combat.PROJECTILE_STEP_SIZE;
    const numSteps = Math.ceil((ThrowingKnifeProjectile.KNIFE_SPEED * deltaTime) / stepSize);
    const stepDelta = deltaTime / numSteps;

    let lastStepPosition = currentPosition;
    let hitSomething = false;

    for (let i = 0; i < numSteps && !hitSomething; i++) {
      // Update position for this step
      this.updatePositions(stepDelta);
      const newStepPosition = this.getPosition();

      // Check for collisions with collidable entities (trees, walls, boundaries, etc.)
      const collidingEntity = this.getEntityManager().getIntersectingCollidableEntity(this);
      if (collidingEntity) {
        // Check if it's a valid target - if so, let handleIntersections deal with it
        const strategy = this.getGameManagers().getGameServer().getGameLoop().getGameModeStrategy();
        const isValidTarget = strategy.shouldDamageTarget(this, collidingEntity, this.shooterId);

        // Check if it's a boundary - throwing knives should stop at boundaries but pass through walls
        const isBoundary = collidingEntity.getType() === Entities.BOUNDARY;

        // Don't stop if we hit the shooter, the car, or a valid target (targets are handled by handleIntersections)
        // Only stop at boundaries, not walls or other collidables (similar to bullets)
        if (
          collidingEntity.getId() !== this.shooterId &&
          !(collidingEntity instanceof Car) &&
          !isValidTarget &&
          isBoundary
        ) {
          // Hit a boundary - create pickup item and remove projectile
          this.createPickupItem(newStepPosition);
          this.getEntityManager().markEntityForRemoval(this);
          hitSomething = true;
          break;
        }
      }

      // Check for collisions with zombies
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
    const knifeRadius = getConfig().combat.BULLET_SIZE / 2;

    // Position is now the center of the hitbox (due to Collidable offset)
    const fromCenter = poolManager.vector2.claim(fromPosition.x, fromPosition.y);
    const toCenter = poolManager.vector2.claim(toPosition.x, toPosition.y);

    const knifePath = poolManager.line.claim(fromCenter, toCenter);

    // Use game mode strategy to determine valid targets
    const strategy = this.getGameManagers().getGameServer().getGameLoop().getGameModeStrategy();
    const isValidTarget = (entity: IEntity) =>
      strategy.shouldDamageTarget(this, entity, this.shooterId);

    const targets = this.getEntityManager()
      .getNearbyIntersectingDestructableEntities(this)
      .filter(isValidTarget);

    // Sort targets by distance to knife start position to ensure we hit the closest target first
    targets.sort((a, b) => {
      const distA = distance(fromCenter, a.getExt(Positionable).getPosition());
      const distB = distance(fromCenter, b.getExt(Positionable).getPosition());
      return distA - distB;
    });

    for (const target of targets) {
      const hitbox = target.getExt(Destructible).getDamageBox();
      let collision = false;

      // Expand the rectangle by the knife's radius to account for the knife's size
      const expandedPos = poolManager.vector2.claim(
        hitbox.position.x - knifeRadius,
        hitbox.position.y - knifeRadius
      );
      const expandedSize = poolManager.vector2.claim(
        hitbox.size.x + knifeRadius * 2,
        hitbox.size.y + knifeRadius * 2
      );
      const expandedRect = poolManager.rectangle.claim(expandedPos, expandedSize);
      poolManager.vector2.release(expandedPos);
      poolManager.vector2.release(expandedSize);

      // Check if either the knife path intersects the expanded rectangle
      collision = knifePath.intersects(expandedRect);
      poolManager.rectangle.release(expandedRect);

      // Additional check for edge case: if either endpoint is inside or very close to the rectangle
      if (!collision) {
        const isPointNearRect = (point: Vector2) => {
          const closestX = Math.max(
            hitbox.position.x,
            Math.min(point.x, hitbox.position.x + hitbox.size.x)
          );
          const closestY = Math.max(
            hitbox.position.y,
            Math.min(point.y, hitbox.position.y + hitbox.size.y)
          );
          const closestPoint = poolManager.vector2.claim(closestX, closestY);
          const dist = distance(point, closestPoint);
          poolManager.vector2.release(closestPoint);
          return dist <= knifeRadius;
        };

        collision = isPointNearRect(fromCenter) || isPointNearRect(toCenter);
      }

      if (collision) {
        poolManager.line.release(knifePath);
        poolManager.vector2.release(fromCenter);
        poolManager.vector2.release(toCenter);
        this.getEntityManager().markEntityForRemoval(this);
        const destructible = target.getExt(Destructible);
        const wasAlive = !destructible.isDead();

        // Deal 1 damage
        destructible.damage(1, this.shooterId);

        // Add throwing knife to target's inventory (stacking) if it has one
        if (target.hasExt(Inventory)) {
          const inventory = target.getExt(Inventory);
          const existingKnifeIndex = inventory
            .getItems()
            .findIndex((item) => item != null && item.itemType === "throwing_knife");

          if (existingKnifeIndex >= 0) {
            // Increment existing knife count
            const existingItem = inventory.getItems()[existingKnifeIndex];
            if (existingItem) {
              const currentCount = existingItem.state?.count || 0;
              inventory.updateItemState(existingKnifeIndex, { count: currentCount + 1 });
            }
          } else {
            // Add new throwing knife item
            inventory.addItem({
              itemType: "throwing_knife",
              state: { count: 1 },
            });
          }
        }

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

    poolManager.line.release(knifePath);
    poolManager.vector2.release(fromCenter);
    poolManager.vector2.release(toCenter);
    return false;
  }

  private createPickupItem(position: Vector2): void {
    // Create a throwing knife item on the ground
    // This allows players to retrieve knives that hit boundaries or missed
    const throwingKnife = this.getEntityManager().createEntity(Entities.THROWING_KNIFE);
    if (throwingKnife) {
      throwingKnife.getExt(Positionable).setPosition(position);
      if (throwingKnife.hasExt(Carryable)) {
        const carryable = throwingKnife.getExt(Carryable);
        carryable.setItemState({ count: 1 });
      }
      this.getEntityManager().addEntity(throwingKnife);
    }
  }

  private handleMaxDistanceLogic(lastPosition: Vector2) {
    this.traveledDistance += distance(lastPosition, this.getPosition());

    if (this.traveledDistance > MAX_TRAVEL_DISTANCE) {
      // When knife reaches max distance, create a throwing knife item on the ground
      // This allows players to retrieve missed throws
      this.createPickupItem(this.getPosition());
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
