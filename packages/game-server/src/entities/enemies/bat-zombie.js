import { Entities } from "@shared/constants";
import { BaseEnemy } from "./base-enemy";
import Collidable from "@/extensions/collidable";
import { FlyTowardsPlayerStrategy } from "./strategies/movement";
import { MeleeAttackStrategy } from "./strategies/attack";
export class BatZombie extends BaseEnemy {
    constructor(gameManagers) {
        super(gameManagers, Entities.BAT_ZOMBIE);
        // Disable collisions entirely for flying bats
        const collidable = this.getExt(Collidable);
        collidable.setEnabled(false);
        this.setMovementStrategy(new FlyTowardsPlayerStrategy());
        this.setAttackStrategy(new MeleeAttackStrategy());
    }
    getAttackCooldown() {
        return this.attackCooldown;
    }
    getAttackDamage() {
        return this.attackDamage;
    }
}
