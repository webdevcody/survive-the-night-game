import Collidable from "@/extensions/collidable";
import Destructible from "@/extensions/destructible";
import Groupable from "@/extensions/groupable";
import Inventory from "@/extensions/inventory";
import Movable from "@/extensions/movable";
import Positionable from "@/extensions/positionable";
import Updatable from "@/extensions/updatable";
import { IGameManagers } from "@/managers/types";
import { getConfig } from "@shared/config";
import { Direction, normalizeDirection } from "@/util/direction";
import { Entity } from "@/entities/entity";
import { normalizeVector, distance } from "@/util/physics";
import { IEntity } from "@/entities/types";
import Vector2 from "@/util/vector2";
import { Line, Rectangle } from "@/util/shape";
import { Player } from "@/entities/players/player";
import { ArrowAmmo } from "../items/arrow-ammo";
import PoolManager from "@shared/util/pool-manager";

const MAX_TRAVEL_DISTANCE = getConfig().combat.TRAVEL_DISTANCE_SHORT;
export class Arrow extends Entity {
  private traveledDistance: number = 0;
  private static readonly ARROW_SPEED = getConfig().combat.PROJECTILE_SPEED_STANDARD;
  private lastPosition: Vector2;
  private shooterId: number = 0;

  constructor(gameManagers: IGameManagers) {
    super(gameManagers, "arrow");

    const poolManager = PoolManager.getInstance();
    this.addExtension(new Positionable(this));
    this.addExtension(new Movable(this).setHasFriction(false));
    this.addExtension(new Updatable(this, this.updateArrow.bind(this)));
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
      poolManager.vector2.claim(normalized.x * Arrow.ARROW_SPEED, normalized.y * Arrow.ARROW_SPEED)
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
      poolManager.vector2.claim((rotatedX / length) * Arrow.ARROW_SPEED, (rotatedY / length) * Arrow.ARROW_SPEED)
    );
  }

  getHitbox(): Rectangle {
    return this.getExt(Collidable).getHitBox();
  }

  setDirectionFromVelocity(velocity: Vector2) {
    const poolManager = PoolManager.getInstance();
    if (velocity.x === 0 && velocity.y === 0) {
      // Default direction (right) if no velocity
      this.getExt(Movable).setVelocity(poolManager.vector2.claim(Arrow.ARROW_SPEED, 0));
      return;
    }

    const normalized = normalizeVector(velocity);
    this.getExt(Movable).setVelocity(
      poolManager.vector2.claim(normalized.x * Arrow.ARROW_SPEED, normalized.y * Arrow.ARROW_SPEED)
    );
  }

  /**
   * Set arrow direction from an angle in radians
   * @param angle Angle in radians (0 = right, PI/2 = down, PI = left, 3PI/2 = up)
   */
  setDirectionFromAngle(angle: number) {
    const poolManager = PoolManager.getInstance();
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);

    this.getExt(Movable).setVelocity(
      poolManager.vector2.claim(dirX * Arrow.ARROW_SPEED, dirY * Arrow.ARROW_SPEED)
    );
  }

  private updateArrow(deltaTime: number) {
    const currentPosition = this.getPosition();

    // Break down the movement into smaller steps to prevent tunneling
    const stepSize = getConfig().combat.PROJECTILE_STEP_SIZE;
    const numSteps = Math.ceil((Arrow.ARROW_SPEED * deltaTime) / stepSize);
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
    const arrowRadius = getConfig().combat.BULLET_SIZE / 2;
    
    const fromCenter = poolManager.vector2.claim(
      fromPosition.x + arrowRadius,
      fromPosition.y + arrowRadius
    );
    const toCenter = poolManager.vector2.claim(
      toPosition.x + arrowRadius,
      toPosition.y + arrowRadius
    );

    const arrowPath = poolManager.line.claim(fromCenter, toCenter);

    const isEnemy = (entity: IEntity) =>
      entity.hasExt(Groupable) && entity.getExt(Groupable).getGroup() === "enemy";

    const enemies = this.getEntityManager()
      .getNearbyIntersectingDestructableEntities(this)
      .filter(isEnemy);

    // Sort enemies by distance to arrow start position to ensure we hit the closest enemy first
    enemies.sort((a, b) => {
      const distA = distance(fromCenter, a.getExt(Positionable).getPosition());
      const distB = distance(fromCenter, b.getExt(Positionable).getPosition());
      return distA - distB;
    });

    for (const enemy of enemies) {
      const hitbox = enemy.getExt(Destructible).getDamageBox();
      let collision = false;

      // Expand the rectangle by the arrow's radius to account for the arrow's size
      const expandedPos = poolManager.vector2.claim(
        hitbox.position.x - arrowRadius,
        hitbox.position.y - arrowRadius
      );
      const expandedSize = poolManager.vector2.claim(
        hitbox.size.x + arrowRadius * 2,
        hitbox.size.y + arrowRadius * 2
      );
      const expandedRect = poolManager.rectangle.claim(expandedPos, expandedSize);
      poolManager.vector2.release(expandedPos);
      poolManager.vector2.release(expandedSize);

      // Check if either the arrow path intersects the expanded rectangle
      collision = arrowPath.intersects(expandedRect);
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
          return Math.sqrt(dx * dx + dy * dy) <= arrowRadius;
        };

        collision = isPointNearRect(fromCenter) || isPointNearRect(toCenter);
      }

      if (collision) {
        poolManager.line.release(arrowPath);
        poolManager.vector2.release(fromCenter);
        poolManager.vector2.release(toCenter);
        this.getEntityManager().markEntityForRemoval(this);
        const destructible = enemy.getExt(Destructible);
        const wasAlive = !destructible.isDead();

        // Deal 1 damage
        destructible.damage(1, this.shooterId);

        // Add arrow to zombie's inventory (stacking)
        if (enemy.hasExt(Inventory)) {
          const inventory = enemy.getExt(Inventory);
          const existingArrowIndex = inventory
            .getItems()
            .findIndex((item) => item != null && item.itemType === "arrow_ammo");

          if (existingArrowIndex >= 0) {
            // Increment existing arrow count
            const existingItem = inventory.getItems()[existingArrowIndex];
            if (existingItem) {
              const currentCount = existingItem.state?.count || 0;
              inventory.updateItemState(existingArrowIndex, { count: currentCount + 1 });
            }
          } else {
            // Add new arrow item
            inventory.addItem({
              itemType: "arrow_ammo",
              state: { count: 1 },
            });
          }
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

    poolManager.line.release(arrowPath);
    poolManager.vector2.release(fromCenter);
    poolManager.vector2.release(toCenter);
    return false;
  }

  private handleMaxDistanceLogic(lastPosition: Vector2) {
    this.traveledDistance += distance(lastPosition, this.getPosition());

    if (this.traveledDistance > MAX_TRAVEL_DISTANCE) {
      console.log("arrow reached max distance, creating new arrow");
      this.getEntityManager().markEntityForRemoval(this);
      const arrowAmmo = new ArrowAmmo(this.getGameManagers(), {
        count: 1,
      });
      arrowAmmo.getExt(Positionable).setPosition(this.getPosition());
      this.getEntityManager().addEntity(arrowAmmo);
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
