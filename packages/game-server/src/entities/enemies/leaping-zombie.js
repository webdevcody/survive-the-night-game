import { Entities } from "@shared/constants";
import PoolManager from "@shared/util/pool-manager";
import { BaseEnemy } from "./base-enemy";
import Collidable from "@/extensions/collidable";
import { LeapingMovementStrategy, LeapingState } from "./strategies/movement";
import { LeapingAttackStrategy } from "./strategies/attack";
export class LeapingZombie extends BaseEnemy {
    constructor(gameManagers) {
        super(gameManagers, Entities.LEAPING_ZOMBIE);
        this.positionThreshold = 4; // Larger threshold for faster speed
        if (!this.config.leapConfig) {
            throw new Error("LeapingZombie requires leapConfig in zombie config");
        }
        const poolManager = PoolManager.getInstance();
        const collidable = this.getExt(Collidable);
        collidable
            .setSize(this.config.stats.size)
            .setOffset(poolManager.vector2.claim(this.positionThreshold, this.positionThreshold));
        // Create shared state between movement and attack strategies
        const leapingState = new LeapingState();
        this.setMovementStrategy(new LeapingMovementStrategy(leapingState));
        this.setAttackStrategy(new LeapingAttackStrategy(leapingState, this.config.leapConfig));
    }
    getAttackCooldown() {
        return this.attackCooldown;
    }
    getAttackDamage() {
        return this.attackDamage;
    }
}
