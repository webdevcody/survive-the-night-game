import { BaseEnemy, MovementStrategy } from "../../base-enemy";
import Movable from "@/extensions/movable";
import Vector2 from "@/util/vector2";
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
      movable.setVelocity(new Vector2(0, 0));
      return true;
    }

    // Calculate velocity directly towards target (no pathfinding since it's flying)
    const velocity = velocityTowards(zombiePos, currentTarget);
    const movable = zombie.getExt(Movable);
    movable.setVelocity(velocity.mul(zombie.getSpeed()));

    // Update position directly without collision checks
    const position = zombie.getPosition();
    position.x += movable.getVelocity().x * deltaTime;
    position.y += movable.getVelocity().y * deltaTime;
    zombie.setPosition(position);

    return true; // We handled movement completely
  }
}

