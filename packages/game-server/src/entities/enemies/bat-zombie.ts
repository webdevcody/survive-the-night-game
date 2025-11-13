import { IGameManagers } from "@/managers/types";
import { Entities } from "@shared/constants";
import { BaseEnemy } from "./base-enemy";
import Collidable from "@/extensions/collidable";
import { Cooldown } from "@/entities/util/cooldown";
import { FlyTowardsPlayerStrategy } from "./strategies/movement";
import { MeleeAttackStrategy } from "./strategies/attack";

export class BatZombie extends BaseEnemy {
  constructor(gameManagers: IGameManagers) {
    super(gameManagers, Entities.BAT_ZOMBIE);

    // Disable collisions entirely for flying bats
    const collidable = this.getExt(Collidable);
    collidable.setEnabled(false);

    this.setMovementStrategy(new FlyTowardsPlayerStrategy());
    this.setAttackStrategy(new MeleeAttackStrategy());
  }

  getAttackCooldown(): Cooldown {
    return this.attackCooldown;
  }

  getAttackDamage(): number {
    return this.attackDamage;
  }
}
