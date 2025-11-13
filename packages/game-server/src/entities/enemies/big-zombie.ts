import { IGameManagers } from "@/managers/types";
import { Entities } from "@/constants";
import Vector2 from "@/util/vector2";
import { BaseEnemy } from "./base-enemy";
import { IEntity } from "@/entities/types";
import { Player } from "@/entities/player";
import { normalizeVector } from "@/util/physics";
import Movable from "@/extensions/movable";
import { Cooldown } from "@/entities/util/cooldown";
import { MeleeMovementStrategy } from "./strategies/movement";
import { MeleeAttackStrategy } from "./strategies/attack";

export class BigZombie extends BaseEnemy {
  public static readonly KNOCKBACK_FORCE = 600;

  constructor(gameManagers: IGameManagers) {
    super(gameManagers, Entities.BIG_ZOMBIE);

    const attackStrategy = new MeleeAttackStrategy();
    attackStrategy.onEntityDamaged = (entity: IEntity) => {
      // Apply knockback if it's a player
      if (entity instanceof Player) {
        const knockbackDirection = normalizeVector(
          new Vector2(
            entity.getCenterPosition().x - this.getCenterPosition().x,
            entity.getCenterPosition().y - this.getCenterPosition().y
          )
        );

        const knockbackVelocity = new Vector2(
          knockbackDirection.x * BigZombie.KNOCKBACK_FORCE,
          knockbackDirection.y * BigZombie.KNOCKBACK_FORCE
        );

        entity.getExt(Movable).setVelocity(knockbackVelocity);
      }
    };

    this.setMovementStrategy(new MeleeMovementStrategy());
    this.setAttackStrategy(attackStrategy);
  }

  getAttackCooldown(): Cooldown {
    return this.attackCooldown;
  }

  getAttackDamage(): number {
    return this.attackDamage;
  }
}
