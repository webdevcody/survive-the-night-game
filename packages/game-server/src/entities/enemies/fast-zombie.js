import { Entities } from "@shared/constants";
import { BaseEnemy } from "./base-enemy";
import Collidable from "@/extensions/collidable";
import { MeleeMovementStrategy } from "./strategies/movement";
import { MeleeAttackStrategy } from "./strategies/attack";
export class FastZombie extends BaseEnemy {
    // private readonly positionThreshold = 4; // Larger threshold for faster speed
    constructor(gameManagers) {
        super(gameManagers, Entities.FAST_ZOMBIE);
        // Override collision box size and offset for smaller zombie
        const collidable = this.getExt(Collidable);
        collidable.setSize(this.config.stats.size.clone().div(2));
        // .setOffset(poolManager.vector2.claim(this.positionThreshold, this.positionThreshold));
        this.setMovementStrategy(new MeleeMovementStrategy());
        this.setAttackStrategy(new MeleeAttackStrategy());
    }
    getAttackCooldown() {
        return this.attackCooldown;
    }
    getAttackDamage() {
        return this.attackDamage;
    }
}
