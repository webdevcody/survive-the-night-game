import { IGameManagers } from "@/managers/types";
import { Entities } from "@shared/constants";
import Vector2 from "@shared/util/vector2";
import { BaseEnemy } from "./base-enemy";
import Collidable from "@/extensions/collidable";
import { Cooldown } from "@/entities/util/cooldown";
import { MeleeMovementStrategy } from "./strategies/movement";
import { MeleeAttackStrategy } from "./strategies/attack";

export class FastZombie extends BaseEnemy {
  private readonly positionThreshold = 4; // Larger threshold for faster speed

  constructor(gameManagers: IGameManagers) {
    super(gameManagers, Entities.FAST_ZOMBIE);

    // Override collision box size and offset for smaller zombie
    const collidable = this.getExt(Collidable);
    collidable
      .setSize(this.config.stats.size)
      .setOffset(new Vector2(this.positionThreshold, this.positionThreshold));

    this.setMovementStrategy(new MeleeMovementStrategy());
    this.setAttackStrategy(new MeleeAttackStrategy());
  }

  getAttackCooldown(): Cooldown {
    return this.attackCooldown;
  }

  getAttackDamage(): number {
    return this.attackDamage;
  }
}
