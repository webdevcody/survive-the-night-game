import { IGameManagers } from "@/managers/types";
import { ZombieDeathEvent } from "@shared/events/server-sent/zombie-death-event";
import { ZombieAttackedEvent } from "@shared/events/server-sent/zombie-attacked-event";
import { Entities } from "@/constants";
import { IEntity } from "@/entities/types";
import Vector2 from "@/util/vector2";
import { ZombieHurtEvent } from "@/events/server-sent/zombie-hurt-event";
import { BaseEnemy } from "./base-enemy";
import Groupable from "@/extensions/groupable";
import { AcidProjectile } from "../projectiles/acid-projectile";
import Positionable from "@/extensions/positionable";
import Movable from "@/extensions/movable";
import Destructible from "@/extensions/destructible";
import { pathTowards, velocityTowards } from "@/util/physics";

export class SpitterZombie extends BaseEnemy {
  public static readonly Size = new Vector2(16, 16);
  private static readonly ZOMBIE_SPEED = 25; // Slower than regular zombie
  private static readonly ATTACK_DAMAGE = 2;
  private static readonly ATTACK_COOLDOWN = 2; // Longer cooldown for ranged attack
  private static readonly ATTACK_RADIUS = 100; // Much larger attack radius
  public static readonly MAX_HEALTH = 2; // Less health than regular zombie
  private static readonly DROP_CHANCE = 0.5;

  constructor(gameManagers: IGameManagers) {
    super(
      gameManagers,
      Entities.SPITTER_ZOMBIE,
      SpitterZombie.Size,
      SpitterZombie.MAX_HEALTH,
      SpitterZombie.ATTACK_COOLDOWN,
      SpitterZombie.ZOMBIE_SPEED,
      SpitterZombie.DROP_CHANCE
    );
  }

  onDamaged(): void {
    this.getGameManagers().getBroadcaster().broadcastEvent(new ZombieHurtEvent(this.getId()));
  }

  onDeath(): void {
    super.onDeath();
    this.getGameManagers().getBroadcaster().broadcastEvent(new ZombieDeathEvent(this.getId()));
  }

  protected updateEnemy(deltaTime: number): void {
    this.attackCooldown.update(deltaTime);
    this.pathRecalculationTimer += deltaTime;

    const destructible = this.getExt(Destructible);
    if (destructible.isDead()) {
      return;
    }

    const player = this.getEntityManager().getClosestAlivePlayer(this);
    if (!player) return;

    // Check if we're within attack range of the player
    const withinRange = this.withinAttackRange(player, SpitterZombie.ATTACK_RADIUS);

    // If we're within range, stop moving and face the player
    if (withinRange) {
      const movable = this.getExt(Movable);
      movable.setVelocity(Vector2.ZERO);
      this.currentWaypoint = null;
    } else {
      // If we're not in range, move towards the player like normal zombies
      if (this.pathRecalculationTimer >= BaseEnemy.PATH_RECALCULATION_INTERVAL) {
        this.currentWaypoint = pathTowards(
          this.getCenterPosition(),
          player.getExt(Positionable).getCenterPosition(),
          this.getGameManagers().getMapManager().getMap()
        );
        this.pathRecalculationTimer = 0;
      }

      const movable = this.getExt(Movable);
      const velocity = movable.getVelocity();

      // Update velocity to move towards waypoint if we have one
      if (this.currentWaypoint) {
        const velocityVector = velocityTowards(this.getCenterPosition(), this.currentWaypoint);
        velocity.x = velocityVector.x * this.speed;
        velocity.y = velocityVector.y * this.speed;
      } else {
        velocity.x = 0;
        velocity.y = 0;
      }

      movable.setVelocity(velocity);
    }

    this.handleMovement(deltaTime);
    this.handleAttack();
  }

  protected attemptAttackEntity(entity: IEntity): boolean {
    if (!this.attackCooldown.isReady()) return false;

    const withinRange = this.withinAttackRange(entity, SpitterZombie.ATTACK_RADIUS);
    if (!withinRange) return false;

    // Only attack friendly groups (players and their structures)
    if (!entity.hasExt(Groupable) || entity.getExt(Groupable).getGroup() !== "friendly") {
      return false;
    }

    // Get target position - all entities should have Positionable extension
    if (!entity.hasExt(Positionable)) {
      return false;
    }

    // Spawn acid projectile that travels towards the target
    const projectile = new AcidProjectile(
      this.getGameManagers(),
      this.getCenterPosition(),
      entity.getExt(Positionable).getCenterPosition()
    );
    this.getEntityManager().addEntity(projectile);

    this.getGameManagers().getBroadcaster().broadcastEvent(new ZombieAttackedEvent(this.getId()));
    this.attackCooldown.reset();
    return true;
  }
}
