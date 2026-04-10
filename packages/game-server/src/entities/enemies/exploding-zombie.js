import { Entities } from "@shared/constants";
import PoolManager from "@shared/util/pool-manager";
import { BaseEnemy } from "./base-enemy";
import Collidable from "@/extensions/collidable";
import { MeleeMovementStrategy } from "./strategies/movement";
import { MeleeAttackStrategy } from "./strategies/attack";
import Positionable from "@/extensions/positionable";
import Destructible from "@/extensions/destructible";
import { ExplosionEvent } from "../../../../game-shared/src/events/server-sent/events/explosion-event";
import { getConfig } from "@shared/config";
import { distance } from "@/util/physics";
export class ExplodingZombie extends BaseEnemy {
    constructor(gameManagers) {
        super(gameManagers, Entities.EXPLODING_ZOMBIE);
        // Override collision box size and offset for smaller zombie
        const poolManager = PoolManager.getInstance();
        const collidable = this.getExt(Collidable);
        const collisionThreshold = getConfig().boss.EXPLODING_ZOMBIE_COLLISION_THRESHOLD;
        collidable
            .setSize(this.config.stats.size)
            .setOffset(poolManager.vector2.claim(collisionThreshold, collisionThreshold));
        this.setMovementStrategy(new MeleeMovementStrategy());
        const attackStrategy = new MeleeAttackStrategy();
        attackStrategy.onEntityDamaged = this.onEntityDamaged.bind(this);
        this.setAttackStrategy(attackStrategy);
    }
    getAttackCooldown() {
        return this.attackCooldown;
    }
    getAttackDamage() {
        return this.attackDamage;
    }
    onEntityDamaged(entity) {
        const position = this.getExt(Positionable).getCenterPosition();
        const nearbyEntities = this.getEntityManager().getNearbyEntities(position, ExplodingZombie.EXPLOSION_RADIUS);
        // Damage all destructible entities in explosion radius
        for (const entity of nearbyEntities) {
            if (!entity.hasExt(Destructible))
                continue;
            const entityPos = entity.getExt(Positionable).getCenterPosition();
            const dist = distance(position, entityPos);
            if (dist <= ExplodingZombie.EXPLOSION_RADIUS) {
                // Scale damage based on distance from explosion
                const damageScale = 1 - dist / ExplodingZombie.EXPLOSION_RADIUS;
                const damage = Math.ceil(getConfig().boss.EXPLODING_ZOMBIE_EXPLOSION_DAMAGE * damageScale);
                entity.getExt(Destructible).damage(damage, this.getId());
            }
        }
        // Broadcast explosion event for client to show particle effect
        this.getEntityManager().getBroadcaster().broadcastEvent(new ExplosionEvent({
            position,
        }));
        // Remove the zombie
        this.getEntityManager().markEntityForRemoval(this);
    }
}
ExplodingZombie.EXPLOSION_RADIUS = getConfig().combat.EXPLOSION_RADIUS_SMALL;
