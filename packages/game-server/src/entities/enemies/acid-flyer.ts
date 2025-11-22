import { IGameManagers } from "@/managers/types";
import { Entities } from "@shared/constants";
import { BossEnemy } from "./boss-enemy";
import Collidable from "@/extensions/collidable";
import { AcidFlyerApproachStrategy } from "./strategies/movement";

export class AcidFlyer extends BossEnemy {
  constructor(gameManagers: IGameManagers) {
    super(gameManagers, Entities.ACID_FLYER);

    // Disable collisions entirely for flying acid flyer
    const collidable = this.getExt(Collidable);
    collidable.setEnabled(false);

    // Get config values for movement strategy
    const crossDiveConfig = (this.config as any).crossDiveConfig || {};

    this.setMovementStrategy(
      new AcidFlyerApproachStrategy({
        approachDistance: crossDiveConfig.approachDistance ?? 200,
        diveCooldownDuration: crossDiveConfig.diveCooldownDuration ?? 2,
        acidDropInterval: crossDiveConfig.acidDropInterval ?? 0.3,
      })
    );
    // No attack strategy - acid flyer only drops acid, doesn't attack
  }
}
