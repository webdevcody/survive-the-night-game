import { BaseEnemy, AttackStrategy } from "../../base-enemy";
import { IEntity } from "@/entities/types";
import Movable from "@/extensions/movable";
import Destructible from "@/extensions/destructible";
import { Cooldown } from "@/entities/util/cooldown";
import { getConfig } from "@shared/config";
import { ZombieAttackedEvent } from "@/events/server-sent/zombie-attacked-event";
import { LeapConfig } from "@shared/entities";
import { velocityTowards } from "@/util/physics";
import { TargetingSystem } from "../targeting";
import { LeapingState } from "../movement/leaping-movement";
import { Entities } from "@/constants";
import PoolManager from "@shared/util/pool-manager";

export class LeapingAttackStrategy implements AttackStrategy {
  private leapCooldown: Cooldown;
  private leapDuration: number = 0;
  private leapingState: LeapingState;
  private leapConfig: LeapConfig;

  onEntityDamaged?: (entity: IEntity) => void;

  constructor(leapingState: LeapingState, leapConfig: LeapConfig) {
    this.leapingState = leapingState;
    this.leapConfig = leapConfig;
    this.leapCooldown = new Cooldown(leapConfig.leapCooldown);
  }

  update(zombie: BaseEnemy, deltaTime: number): void {
    this.leapCooldown.update(deltaTime);

    const playerTarget = TargetingSystem.findClosestPlayer(zombie);
    if (!playerTarget) return;

    const playerPos = playerTarget.position;
    const zombiePos = zombie.getCenterPosition();
    const distanceToPlayer = playerTarget.distance;

    // Handle leap duration countdown
    if (this.leapingState.isLeaping) {
      this.leapDuration += deltaTime;
      if (this.leapDuration >= this.leapConfig.leapDuration) {
        this.leapingState.isLeaping = false;
        this.leapDuration = 0;
      }
    }

    // Check if we should initiate a leap (player in sweet spot range)
    if (
      !this.leapingState.isLeaping &&
      this.leapCooldown.isReady() &&
      distanceToPlayer > getConfig().combat.ZOMBIE_ATTACK_RADIUS && // Not too close
      distanceToPlayer <= this.leapConfig.leapRange // Not too far
    ) {
      // Initiate leap - apply velocity boost
      const leapVelocity = velocityTowards(zombiePos.clone(), playerPos.clone());
      const poolManager = PoolManager.getInstance();
      zombie.getExt(Movable).setVelocity(
        poolManager.vector2.claim(
          leapVelocity.x * this.leapConfig.leapSpeed,
          leapVelocity.y * this.leapConfig.leapSpeed
        )
      );
      this.leapingState.isLeaping = true;
      this.leapDuration = 0;
      this.leapCooldown.reset();
    }

    // Normal melee attack - always attack if close enough and cooldown ready
    if (zombie.getAttackCooldown().isReady()) {
      const attackRadius = getConfig().combat.ZOMBIE_ATTACK_RADIUS;
      const closestTarget = TargetingSystem.findClosestAttackableEntity(zombie, attackRadius);
      // Attack the closest entity
      if (closestTarget && closestTarget.entity.hasExt(Destructible)) {
        closestTarget.entity.getExt(Destructible).damage(zombie.getAttackDamage());

        if (this.onEntityDamaged) {
          this.onEntityDamaged(closestTarget.entity);
        }

        zombie
          .getGameManagers()
          .getBroadcaster()
          .broadcastEvent(new ZombieAttackedEvent(zombie.getId()));
        zombie.getAttackCooldown().reset();
      }
    }
  }
}
