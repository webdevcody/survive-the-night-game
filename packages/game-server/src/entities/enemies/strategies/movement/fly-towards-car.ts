import { BaseEnemy, MovementStrategy } from "../../base-enemy";
import Movable from "@/extensions/movable";
import Vector2 from "@/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import { velocityTowards } from "@/util/physics";
import { calculateSeparationForce, blendSeparationForce } from "../separation";

/**
 * Movement strategy that flies directly towards the car (not players).
 * Used by flying enemies that should target the car specifically.
 */
export class FlyTowardsCarStrategy implements MovementStrategy {
  update(zombie: BaseEnemy, deltaTime: number): boolean {
    const zombiePos = zombie.getCenterPosition();

    // Get car location from map manager
    const mapManager = zombie.getGameManagers().getMapManager();
    const carLocation = mapManager.getCarLocation();

    // If no car location, stop moving
    if (!carLocation) {
      const movable = zombie.getExt(Movable);
      const poolManager = PoolManager.getInstance();
      movable.setVelocity(poolManager.vector2.claim(0, 0));
      return true;
    }

    // Calculate velocity directly towards car (no pathfinding since it's flying)
    const zombiePosClone = zombiePos.clone();
    const carLocationClone = carLocation.clone();
    const pathfindingVelocity = velocityTowards(zombiePosClone, carLocationClone);
    const movable = zombie.getExt(Movable);
    const poolManager = PoolManager.getInstance();
    const pathfindingVelScaled = poolManager.vector2.claim(
      pathfindingVelocity.x * zombie.getSpeed(),
      pathfindingVelocity.y * zombie.getSpeed()
    );

    // Apply separation force to avoid clustering
    const separationForce = calculateSeparationForce(zombie);
    const finalVelocity = blendSeparationForce(pathfindingVelScaled, separationForce);

    movable.setVelocity(finalVelocity);

    // Release pooled vectors (finalVelocity values are copied by Movable)
    poolManager.vector2.release(zombiePosClone);
    poolManager.vector2.release(carLocationClone);
    poolManager.vector2.release(pathfindingVelocity);
    poolManager.vector2.release(pathfindingVelScaled);
    poolManager.vector2.release(separationForce);
    poolManager.vector2.release(finalVelocity);

    // Update position directly without collision checks
    const position = zombie.getPosition();
    position.x += movable.getVelocity().x * deltaTime;
    position.y += movable.getVelocity().y * deltaTime;
    zombie.setPosition(position);

    return true; // We handled movement completely
  }
}
