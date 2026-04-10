import { Entities } from "@/constants";
import { BaseEnemy } from "./base-enemy";
import { MeleeMovementStrategy } from "./strategies/movement";
import { MeleeAttackStrategy } from "./strategies/attack";
export class Zombie extends BaseEnemy {
    constructor(gameManagers) {
        super(gameManagers, Entities.ZOMBIE);
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
