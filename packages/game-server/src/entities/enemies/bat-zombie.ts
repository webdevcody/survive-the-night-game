import { IGameManagers } from "@/managers/types";
import { Entities } from "@shared/constants";
import Vector2 from "@shared/util/vector2";
import { BaseEnemy } from "./base-enemy";
import { IEntity } from "@/entities/types";
import { ZombieAttackedEvent } from "@shared/events/server-sent/zombie-attacked-event";
import { ZombieHurtEvent } from "@shared/events/server-sent/zombie-hurt-event";
import { ZombieDeathEvent } from "@shared/events/server-sent/zombie-death-event";
import Destructible from "@/extensions/destructible";
import Collidable from "@/extensions/collidable";
import Movable from "@/extensions/movable";
import { Player } from "../player";
import { velocityTowards } from "@/util/physics";

export class BatZombie extends BaseEnemy {
  public static readonly Size = new Vector2(8, 8); // Small size like fast zombie
  private static readonly ZOMBIE_SPEED = 40; // Fastest of all zombies
  private static readonly ATTACK_RADIUS = 10; // Small attack radius
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
      BatZombie.DROP_CHANCE
    );

    // Disable collisions entirely for flying bats
    const collidable = this.getExt(Collidable);
    collidable.setEnabled(false);
  }

  onDamaged(): void {
    this.getGameManagers().getBroadcaster().broadcastEvent(new ZombieHurtEvent(this.getId()));
  }

  onDeath(): void {
    super.onDeath();
    this.getGameManagers().getBroadcaster().broadcastEvent(new ZombieDeathEvent(this.getId()));
  }

  protected attemptAttackEntity(entity: IEntity): boolean {
    if (!this.attackCooldown.isReady()) return false;

    const withinRange = this.withinAttackRange(entity, BatZombie.ATTACK_RADIUS);
    if (!withinRange) return false;

    if (entity.hasExt(Destructible) && entity instanceof Player) {
      entity.getExt(Destructible).damage(BatZombie.ATTACK_DAMAGE);
      this.getGameManagers().getBroadcaster().broadcastEvent(new ZombieAttackedEvent(this.getId()));
      this.attackCooldown.reset();
      return true;
    }

    return false;
  }

  // Override handleMovement to ignore collisions with walls and zombies
  handleMovement(deltaTime: number) {
    const position = this.getPosition();
    const movable = this.getExt(Movable);
    const velocity = movable.getVelocity();

    // Simply update position based on velocity without collision checks
    position.x += velocity.x * deltaTime;
    position.y += velocity.y * deltaTime;
    this.setPosition(position);
  }

  // Override updateEnemy to fly directly towards player
  protected updateEnemy(deltaTime: number): void {
    this.attackCooldown.update(deltaTime);

    const destructible = this.getExt(Destructible);
    if (destructible.isDead()) {
      return;
    }

    const player = this.getEntityManager().getClosestAlivePlayer(this);
    const movable = this.getExt(Movable);

    if (player) {
      // Fly directly towards player
      const velocityVector = velocityTowards(
        this.getCenterPosition(),
        (player as Player).getCenterPosition()
      );
      movable.setVelocity(
        new Vector2(velocityVector.x * this.speed, velocityVector.y * this.speed)
      );

      // For debugging, update waypoint to show where we're heading
      this.currentWaypoint = (player as Player).getCenterPosition();
    } else {
      movable.setVelocity(new Vector2(0, 0));
      this.currentWaypoint = null;
    }

    this.handleMovement(deltaTime);
    this.handleAttack();
  }
}
