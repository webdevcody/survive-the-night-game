import { IGameManagers } from "@/managers/types";
import { Entities, ZOMBIE_ATTACK_RADIUS } from "@shared/constants";
import Vector2 from "@shared/util/vector2";
import { BaseEnemy, MovementStrategy } from "./base-enemy";
import { IEntity } from "@/entities/types";
import { ZombieHurtEvent } from "@shared/events/server-sent/zombie-hurt-event";
import { ZombieDeathEvent } from "@shared/events/server-sent/zombie-death-event";
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
  public static readonly Size = new Vector2(8, 8); // Small size like fast zombie
  public static readonly ZOMBIE_SPEED = 20; // Fastest of all zombies
  private static readonly ATTACK_DAMAGE = 1;
  private static readonly ATTACK_COOLDOWN = 0.5; // Very fast attacks
  public static readonly MAX_HEALTH = 1; // Low health
  private static readonly DROP_CHANCE = 0.2; // Lowest drop chance

  constructor(gameManagers: IGameManagers) {
    super(
      gameManagers,
      Entities.BAT_ZOMBIE,
      BatZombie.Size,
      BatZombie.MAX_HEALTH,
      BatZombie.ATTACK_COOLDOWN,
      BatZombie.ZOMBIE_SPEED,
      BatZombie.DROP_CHANCE,
      ZOMBIE_ATTACK_RADIUS,
      BatZombie.ATTACK_DAMAGE
    );

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

  onDamaged(): void {
    this.getGameManagers().getBroadcaster().broadcastEvent(new ZombieHurtEvent(this.getId()));
  }

  onDeath(): void {
    super.onDeath();
    this.getGameManagers().getBroadcaster().broadcastEvent(new ZombieDeathEvent(this.getId()));
  }
}
