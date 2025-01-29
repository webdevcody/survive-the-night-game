import { IGameManagers } from "@/managers/types";
import { Entities, ZOMBIE_ATTACK_RADIUS } from "@shared/constants";
import Vector2 from "@shared/util/vector2";
import { BaseEnemy } from "./base-enemy";
import { ZombieHurtEvent } from "@shared/events/server-sent/zombie-hurt-event";
import { ZombieDeathEvent } from "@shared/events/server-sent/zombie-death-event";
import Collidable from "@/extensions/collidable";
import { Cooldown } from "@/entities/util/cooldown";
import { MeleeMovementStrategy, MeleeAttackStrategy } from "./zombie";

export class FastZombie extends BaseEnemy {
  public static readonly Size = new Vector2(8, 8);
  public static readonly ZOMBIE_SPEED = 50; // Much faster than regular zombie
  private static readonly ATTACK_DAMAGE = 1;
  private static readonly ATTACK_COOLDOWN = 0.5; // Attacks more frequently
  public static readonly MAX_HEALTH = 1; // Less health than regular zombie
  private static readonly DROP_CHANCE = 0.3; // Lower drop chance than regular zombie
  private readonly positionThreshold = 4; // Larger threshold for faster speed

  constructor(gameManagers: IGameManagers) {
    super(
      gameManagers,
      Entities.FAST_ZOMBIE,
      FastZombie.Size,
      FastZombie.MAX_HEALTH,
      FastZombie.ATTACK_COOLDOWN,
      FastZombie.ZOMBIE_SPEED,
      FastZombie.DROP_CHANCE,
      ZOMBIE_ATTACK_RADIUS,
      FastZombie.ATTACK_DAMAGE
    );

    // Override collision box size and offset for smaller zombie
    const collidable = this.getExt(Collidable);
    collidable.setSize(FastZombie.Size).setOffset(new Vector2(0, 0));

    this.setMovementStrategy(new MeleeMovementStrategy());
    this.setAttackStrategy(new MeleeAttackStrategy());
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
