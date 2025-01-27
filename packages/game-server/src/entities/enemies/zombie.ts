import { IGameManagers } from "@/managers/types";
import { ZombieDeathEvent } from "@shared/events/server-sent/zombie-death-event";
import { ZombieAttackedEvent } from "@shared/events/server-sent/zombie-attacked-event";
import { Entities } from "@/constants";
import { IEntity } from "@/entities/types";
import Vector2 from "@/util/vector2";
import { ZombieHurtEvent } from "@/events/server-sent/zombie-hurt-event";
import { BaseEnemy } from "./base-enemy";
import Destructible from "@/extensions/destructible";

export class Zombie extends BaseEnemy {
  public static readonly Size = new Vector2(16, 16);
  private static readonly ZOMBIE_SPEED = 35;
  private static readonly ATTACK_RADIUS = 16;
  private static readonly ATTACK_DAMAGE = 1;
  private static readonly ATTACK_COOLDOWN = 1;
  public static readonly MAX_HEALTH = 3;
  private static readonly DROP_CHANCE = 0.7;

  constructor(gameManagers: IGameManagers) {
    super(
      gameManagers,
      Entities.ZOMBIE,
      Zombie.Size,
      Zombie.MAX_HEALTH,
      Zombie.ATTACK_COOLDOWN,
      Zombie.ZOMBIE_SPEED,
      Zombie.DROP_CHANCE
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

    const withinRange = this.withinAttackRange(entity, Zombie.ATTACK_RADIUS);
    if (!withinRange) return false;

    if (entity.hasExt(Destructible)) {
      entity.getExt(Destructible).damage(Zombie.ATTACK_DAMAGE);
      this.getGameManagers().getBroadcaster().broadcastEvent(new ZombieAttackedEvent(this.getId()));
    }

    this.attackCooldown.reset();
    return true;
  }
}
