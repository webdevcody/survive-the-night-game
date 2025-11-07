import { IGameManagers } from "@/managers/types";
import { Entities } from "@shared/constants";
import { BaseEnemy, MovementStrategy } from "./base-enemy";
import Collidable from "@/extensions/collidable";
import Movable from "@/extensions/movable";
import Positionable from "@/extensions/positionable";
import { velocityTowards } from "@/util/physics";
import { MeleeAttackStrategy } from "./zombie";
import { Cooldown } from "@/entities/util/cooldown";

class FlyTowardsPlayerStrategy implements MovementStrategy {
  update(zombie: BaseEnemy, deltaTime: number): boolean {
    const player = zombie.getEntityManager().getClosestAlivePlayer(zombie);
    if (!player) return true;

    const playerPos = player.getExt(Positionable).getCenterPosition();
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

export class BatZombie extends BaseEnemy {
  constructor(gameManagers: IGameManagers) {
    super(gameManagers, Entities.BAT_ZOMBIE);

    // Disable collisions entirely for flying bats
    const collidable = this.getExt(Collidable);
    collidable.setEnabled(false);

    this.setMovementStrategy(new FlyTowardsPlayerStrategy());
    this.setAttackStrategy(new MeleeAttackStrategy());
  }

  getAttackCooldown(): Cooldown {
    return this.attackCooldown;
  }

  getAttackDamage(): number {
    return this.attackDamage;
  }
}
