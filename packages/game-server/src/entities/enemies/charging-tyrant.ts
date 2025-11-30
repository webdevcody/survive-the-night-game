import { BossEnemy } from "./boss-enemy";
import { IGameManagers } from "@/managers/types";
import { Entities } from "@/constants";
import { MeleeMovementStrategy, ChargingMovementStrategy } from "./strategies/movement";
import { GroundSlamAttackStrategy } from "./strategies/attack";
import { Cooldown } from "@/entities/util/cooldown";
import Positionable from "@/extensions/positionable";
import Destructible from "@/extensions/destructible";
import Movable from "@/extensions/movable";
import { TargetingSystem } from "./strategies/targeting";
import PoolManager from "@shared/util/pool-manager";
import Vector2 from "@/util/vector2";
import { getConfig } from "@shared/config";
import { distance } from "@/util/physics";

enum ChargingState {
  WALKING, // Normal pathfinding to players
  CHARGING, // Fast charge toward player
  SLAMMING, // Performing ground slam
  RECOVERING, // 2 second cooldown after slam
}

export class ChargingTyrant extends BossEnemy {
  private chargeConfig: {
    chargeDistanceThreshold: number;
    slamDistanceThreshold: number;
    recoveryTime: number;
    chargeSpeedMultiplier: number;
    slamRadius: number;
    slamDamage: number;
    knockbackForce: number;
  };

  private state: ChargingState = ChargingState.WALKING;
  private recoveryCooldown: Cooldown;
  private chargingMovementStrategy: ChargingMovementStrategy;
  private walkingMovementStrategy = new MeleeMovementStrategy();
  private groundSlamStrategy: GroundSlamAttackStrategy;
  private chargeTarget: { position: Vector2 } | null = null;
  private lastChargePosition: Vector2 | null = null;
  private wallCollisionTimer: number = 0;

  constructor(gameManagers: IGameManagers) {
    super(gameManagers, Entities.CHARGING_TYRANT);

    if (!this.config.chargeConfig) {
      throw new Error("ChargingTyrant requires chargeConfig in zombie config");
    }

    this.chargeConfig = this.config.chargeConfig;
    this.recoveryCooldown = new Cooldown(this.chargeConfig.recoveryTime);
    this.chargingMovementStrategy = new ChargingMovementStrategy(
      this.chargeConfig.chargeSpeedMultiplier
    );
    this.groundSlamStrategy = new GroundSlamAttackStrategy(
      this.chargeConfig.slamRadius,
      this.chargeConfig.slamDamage,
      this.chargeConfig.knockbackForce
    );

    this.setMovementStrategy(this.walkingMovementStrategy);
    this.setAttackStrategy(this.groundSlamStrategy);
  }

  protected override updateEnemy(deltaTime: number): void {
    super.updateEnemy(deltaTime);

    const destructible = this.getExt(Destructible);
    if (destructible.isDead()) {
      return;
    }

    this.updateChargingBehavior(deltaTime);
    this.detectWallCollision(deltaTime);
  }

  override handleMovement(deltaTime: number): void {
    // Store position before movement for wall collision detection
    if (this.state === ChargingState.CHARGING) {
      const positionable = this.getExt(Positionable);
      this.lastChargePosition = positionable.getPosition().clone();
    }

    // Call parent implementation
    super.handleMovement(deltaTime);
  }

  private detectWallCollision(deltaTime: number): void {
    // Only check for wall collisions while charging
    if (this.state !== ChargingState.CHARGING) {
      this.wallCollisionTimer = 0;
      this.lastChargePosition = null;
      return;
    }

    const positionable = this.getExt(Positionable);
    const movable = this.getExt(Movable);
    const currentPosition = positionable.getPosition();
    const velocity = movable.getVelocity();

    // Check if we have velocity but aren't moving (hitting a wall)
    const hasVelocity = Math.abs(velocity.x) > 0.1 || Math.abs(velocity.y) > 0.1;

    if (hasVelocity && this.lastChargePosition) {
      const distanceMoved = distance(currentPosition, this.lastChargePosition);

      // If we have velocity but moved very little, we're likely hitting a wall
      if (distanceMoved < 2) {
        this.wallCollisionTimer += deltaTime;

        // If we've been stuck for a short time, trigger ground slam
        if (this.wallCollisionTimer >= getConfig().boss.CHARGING_TYRANT_WALL_COLLISION_DETECTION_TIME) {
          this.performGroundSlam();
          this.state = ChargingState.RECOVERING;
          this.recoveryCooldown.reset();
          this.setMovementStrategy(this.walkingMovementStrategy);
          this.chargeTarget = null;
          this.wallCollisionTimer = 0;
          this.lastChargePosition = null;

          // Stop movement during recovery
          const poolManager = PoolManager.getInstance();
          movable.setVelocity(poolManager.vector2.claim(0, 0));
        }
      } else {
        // We're moving, reset the timer
        this.wallCollisionTimer = 0;
        this.lastChargePosition = currentPosition.clone();
      }
    } else if (!hasVelocity) {
      // No velocity, reset timer
      this.wallCollisionTimer = 0;
    }
  }

  private updateChargingBehavior(deltaTime: number): void {
    const position = this.getExt(Positionable).getCenterPosition();
    const target = TargetingSystem.findClosestPlayer(this, 1000);

    switch (this.state) {
      case ChargingState.WALKING:
        // Check if we should start charging
        if (target && target.distance <= this.chargeConfig.chargeDistanceThreshold) {
          this.state = ChargingState.CHARGING;
          this.chargeTarget = { position: target.position.clone() };
          this.setMovementStrategy(this.chargingMovementStrategy);
        }
        break;

      case ChargingState.CHARGING:
        if (!target) {
          // Lost target, go back to walking
          this.state = ChargingState.WALKING;
          this.setMovementStrategy(this.walkingMovementStrategy);
          this.chargeTarget = null;
          break;
        }

        // Update charge target
        this.chargeTarget = { position: target.position.clone() };

        // Check if we're close enough to slam
        const distanceToTarget = distance(position, target.position);
        if (distanceToTarget <= this.chargeConfig.slamDistanceThreshold) {
          this.performGroundSlam();
          this.state = ChargingState.RECOVERING;
          this.recoveryCooldown.reset();
          this.setMovementStrategy(this.walkingMovementStrategy);
          this.chargeTarget = null;

          // Stop movement during recovery
          const poolManager = PoolManager.getInstance();
          this.getExt(Movable).setVelocity(poolManager.vector2.claim(0, 0));
        }
        break;

      case ChargingState.RECOVERING:
        this.recoveryCooldown.update(deltaTime);
        if (this.recoveryCooldown.isReady()) {
          this.state = ChargingState.WALKING;
        }
        break;
    }
  }

  private performGroundSlam(): void {
    this.groundSlamStrategy.performGroundSlam(this);
  }
}
