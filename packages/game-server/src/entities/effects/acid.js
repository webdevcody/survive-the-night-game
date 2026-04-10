import Expirable from "@/extensions/expirable";
import Positionable from "@/extensions/positionable";
import { Entity } from "@/entities/entity";
import PoolManager from "@shared/util/pool-manager";
import AcidTrigger from "@/extensions/acid-trigger";
export class Acid extends Entity {
    static get Size() {
        return PoolManager.getInstance().vector2.claim(16, 16);
    }
    constructor(gameManagers) {
        super(gameManagers, "acid");
        const poolManager = PoolManager.getInstance();
        const size = poolManager.vector2.claim(16, 16);
        this.addExtension(new Positionable(this).setSize(size));
        this.addExtension(new Expirable(this, 3)); // Expires after 3 seconds
        // Add acid trigger that adds poison to players who walk over it
        this.addExtension(new AcidTrigger(this, {
            triggerCooldown: 0.25, // Check every 0.5 seconds
            poisonMaxDamage: 3,
            poisonDamagePerTick: 1,
            poisonDamageInterval: 1,
        }));
    }
}
