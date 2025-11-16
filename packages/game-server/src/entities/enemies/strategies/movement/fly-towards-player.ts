import { BaseEnemy, MovementStrategy } from "../../base-enemy";
import Movable from "@/extensions/movable";
import Vector2 from "@/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import { velocityTowards } from "@/util/physics";
import { TargetChecker } from "../movement-utils";

export class FlyTowardsPlayerStrategy implements MovementStrategy {
  private targetChecker = new TargetChecker();

  update(zombie: BaseEnemy, deltaTime: number): boolean {
    const zombiePos = zombie.getCenterPosition();

    // Update target using shared utility
    const mapManager = zombie.getGameManagers().getMapManager();
    const carLocation = mapManager.getCarLocation();
    const currentTarget = this.targetChecker.updateTarget(zombie, deltaTime, carLocation);

    // If no target, stop moving
    if (!currentTarget) {
      const movable = zombie.getExt(Movable);
      const poolManager = PoolManager.getInstance();
      movable.setVelocity(poolManager.vector2.claim(0, 0));
      return true;
    }

    // Calculate velocity directly towards target (no pathfinding since it's flying)
    const velocity = velocityTowards(zombiePos.clone(), currentTarget.clone());
    const movable = zombie.getExt(Movable);
    const poolManager = PoolManager.getInstance();
    movable.setVelocity(
      poolManager.vector2.claim(velocity.x * zombie.getSpeed(), velocity.y * zombie.getSpeed())
    );

    // Update position directly without collision checks
    const position = zombie.getPosition();
    position.x += movable.getVelocity().x * deltaTime;
    position.y += movable.getVelocity().y * deltaTime;
    zombie.setPosition(position);

    return true; // We handled movement completely
  }
}

