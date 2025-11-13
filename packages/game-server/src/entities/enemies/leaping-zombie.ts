import { IGameManagers } from "@/managers/types";
import { Entities } from "@shared/constants";
import Vector2 from "@shared/util/vector2";
import { BaseEnemy } from "./base-enemy";
import Collidable from "@/extensions/collidable";
import { Cooldown } from "@/entities/util/cooldown";
import { LeapingMovementStrategy, LeapingState } from "./strategies/movement";
import { LeapingAttackStrategy } from "./strategies/attack";

export class LeapingZombie extends BaseEnemy {
  private readonly positionThreshold = 4; // Larger threshold for faster speed

  constructor(gameManagers: IGameManagers) {
    super(gameManagers, Entities.LEAPING_ZOMBIE);

    if (!this.config.leapConfig) {
      throw new Error("LeapingZombie requires leapConfig in zombie config");
    }

    const collidable = this.getExt(Collidable);
    collidable
      .setSize(this.config.stats.size)
      .setOffset(new Vector2(this.positionThreshold, this.positionThreshold));

    // Create shared state between movement and attack strategies
    const leapingState = new LeapingState();

    this.setMovementStrategy(new LeapingMovementStrategy(leapingState));
    this.setAttackStrategy(new LeapingAttackStrategy(leapingState, this.config.leapConfig));
  }

  getAttackCooldown(): Cooldown {
    return this.attackCooldown;
  }

  getAttackDamage(): number {
    return this.attackDamage;
  }
}
