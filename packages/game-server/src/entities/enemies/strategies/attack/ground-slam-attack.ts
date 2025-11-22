import { BaseEnemy, AttackStrategy } from "../../base-enemy";
import { IEntity } from "@/entities/types";
import Vector2 from "@/util/vector2";
import Destructible from "@/extensions/destructible";
import Positionable from "@/extensions/positionable";
import Movable from "@/extensions/movable";
import { Player } from "@/entities/players/player";
import PoolManager from "@shared/util/pool-manager";
import { normalizeVector } from "@/util/physics";
import { ExplosionEvent } from "../../../../../../game-shared/src/events/server-sent/events/explosion-event";

export class GroundSlamAttackStrategy implements AttackStrategy {
  private slamRadius: number;
  private slamDamage: number;
  private knockbackForce: number;

  constructor(slamRadius: number = 64, slamDamage: number = 1, knockbackForce: number = 400) {
    this.slamRadius = slamRadius;
    this.slamDamage = slamDamage;
    this.knockbackForce = knockbackForce;
  }

  update(zombie: BaseEnemy, _deltaTime: number): void {
    // This attack is triggered manually, not automatically
    // The enemy class will call performGroundSlam when needed
  }

  /**
   * Performs a ground slam attack dealing damage and knockback in a radius
   */
  performGroundSlam(zombie: BaseEnemy): void {
    const position = zombie.getExt(Positionable).getCenterPosition();
    const nearbyEntities = zombie.getEntityManager().getNearbyEntities(position, this.slamRadius);

    // Damage and knockback all destructible entities in slam radius
    for (const entity of nearbyEntities) {
      if (!entity.hasExt(Destructible) || !entity.hasExt(Positionable)) continue;

      const entityPos = entity.getExt(Positionable).getCenterPosition();
      const dist = position.distance(entityPos);

      if (dist <= this.slamRadius) {
        // Deal damage
        entity.getExt(Destructible).damage(this.slamDamage, zombie.getId());

        // Apply knockback to players
        if (entity instanceof Player && entity.hasExt(Movable)) {
          const knockbackDirection = normalizeVector(
            PoolManager.getInstance().vector2.claim(
              entityPos.x - position.x,
              entityPos.y - position.y
            )
          );

          const poolManager = PoolManager.getInstance();
          const knockbackVelocity = poolManager.vector2.claim(
            knockbackDirection.x * this.knockbackForce,
            knockbackDirection.y * this.knockbackForce
          );

          entity.getExt(Movable).setVelocity(knockbackVelocity);

          // Release pooled vectors
          poolManager.vector2.release(knockbackDirection);
          poolManager.vector2.release(knockbackVelocity);
        }
      }
    }

    // Broadcast explosion event for visual effect
    zombie.getEntityManager().getBroadcaster().broadcastEvent(
      new ExplosionEvent({
        position,
      })
    );
  }
}
