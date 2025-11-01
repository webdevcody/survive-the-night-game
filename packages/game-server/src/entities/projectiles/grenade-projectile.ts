import Collidable from "@/extensions/collidable";
import Destructible from "@/extensions/destructible";
import Movable from "@/extensions/movable";
import Positionable from "@/extensions/positionable";
import Updatable from "@/extensions/updatable";
import { IGameManagers } from "@/managers/types";
import { Entities, BULLET_SIZE } from "@/constants";
import { Direction, normalizeDirection } from "@/util/direction";
import { Entity } from "@/entities/entity";
import { distance } from "@/util/physics";
import { RawEntity } from "@/types/entity";
import Vector2 from "@/util/vector2";
import { ExplosionEvent } from "@/events/server-sent/explosion-event";

const MAX_TRAVEL_DISTANCE = 300;
const GRENADE_PROJECTILE_SPEED = 200;
const EXPLOSION_RADIUS = 64;
const EXPLOSION_DAMAGE = 5;

export class GrenadeProjectile extends Entity {
  private traveledDistance: number = 0;
  private startPosition: Vector2;
  private shooterId: string = "";

  constructor(gameManagers: IGameManagers) {
    super(gameManagers, Entities.GRENADE_PROJECTILE);

    this.extensions = [
      new Positionable(this),
      new Movable(this).setHasFriction(false),
      new Updatable(this, this.updateGrenadeProjectile.bind(this)),
      new Collidable(this).setSize(new Vector2(BULLET_SIZE, BULLET_SIZE)),
    ];

    this.startPosition = this.getPosition();
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
      new Vector2(normalized.x * GRENADE_PROJECTILE_SPEED, normalized.y * GRENADE_PROJECTILE_SPEED)
    );
  }

  setPosition(position: Vector2) {
    this.getExt(Positionable).setPosition(position);
    this.startPosition = position;
  }

  private updateGrenadeProjectile(deltaTime: number): void {
    const currentPosition = this.getPosition();
    const lastPosition = new Vector2(currentPosition.x, currentPosition.y);

    // Update position
    const movable = this.getExt(Movable);
    const velocity = movable.getVelocity();
    const positionable = this.getExt(Positionable);

    positionable.setPosition(
      new Vector2(
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

    // Check max distance
    this.traveledDistance += distance(lastPosition, newPosition);
    if (this.traveledDistance > MAX_TRAVEL_DISTANCE) {
      this.explode();
      return;
    }
  }

  private explode(): void {
    const position = this.getExt(Positionable).getCenterPosition();
    const nearbyEntities = this.getEntityManager().getNearbyEntities(
      position,
      EXPLOSION_RADIUS
    );

    // Damage all destructible entities in explosion radius
    for (const entity of nearbyEntities) {
      // Don't damage the shooter
      if (entity.getId() === this.shooterId) continue;
      
      if (!entity.hasExt(Destructible)) continue;

      const entityPos = entity.getExt(Positionable).getCenterPosition();
      const dist = position.distance(entityPos);

      if (dist <= EXPLOSION_RADIUS) {
        // Scale damage based on distance from explosion
        const damageScale = 1 - dist / EXPLOSION_RADIUS;
        const damage = Math.ceil(EXPLOSION_DAMAGE * damageScale);
        entity.getExt(Destructible).damage(damage);
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

  getVelocity(): Vector2 {
    return this.getExt(Movable).getVelocity();
  }
}

