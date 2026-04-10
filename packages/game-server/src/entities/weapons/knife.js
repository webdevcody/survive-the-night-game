import { Weapon } from "@/entities/weapons/weapon";
import { performMeleeAttack } from "./helpers";
import { getConfig } from "@shared/config";
export class Knife extends Weapon {
    constructor(gameManagers) {
        super(gameManagers, "knife");
    }
    getCooldown() {
        return this.getConfig().stats.cooldown;
    }
    attack(playerId, position, facing, aimAngle) {
        // Use game mode strategy to determine valid targets
        const strategy = this.getGameManagers().getGameServer().getGameLoop().getGameModeStrategy();
        performMeleeAttack({
            entityManager: this.getEntityManager(),
            gameManagers: this.getGameManagers(),
            attackerId: playerId,
            position,
            facing,
            aimAngle,
            attackRange: getConfig().combat.KNIFE_ATTACK_RANGE,
            damage: this.getConfig().stats.damage,
            knockbackDistance: this.getConfig().stats.pushDistance,
            weaponKey: this.getType(),
            targetFilter: (entity, attackerId) => {
                return strategy.shouldDamageTarget(this, entity, attackerId);
            },
        });
    }
}
