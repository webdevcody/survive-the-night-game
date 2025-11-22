import { BaseEnemy, MovementStrategy } from "../../base-enemy";
import Vector2 from "@/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import Movable from "@/extensions/movable";
import Snared from "@/extensions/snared";
import { normalizeVector } from "@/util/physics";
import { TargetingSystem } from "../targeting";

export class ChargingMovementStrategy implements MovementStrategy {
  private chargeSpeedMultiplier: number;

  constructor(chargeSpeedMultiplier: number = 3) {
    this.chargeSpeedMultiplier = chargeSpeedMultiplier;
  }

  update(zombie: BaseEnemy, deltaTime: number): boolean {
    // If zombie is snared, don't move
    if (zombie.hasExt(Snared)) {
      const poolManager = PoolManager.getInstance();
      zombie.getExt(Movable).setVelocity(poolManager.vector2.claim(0, 0));
      return false;
    }

    // Find the closest player
    const target = TargetingSystem.findClosestPlayer(zombie, 1000);
    if (!target) {
      // No player found, stop moving
      const poolManager = PoolManager.getInstance();
      zombie.getExt(Movable).setVelocity(poolManager.vector2.claim(0, 0));
      return false;
    }

    // Calculate direction to player
    const zombiePos = zombie.getCenterPosition();
    const direction = normalizeVector(
      PoolManager.getInstance().vector2.claim(
        target.position.x - zombiePos.x,
        target.position.y - zombiePos.y
      )
    );

    // Move at charge speed directly toward player
    const chargeSpeed = zombie.getSpeed() * this.chargeSpeedMultiplier;
    const poolManager = PoolManager.getInstance();
    const velocity = poolManager.vector2.claim(
      direction.x * chargeSpeed,
      direction.y * chargeSpeed
    );

    zombie.getExt(Movable).setVelocity(velocity);

    // Release pooled vectors
    poolManager.vector2.release(direction);
    poolManager.vector2.release(velocity);

    return false; // Let base enemy handle collision movement
  }
}
