import { BaseEnemy, AttackStrategy } from "../../base-enemy";
import { SpitterZombie } from "../../spitter-zombie";
import { AcidProjectile } from "@/entities/projectiles/acid-projectile";
import { ZombieAttackedEvent } from "../../../../../../game-shared/src/events/server-sent/events/zombie-attacked-event";
import { TargetingSystem } from "../targeting";
import { getConfig } from "@shared/config";

export class RangedAttackStrategy implements AttackStrategy {
  private static readonly ATTACK_RANGE = getConfig().combat.RANGED_ATTACK_RANGE;

  update(zombie: BaseEnemy, deltaTime: number): void {
    if (!(zombie instanceof SpitterZombie)) return;
    if (!zombie.getAttackCooldown().isReady()) return;

    const playerTarget = TargetingSystem.findClosestPlayer(
      zombie,
      RangedAttackStrategy.ATTACK_RANGE
    );
    if (!playerTarget) return;

    const playerPos = playerTarget.position;
    const zombiePos = zombie.getCenterPosition();

    if (playerTarget.distance <= RangedAttackStrategy.ATTACK_RANGE) {
      // Spawn acid projectile that travels towards the target
      const projectile = new AcidProjectile(zombie.getGameManagers(), zombiePos, playerPos);
      zombie.getEntityManager().addEntity(projectile);

      zombie
        .getGameManagers()
        .getBroadcaster()
        .broadcastEvent(new ZombieAttackedEvent(zombie.getId()));
      zombie.getAttackCooldown().reset();
    }
  }
}
