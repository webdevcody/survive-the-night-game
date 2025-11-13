import { IGameManagers } from "@/managers/types";
import { Entities } from "@shared/constants";
import Vector2 from "@shared/util/vector2";
import { BaseEnemy } from "./base-enemy";
import Collidable from "@/extensions/collidable";
import { Cooldown } from "@/entities/util/cooldown";
import { MeleeMovementStrategy } from "./strategies/movement";
import { MeleeAttackStrategy } from "./strategies/attack";
import { IEntity } from "../types";
import Positionable from "@/extensions/positionable";
import Destructible from "@/extensions/destructible";
import { ExplosionEvent } from "@/events/server-sent/explosion-event";

export class ExplodingZombie extends BaseEnemy {
  private static readonly EXPLOSION_RADIUS = 32;
  private static readonly EXPLOSION_DAMAGE = 5;
  private readonly positionThreshold = 4; // Larger threshold for faster speed

  constructor(gameManagers: IGameManagers) {
    super(gameManagers, Entities.EXPLODING_ZOMBIE);

    // Override collision box size and offset for smaller zombie
    const collidable = this.getExt(Collidable);
    collidable
      .setSize(this.config.stats.size)
      .setOffset(new Vector2(this.positionThreshold, this.positionThreshold));

    this.setMovementStrategy(new MeleeMovementStrategy());

    const attackStrategy = new MeleeAttackStrategy();
    attackStrategy.onEntityDamaged = this.onEntityDamaged.bind(this);
    this.setAttackStrategy(attackStrategy);
  }

  getAttackCooldown(): Cooldown {
    return this.attackCooldown;
  }

  getAttackDamage(): number {
    return this.attackDamage;
  }

  onEntityDamaged(entity: IEntity) {
    const position = this.getExt(Positionable).getCenterPosition();
    const nearbyEntities = this.getEntityManager().getNearbyEntities(
      position,
      ExplodingZombie.EXPLOSION_RADIUS
    );

    // Damage all destructible entities in explosion radius
    for (const entity of nearbyEntities) {
      if (!entity.hasExt(Destructible)) continue;

      const entityPos = entity.getExt(Positionable).getCenterPosition();
      const dist = position.distance(entityPos);

      if (dist <= ExplodingZombie.EXPLOSION_RADIUS) {
        // Scale damage based on distance from explosion
        const damageScale = 1 - dist / ExplodingZombie.EXPLOSION_RADIUS;
        const damage = Math.ceil(ExplodingZombie.EXPLOSION_DAMAGE * damageScale);
        entity.getExt(Destructible).damage(damage);
      }
    }

    // Broadcast explosion event for client to show particle effect
    this.getEntityManager().getBroadcaster().broadcastEvent(
      new ExplosionEvent({
        position,
      })
    );

    // Remove the zombie
    this.getEntityManager().markEntityForRemoval(this);
  }
}
