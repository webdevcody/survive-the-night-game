import { IGameManagers } from "@/managers/types";
import { Entities } from "@/constants";
import { BaseEnemy } from "./base-enemy";
import { Cooldown } from "@/entities/util/cooldown";
import { RangedMovementStrategy } from "./strategies/movement";
import { RangedAttackStrategy } from "./strategies/attack";

export class SpitterZombie extends BaseEnemy {
  constructor(gameManagers: IGameManagers) {
    super(gameManagers, Entities.SPITTER_ZOMBIE);

    this.setMovementStrategy(new RangedMovementStrategy());
    this.setAttackStrategy(new RangedAttackStrategy());
  }

  getAttackCooldown(): Cooldown {
    return this.attackCooldown;
  }
}
