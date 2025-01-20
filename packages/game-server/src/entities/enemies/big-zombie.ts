import { IGameManagers } from "@/managers/types";
import { Entities } from "@/constants";
import Vector2 from "@/util/vector2";
import { BaseEnemy } from "./base-enemy";
import { IEntity } from "@/entities/types";
import { ZombieAttackedEvent } from "@shared/events/server-sent/zombie-attacked-event";
import { ZombieHurtEvent } from "@shared/events/server-sent/zombie-hurt-event";
import { ZombieDeathEvent } from "@shared/events/server-sent/zombie-death-event";
import { Player } from "@/entities/player";
import { normalizeVector } from "@/util/physics";
import Destructible from "@/extensions/destructible";
import Movable from "@/extensions/movable";

export class BigZombie extends BaseEnemy {
  public static readonly Size = new Vector2(16, 16);
  private static readonly ZOMBIE_SPEED = 20;
  private static readonly ATTACK_RADIUS = 16;
  private static readonly ATTACK_DAMAGE = 2;
  private static readonly ATTACK_COOLDOWN = 1.5;
  private static readonly KNOCKBACK_FORCE = 600;
  public static readonly MAX_HEALTH = 11;

  constructor(gameManagers: IGameManagers) {
    super(
      gameManagers,
      Entities.BIG_ZOMBIE,
      BigZombie.Size,
      BigZombie.MAX_HEALTH,
      BigZombie.ATTACK_COOLDOWN,
      BigZombie.ZOMBIE_SPEED
    );
  }

  onDamaged(): void {
    this.getGameManagers().getBroadcaster().broadcastEvent(new ZombieHurtEvent(this.getId()));
  }

  onDeath(): void {
    super.onDeath();
    this.getGameManagers().getBroadcaster().broadcastEvent(new ZombieDeathEvent(this.getId()));
  }

  protected attemptAttackEntity(entity: IEntity): boolean {
    if (!this.attackCooldown.isReady()) return false;

    const withinRange = this.withinAttackRange(entity, BigZombie.ATTACK_RADIUS);
    if (!withinRange) return false;

    if (entity.hasExt(Destructible)) {
      entity.getExt(Destructible).damage(BigZombie.ATTACK_DAMAGE);

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

      this.getGameManagers().getBroadcaster().broadcastEvent(new ZombieAttackedEvent(this.getId()));
    }

    this.attackCooldown.reset();
    return true;
  }
}
