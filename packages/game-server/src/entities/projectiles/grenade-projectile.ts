import Collidable from "@/extensions/collidable";
import Destructible from "@/extensions/destructible";
import Movable from "@/extensions/movable";
import Positionable from "@/extensions/positionable";
import Updatable from "@/extensions/updatable";
import { IGameManagers } from "@/managers/types";
import { Entities } from "@/constants";
import { getConfig } from "@shared/config";
import { Direction } from "@/util/direction";
import { Entity } from "@/entities/entity";
import { distance } from "@/util/physics";
import Vector2 from "@/util/vector2";
import { ExplosionEvent } from "../../../../game-shared/src/events/server-sent/events/explosion-event";
import PoolManager from "@shared/util/pool-manager";
import {
  calculateVelocityFromAngle,
  calculateVelocityFromDirection,
} from "@/entities/weapons/helpers";

const DEFAULT_TRAVEL_DISTANCE = getConfig().combat.TRAVEL_DISTANCE_MEDIUM;
const GRENADE_PROJECTILE_SPEED = getConfig().combat.PROJECTILE_SPEED_STANDARD;
const EXPLOSION_RADIUS = getConfig().combat.EXPLOSION_RADIUS_MEDIUM;
const EXPLOSION_DAMAGE = getConfig().combat.EXPLOSION_DAMAGE_STANDARD;

export class GrenadeProjectile extends Entity {
  private traveledDistance: number = 0;
  private targetDistance: number = DEFAULT_TRAVEL_DISTANCE;
  private startPosition: Vector2;
  private shooterId: number = 0;

  constructor(gameManagers: IGameManagers) {
    super(gameManagers, Entities.GRENADE_PROJECTILE);

    const poolManager = PoolManager.getInstance();
    this.addExtension(new Positionable(this));
    this.addExtension(new Movable(this).setHasFriction(false));
    this.addExtension(new Updatable(this, this.updateGrenadeProjectile.bind(this)));
    this.addExtension(
      new Collidable(this).setSize(
        poolManager.vector2.claim(getConfig().combat.BULLET_SIZE, getConfig().combat.BULLET_SIZE)
      )
    );

    this.startPosition = this.getPosition();
  }

  setShooterId(id: number) {
    this.shooterId = id;
  }

  getShooterId(): number {
    return this.shooterId;
  }

  /**
   * Set the target distance for the grenade (where it will explode)
   * @param distance Distance in world units from the starting position
   */
  setTargetDistance(distance: number) {
    this.targetDistance = distance;
  }

  setDirection(direction: Direction) {
    this.getExt(Movable).setVelocity(
      calculateVelocityFromDirection(direction, GRENADE_PROJECTILE_SPEED)
    );
  }

  /**
   * Set grenade direction from an angle in radians
   * @param angle Angle in radians (0 = right, PI/2 = down, PI = left, 3PI/2 = up)
   */
  setDirectionFromAngle(angle: number) {
    this.getExt(Movable).setVelocity(
      calculateVelocityFromAngle(angle, GRENADE_PROJECTILE_SPEED)
    );
  }

  setPosition(position: Vector2) {
    this.getExt(Positionable).setPosition(position);
    this.startPosition = position;
  }

  private updateGrenadeProjectile(deltaTime: number): void {
    const poolManager = PoolManager.getInstance();
    const currentPosition = this.getPosition();
    const lastPosition = poolManager.vector2.claim(currentPosition.x, currentPosition.y);

    // Update position
    const movable = this.getExt(Movable);
    const velocity = movable.getVelocity();
    const positionable = this.getExt(Positionable);

    positionable.setPosition(
      poolManager.vector2.claim(
        positionable.getPosition().x + velocity.x * deltaTime,
        positionable.getPosition().y + velocity.y * deltaTime
      )
    );

    const newPosition = this.getPosition();

    // Check for collisions
    const collidingEntity = this.getEntityManager().getIntersectingCollidableEntity(this);
    if (collidingEntity) {
      // Don't explode if we hit the shooter
      if (collidingEntity.getId() !== this.shooterId) {
        this.explode();
        return;
      }
    }

    // Check if grenade has reached target distance
    this.traveledDistance += distance(lastPosition, newPosition);
    if (this.traveledDistance >= this.targetDistance) {
      this.explode();
      return;
    }
  }

  private explode(): void {
    const position = this.getExt(Positionable).getCenterPosition();
    const nearbyEntities = this.getEntityManager().getNearbyEntities(position, EXPLOSION_RADIUS);

    // Use game mode strategy to determine valid targets
    const strategy = this.getGameManagers().getGameServer().getGameLoop().getGameModeStrategy();

    // Damage valid targets in explosion radius
    for (const entity of nearbyEntities) {
      if (!entity.hasExt(Destructible)) continue;

      // Use strategy to determine if this entity should be damaged
      if (!strategy.shouldDamageTarget(this, entity, this.shooterId)) {
        continue;
      }

      const entityPos = entity.getExt(Positionable).getCenterPosition();
      const dist = position.distance(entityPos);

      if (dist <= EXPLOSION_RADIUS) {
        // Scale damage based on distance from explosion
        const damageScale = 1 - dist / EXPLOSION_RADIUS;
        const damage = Math.ceil(EXPLOSION_DAMAGE * damageScale);
        entity.getExt(Destructible).damage(damage, this.shooterId);
      }
    }

    // Broadcast explosion event for client to show particle effect
    this.getEntityManager().getBroadcaster().broadcastEvent(
      new ExplosionEvent({
        position,
      })
    );

    // Remove the grenade projectile
    this.getEntityManager().markEntityForRemoval(this);
  }

  getPosition(): Vector2 {
    return this.getExt(Positionable).getPosition();
  }

  getVelocity(): Vector2 {
    return this.getExt(Movable).getVelocity();
  }
}
