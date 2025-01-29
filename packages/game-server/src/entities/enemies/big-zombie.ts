import { IGameManagers } from "@/managers/types";
import { Entities, ZOMBIE_ATTACK_RADIUS } from "@/constants";
import Vector2 from "@/util/vector2";
import { AttackStrategy, BaseEnemy, MovementStrategy } from "./base-enemy";
import { IEntity } from "@/entities/types";
import { ZombieAttackedEvent } from "@shared/events/server-sent/zombie-attacked-event";
import { ZombieHurtEvent } from "@shared/events/server-sent/zombie-hurt-event";
import { ZombieDeathEvent } from "@shared/events/server-sent/zombie-death-event";
import { Player } from "@/entities/player";
import { normalizeVector } from "@/util/physics";
import Destructible from "@/extensions/destructible";
import Movable from "@/extensions/movable";
import Positionable from "@/extensions/positionable";
import { Cooldown } from "@/entities/util/cooldown";
import { MeleeMovementStrategy, MeleeAttackStrategy } from "./zombie";

export class BigZombie extends BaseEnemy {
  public static readonly Size = new Vector2(16, 16);
  public static readonly ZOMBIE_SPEED = 20;
  private static readonly ATTACK_DAMAGE = 3;
  private static readonly ATTACK_COOLDOWN = 1.5;
  public static readonly KNOCKBACK_FORCE = 600;
  public static readonly MAX_HEALTH = 11;
  private static readonly DROP_CHANCE = 1;

  constructor(gameManagers: IGameManagers) {
    super(
      gameManagers,
      Entities.BIG_ZOMBIE,
      BigZombie.Size,
      BigZombie.MAX_HEALTH,
      BigZombie.ATTACK_COOLDOWN,
      BigZombie.ZOMBIE_SPEED,
      BigZombie.DROP_CHANCE,
      ZOMBIE_ATTACK_RADIUS,
      BigZombie.ATTACK_DAMAGE
    );

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

  onDamaged(): void {
    this.getGameManagers().getBroadcaster().broadcastEvent(new ZombieHurtEvent(this.getId()));
  }

  onDeath(): void {
    super.onDeath();
    this.getGameManagers().getBroadcaster().broadcastEvent(new ZombieDeathEvent(this.getId()));
  }
}
