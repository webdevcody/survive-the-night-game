import { Entities } from "@/constants";
import { BaseEnemy } from "./base-enemy";
import { RangedMovementStrategy } from "./strategies/movement";
import { RangedAttackStrategy } from "./strategies/attack";
export class SpitterZombie extends BaseEnemy {
    constructor(gameManagers) {
        super(gameManagers, Entities.SPITTER_ZOMBIE);
        this.setMovementStrategy(new RangedMovementStrategy());
        this.setAttackStrategy(new RangedAttackStrategy());
    }
    getAttackCooldown() {
        return this.attackCooldown;
    }
}
