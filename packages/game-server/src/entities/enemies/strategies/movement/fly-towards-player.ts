import { BaseEnemy, MovementStrategy } from "../../base-enemy";
import Movable from "@/extensions/movable";
import Positionable from "@/extensions/positionable";
import { velocityTowards } from "@/util/physics";
import { TargetingSystem } from "../targeting";

export class FlyTowardsPlayerStrategy implements MovementStrategy {
  update(zombie: BaseEnemy, deltaTime: number): boolean {
    const playerTarget = TargetingSystem.findClosestPlayer(zombie);
    if (!playerTarget) return true;

    const playerPos = playerTarget.position;
    const zombiePos = zombie.getCenterPosition();

    // Calculate velocity directly towards player (no pathfinding since it's flying)
    const velocity = velocityTowards(zombiePos, playerPos);
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

