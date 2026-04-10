import { Entities } from "@/constants";
import PoolManager from "@shared/util/pool-manager";
import { BaseEnemy } from "./base-enemy";
import { Player } from "@/entities/players/player";
import { normalizeVector } from "@/util/physics";
import Movable from "@/extensions/movable";
import { MeleeMovementStrategy } from "./strategies/movement";
import { MeleeAttackStrategy } from "./strategies/attack";
import { getConfig } from "@shared/config";
export class BigZombie extends BaseEnemy {
    constructor(gameManagers) {
        super(gameManagers, Entities.BIG_ZOMBIE);
        const attackStrategy = new MeleeAttackStrategy();
        attackStrategy.onEntityDamaged = (entity) => {
            // Apply knockback if it's a player
            if (entity instanceof Player) {
                const knockbackDirection = normalizeVector(PoolManager.getInstance().vector2.claim(entity.getCenterPosition().x - this.getCenterPosition().x, entity.getCenterPosition().y - this.getCenterPosition().y));
                const poolManager = PoolManager.getInstance();
                const knockbackForce = getConfig().boss.BIG_ZOMBIE_KNOCKBACK_FORCE;
                const knockbackVelocity = poolManager.vector2.claim(knockbackDirection.x * knockbackForce, knockbackDirection.y * knockbackForce);
                entity.getExt(Movable).setVelocity(knockbackVelocity);
            }
        };
        this.setMovementStrategy(new MeleeMovementStrategy());
        this.setAttackStrategy(attackStrategy);
    }
    getAttackCooldown() {
        return this.attackCooldown;
    }
    getAttackDamage() {
        return this.attackDamage;
    }
}
