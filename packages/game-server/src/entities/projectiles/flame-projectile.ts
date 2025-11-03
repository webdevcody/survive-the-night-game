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
import { RawEntity } from "@/types/entity";
import Vector2 from "@/util/vector2";
import { Line, Rectangle } from "@/util/shape";
import { Player } from "@/entities/player";

const MAX_TRAVEL_DISTANCE = 200; // Shorter range than bullets
export class FlameProjectile extends Entity {
  private traveledDistance: number = 0;
  private static readonly FLAME_SPEED = 200; // Slower than bullets
  private static readonly FLAME_SIZE = new Vector2(8, 8);
  private lastPosition: Vector2;
  private shooterId: string = "";
  private damage: number;

  constructor(gameManagers: IGameManagers, damage: number = 1) {
    super(gameManagers, Entities.FLAME_PROJECTILE);
    this.damage = damage;

    this.extensions = [
      new Positionable(this).setSize(FlameProjectile.FLAME_SIZE),
      new Movable(this).setHasFriction(false),
      new Updatable(this, this.updateFlame.bind(this)),
      new Collidable(this).setSize(FlameProjectile.FLAME_SIZE),
    ];

    this.lastPosition = this.getPosition();
  }

  setShooterId(id: string) {
    this.shooterId = id;
  }

  getShooterId(): string {
    return this.shooterId;
  }

  setDirection(direction: Direction) {
    const normalized = normalizeDirection(direction);
    this.getExt(Movable).setVelocity(
      new Vector2(
        normalized.x * FlameProjectile.FLAME_SPEED,
        normalized.y * FlameProjectile.FLAME_SPEED
      )
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

      // Check for collisions in this step
      hitSomething = this.handleIntersections(lastStepPosition, newStepPosition);

      // Update for next step
      lastStepPosition = newStepPosition;
    }

    this.handleMaxDistanceLogic(currentPosition);
    this.lastPosition = this.getPosition();
  }

  private updatePositions(deltaTime: number) {
    const movable = this.getExt(Movable);
    const velocity = movable.getVelocity();
    const positionable = this.getExt(Positionable);

    positionable.setPosition(
      new Vector2(
        positionable.getPosition().x + velocity.x * deltaTime,
        positionable.getPosition().y + velocity.y * deltaTime
      )
    );
  }

  private handleIntersections(fromPosition: Vector2, toPosition: Vector2): boolean {
    // Convert corner positions to center positions for more accurate collision
    const flameCenterOffset = new Vector2(
      FlameProjectile.FLAME_SIZE.x / 2,
      FlameProjectile.FLAME_SIZE.y / 2
    );
    const fromCenter = fromPosition.add(flameCenterOffset);
    const toCenter = toPosition.add(flameCenterOffset);

    const flamePath = new Line(fromCenter, toCenter);
    const flameRadius = FlameProjectile.FLAME_SIZE.x / 2;

    // Calculate a bounding box that encompasses the flame's path plus its size
    const minX = Math.min(fromCenter.x, toCenter.x) - flameRadius;
    const minY = Math.min(fromCenter.y, toCenter.y) - flameRadius;
    const maxX = Math.max(fromCenter.x, toCenter.x) + flameRadius;
    const maxY = Math.max(fromCenter.y, toCenter.y) + flameRadius;

    const boundingBox = new Rectangle(
      new Vector2(minX, minY),
      new Vector2(maxX - minX, maxY - minY)
    );

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
      const expandedRect = new Rectangle(
        new Vector2(
          hitbox.position.x - flameRadius,
          hitbox.position.y - flameRadius
        ),
        new Vector2(
          hitbox.size.x + flameRadius * 2,
          hitbox.size.y + flameRadius * 2
        )
      );

      // Check if either the flame path intersects the expanded rectangle
      collision = flamePath.intersects(expandedRect);

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

    return false;
  }

  private handleMaxDistanceLogic(lastPosition: Vector2) {
    this.traveledDistance += distance(lastPosition, this.getPosition());

    if (this.traveledDistance > MAX_TRAVEL_DISTANCE) {
      this.getEntityManager().markEntityForRemoval(this);
    }
  }

  serialize(): RawEntity {
    return {
      ...super.serialize(),
      position: this.getPosition(),
      velocity: this.getVelocity(),
    };
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
