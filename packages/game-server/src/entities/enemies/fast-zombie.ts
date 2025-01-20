import { IGameManagers } from "@/managers/types";
import { Entities } from "@shared/constants";
import Vector2 from "@shared/util/vector2";
import { BaseEnemy } from "./base-enemy";
import { IEntity } from "@/entities/types";
import { ZombieAttackedEvent } from "@shared/events/server-sent/zombie-attacked-event";
import { ZombieHurtEvent } from "@shared/events/server-sent/zombie-hurt-event";
import { ZombieDeathEvent } from "@shared/events/server-sent/zombie-death-event";
import { Player } from "@/entities/player";
import { normalizeVector } from "@shared/util/physics";
import Destructible from "@/extensions/destructible";
import Movable from "@/extensions/movable";

export class FastZombie extends BaseEnemy {
  public static readonly Size = new Vector2(16, 16);
  private static readonly ZOMBIE_SPEED = 70; // Much faster than regular zombie
  private static readonly ATTACK_RADIUS = 12;
  private static readonly ATTACK_DAMAGE = 1;
  private static readonly ATTACK_COOLDOWN = 0.5; // Attacks more frequently
  private static readonly KNOCKBACK_FORCE = 300;
  public static readonly MAX_HEALTH = 2; // Less health than regular zombie
  private static readonly DROP_CHANCE = 0.1; // Lower drop chance than regular zombie

  constructor(gameManagers: IGameManagers) {
    super(
      gameManagers,
      Entities.FAST_ZOMBIE,
      FastZombie.Size,
      FastZombie.MAX_HEALTH,
      FastZombie.ATTACK_COOLDOWN,
      FastZombie.ZOMBIE_SPEED,
      FastZombie.DROP_CHANCE
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

    const withinRange = this.withinAttackRange(entity, FastZombie.ATTACK_RADIUS);
    if (!withinRange) return false;

    if (entity.hasExt(Destructible)) {
      entity.getExt(Destructible).damage(FastZombie.ATTACK_DAMAGE);

      // Apply small knockback if it's a player
      if (entity instanceof Player) {
        const knockbackDirection = normalizeVector(
          new Vector2(
            entity.getCenterPosition().x - this.getCenterPosition().x,
            entity.getCenterPosition().y - this.getCenterPosition().y
          )
        );

        const knockbackVelocity = new Vector2(
          knockbackDirection.x * FastZombie.KNOCKBACK_FORCE,
          knockbackDirection.y * FastZombie.KNOCKBACK_FORCE
        );

        entity.getExt(Movable).setVelocity(knockbackVelocity);
      }

      this.getGameManagers().getBroadcaster().broadcastEvent(new ZombieAttackedEvent(this.getId()));
    }

    this.attackCooldown.reset();
    return true;
  }
}
