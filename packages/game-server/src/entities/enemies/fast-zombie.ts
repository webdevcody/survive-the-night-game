import { IGameManagers } from "@/managers/types";
import { Entities } from "@shared/constants";
import Vector2 from "@shared/util/vector2";
import { BaseEnemy } from "./base-enemy";
import { IEntity } from "@/entities/types";
import { ZombieAttackedEvent } from "@shared/events/server-sent/zombie-attacked-event";
import { ZombieHurtEvent } from "@shared/events/server-sent/zombie-hurt-event";
import { ZombieDeathEvent } from "@shared/events/server-sent/zombie-death-event";
import Destructible from "@/extensions/destructible";
import Collidable from "@/extensions/collidable";

export class FastZombie extends BaseEnemy {
  public static readonly Size = new Vector2(8, 8);
  private static readonly ZOMBIE_SPEED = 50; // Much faster than regular zombie
  private static readonly ATTACK_RADIUS = 12; // Slightly smaller attack radius
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
      FastZombie.DROP_CHANCE
    );

    // Override collision box size and offset for smaller zombie
    const collidable = this.getExt(Collidable);
    collidable.setSize(FastZombie.Size.div(2)).setOffset(new Vector2(2, 2));
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
      this.getGameManagers().getBroadcaster().broadcastEvent(new ZombieAttackedEvent(this.getId()));
    }

    this.attackCooldown.reset();
    return true;
  }

  protected isAtWaypoint(): boolean {
    if (!this.currentWaypoint) return true;

    const dx = Math.abs(this.getCenterPosition().x - this.currentWaypoint.x);
    const dy = Math.abs(this.getCenterPosition().y - this.currentWaypoint.y);

    return dx <= this.positionThreshold && dy <= this.positionThreshold;
  }
}
