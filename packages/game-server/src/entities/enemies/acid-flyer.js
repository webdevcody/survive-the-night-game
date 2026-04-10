import { Entities } from "@shared/constants";
import { BossEnemy } from "./boss-enemy";
import Collidable from "@/extensions/collidable";
import { AcidFlyerApproachStrategy } from "./strategies/movement";
export class AcidFlyer extends BossEnemy {
    constructor(gameManagers) {
        var _a, _b, _c;
        super(gameManagers, Entities.ACID_FLYER);
        // Disable collisions entirely for flying acid flyer
        const collidable = this.getExt(Collidable);
        collidable.setEnabled(false);
        // Get config values for movement strategy
        const crossDiveConfig = this.config.crossDiveConfig || {};
        this.setMovementStrategy(new AcidFlyerApproachStrategy({
            approachDistance: (_a = crossDiveConfig.approachDistance) !== null && _a !== void 0 ? _a : 200,
            diveCooldownDuration: (_b = crossDiveConfig.diveCooldownDuration) !== null && _b !== void 0 ? _b : 2,
            acidDropInterval: (_c = crossDiveConfig.acidDropInterval) !== null && _c !== void 0 ? _c : 0.3,
        }));
        // No attack strategy - acid flyer only drops acid, doesn't attack
    }
}
