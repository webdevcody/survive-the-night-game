import { IGameManagers } from "@/managers/types";
import { Entities } from "@/constants";
import { BaseEnemy } from "./base-enemy";
import { Cooldown } from "@/entities/util/cooldown";
import { MeleeMovementStrategy } from "./strategies/movement";
import { MeleeAttackStrategy } from "./strategies/attack";

export class Zombie extends BaseEnemy {
  constructor(gameManagers: IGameManagers) {
    super(gameManagers, Entities.ZOMBIE);

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
