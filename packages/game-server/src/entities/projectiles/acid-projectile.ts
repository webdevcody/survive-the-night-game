import { IGameManagers } from "@/managers/types";
import { Entities } from "@/constants";
import Vector2 from "@/util/vector2";
import { Entity } from "@/entities/entity";
import Positionable from "@/extensions/positionable";
import Movable from "@/extensions/movable";
import Collidable from "@/extensions/collidable";
import Updatable from "@/extensions/updatable";
import Destructible from "@/extensions/destructible";
import Groupable from "@/extensions/groupable";
import { Extension } from "@/extensions/types";

export class AcidProjectile extends Entity {
  private static readonly PROJECTILE_SPEED = 100;
  private static readonly PROJECTILE_SIZE = new Vector2(8, 8);
  private static readonly PROJECTILE_DAMAGE = 1;
  private static readonly MAX_DISTANCE = 200;
  private readonly startPosition: Vector2;

  constructor(gameManagers: IGameManagers, startPosition: Vector2, targetPosition: Vector2) {
    super(gameManagers, Entities.ACID_PROJECTILE);

    this.startPosition = startPosition;

    // Calculate velocity towards target
    const direction = targetPosition.sub(startPosition).unit();
    const velocity = direction.mul(AcidProjectile.PROJECTILE_SPEED);

    const positionable = new Positionable(this);
    positionable.setPosition(startPosition);
    positionable.setSize(AcidProjectile.PROJECTILE_SIZE);

    const movable = new Movable(this);
    movable.setVelocity(velocity);
    movable.setHasFriction(false);

    const collidable = new Collidable(this);
    collidable.setSize(AcidProjectile.PROJECTILE_SIZE);

    this.addExtension(positionable);
    this.addExtension(movable);
    this.addExtension(collidable);
    this.addExtension(new Updatable(this, this.update.bind(this)));
    this.addExtension(new Groupable(this, "enemy"));
  }

  private update(deltaTime: number): Extension[] {
    const position = this.getExt(Positionable).getPosition();
    const distance = position.sub(this.startPosition).length();

    // Remove projectile if it has traveled too far
    if (distance > AcidProjectile.MAX_DISTANCE) {
      this.getEntityManager().markEntityForRemoval(this);
      return this.extensions;
    }

    // Update position
    const velocity = this.getExt(Movable).getVelocity();
    position.x += velocity.x * deltaTime;
    position.y += velocity.y * deltaTime;
    this.getExt(Positionable).setPosition(position);

    // Check for collisions with destructible entities
    const destructibleEntities =
      this.getEntityManager().getNearbyIntersectingDestructableEntities(this);
    for (const entity of destructibleEntities) {
      // Only collide with friendly entities (players), ignore everything else
      if (entity.hasExt(Groupable) && entity.getExt(Groupable).getGroup() === "friendly") {
        entity.getExt(Destructible).damage(AcidProjectile.PROJECTILE_DAMAGE);
        this.getEntityManager().markEntityForRemoval(this);
        return this.extensions;
      }
    }

    return this.extensions;
  }
}
