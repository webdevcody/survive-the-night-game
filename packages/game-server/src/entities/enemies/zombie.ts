import { IGameManagers } from "@/managers/types";
import { Entities } from "@/constants";
import { BaseEnemy } from "./base-enemy";
import { Cooldown } from "@/entities/util/cooldown";
import { IdleMovementStrategy, MeleeMovementStrategy } from "./strategies/movement";
import { MeleeAttackStrategy } from "./strategies/attack";

export class Zombie extends BaseEnemy {
  constructor(gameManagers: IGameManagers, isIdle: boolean = false) {
    super(gameManagers, Entities.ZOMBIE);

    // Use IdleMovementStrategy for idle zombies, otherwise use normal MeleeMovementStrategy
    if (isIdle) {
      this.setMovementStrategy(new IdleMovementStrategy());
    } else {
      this.setMovementStrategy(new MeleeMovementStrategy());
    }

    this.setAttackStrategy(new MeleeAttackStrategy());
  }

  getAttackCooldown(): Cooldown {
    return this.attackCooldown;
  }

  getAttackDamage(): number {
    return this.attackDamage;
  }
}
