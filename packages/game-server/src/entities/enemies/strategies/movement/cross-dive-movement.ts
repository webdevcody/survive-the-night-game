import { BaseEnemy, MovementStrategy } from "../../base-enemy";
import Movable from "@/extensions/movable";
import Positionable from "@/extensions/positionable";
import Vector2 from "@/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import { velocityTowards } from "@/util/physics";
import { calculateSeparationForce, blendSeparationForce } from "../separation";
import { Acid } from "@/entities/effects/acid";
import { Cooldown } from "@/entities/util/cooldown";
import { getConfig } from "@shared/config";
import { FlyTowardsCarStrategy } from "./fly-towards-car";

export interface CrossDiveConfig {
  approachDistance: number;
  diveCooldownDuration: number;
  acidDropInterval: number;
}

/**
 * Strategy that flies towards the car until close enough, then switches to dive strategy.
 */
export class AcidFlyerApproachStrategy implements MovementStrategy {
  private flyStrategy = new FlyTowardsCarStrategy();

  constructor(private config: CrossDiveConfig) {}

  update(zombie: BaseEnemy, deltaTime: number): boolean {
    const mapManager = zombie.getGameManagers().getMapManager();
    const carLocation = mapManager.getCarLocation();
    const zombiePos = zombie.getCenterPosition();

    // Check distance to car
    if (carLocation) {
      const distanceToCar = zombiePos.distance(carLocation);

      // If close enough, switch to dive strategy
      if (distanceToCar <= this.config.approachDistance) {
        zombie.setMovementStrategy(new AcidFlyerDiveStrategy(this.config));
        return true;
      }
    }

    // Otherwise, fly towards car
    return this.flyStrategy.update(zombie, deltaTime);
  }
}

/**
 * Strategy that performs the cross dive pattern and drops acid.
 * Switches back to approach strategy when dive is complete.
 */
export class AcidFlyerDiveStrategy implements MovementStrategy {
  private acidDropCooldown: Cooldown;
  private segmentStartTime: number = 0;
  private segmentDuration: number; // Duration for each segment (corner to corner)
  private currentSegment: number = 0; // 0-3 for the 4 corners
  private diveTarget: Vector2 | null = null;
  private diveEndTarget: Vector2 | null = null;
  private hasStartedDive: boolean = false;
  private corners: Vector2[] = []; // Store all 4 corners

  constructor(private config: CrossDiveConfig) {
    this.acidDropCooldown = new Cooldown(config.acidDropInterval);
    this.segmentDuration = config.diveCooldownDuration;
  }

  update(zombie: BaseEnemy, deltaTime: number): boolean {
    // Initialize dive if not started
    if (!this.hasStartedDive) {
      this.initializeDive(zombie);
      this.hasStartedDive = true;
    }

    const segmentElapsed = Date.now() - this.segmentStartTime;
    this.acidDropCooldown.update(deltaTime);

    // Check if current segment is complete
    if (segmentElapsed >= this.segmentDuration * 1000) {
      // Move to next segment
      this.currentSegment++;

      // If we've completed all 4 segments (visited all corners), switch back to approach
      if (this.currentSegment >= 4) {
        this.cleanup();
        zombie.setMovementStrategy(new AcidFlyerApproachStrategy(this.config));
        return true;
      }

      // Start next segment
      this.startNextSegment();
    }

    if (this.diveTarget && this.diveEndTarget) {
      const zombiePos = zombie.getCenterPosition();
      this.performDiveMovement(zombie, zombiePos, segmentElapsed, deltaTime);
    }

    return true;
  }

  private initializeDive(zombie: BaseEnemy): void {
    // Get campsite bounds (center biome)
    const mapManager = zombie.getGameManagers().getMapManager();
    const MAP_SIZE = 9;
    const BIOME_SIZE = 16;
    const TILE_SIZE = getConfig().world.TILE_SIZE;

    const centerBiomeX = Math.floor(MAP_SIZE / 2);
    const centerBiomeY = Math.floor(MAP_SIZE / 2);

    const campsiteCenterX = (centerBiomeX * BIOME_SIZE + BIOME_SIZE / 2) * TILE_SIZE;
    const campsiteCenterY = (centerBiomeY * BIOME_SIZE + BIOME_SIZE / 2) * TILE_SIZE;
    const campsiteSize = BIOME_SIZE * TILE_SIZE;

    const poolManager = PoolManager.getInstance();

    // Calculate all 4 corners of the campsite
    // 0: Top-left
    // 1: Top-right
    // 2: Bottom-right
    // 3: Bottom-left
    this.corners = [
      poolManager.vector2.claim(
        campsiteCenterX - campsiteSize / 2,
        campsiteCenterY - campsiteSize / 2
      ),
      poolManager.vector2.claim(
        campsiteCenterX + campsiteSize / 2,
        campsiteCenterY - campsiteSize / 2
      ),
      poolManager.vector2.claim(
        campsiteCenterX + campsiteSize / 2,
        campsiteCenterY + campsiteSize / 2
      ),
      poolManager.vector2.claim(
        campsiteCenterX - campsiteSize / 2,
        campsiteCenterY + campsiteSize / 2
      ),
    ];

    // Start from current position or first corner
    const zombiePos = zombie.getCenterPosition();
    this.diveTarget = poolManager.vector2.claim(zombiePos.x, zombiePos.y);
    this.startNextSegment();
  }

  private startNextSegment(): void {
    // Release old targets
    if (this.diveTarget && this.currentSegment > 0) {
      PoolManager.getInstance().vector2.release(this.diveTarget);
    }
    if (this.diveEndTarget) {
      PoolManager.getInstance().vector2.release(this.diveEndTarget);
    }

    // Set current target to the corner we're heading to
    const poolManager = PoolManager.getInstance();

    if (this.currentSegment === 0) {
      // First segment: go to first corner (top-left)
      this.diveTarget = poolManager.vector2.claim(this.corners[0].x, this.corners[0].y);
      this.diveEndTarget = poolManager.vector2.claim(this.corners[1].x, this.corners[1].y); // Next: top-right
    } else if (this.currentSegment === 1) {
      // Second segment: top-left to top-right, then to bottom-right
      this.diveTarget = poolManager.vector2.claim(this.corners[1].x, this.corners[1].y);
      this.diveEndTarget = poolManager.vector2.claim(this.corners[2].x, this.corners[2].y); // Next: bottom-right
    } else if (this.currentSegment === 2) {
      // Third segment: top-right to bottom-right, then to bottom-left
      this.diveTarget = poolManager.vector2.claim(this.corners[2].x, this.corners[2].y);
      this.diveEndTarget = poolManager.vector2.claim(this.corners[3].x, this.corners[3].y); // Next: bottom-left
    } else if (this.currentSegment === 3) {
      // Fourth segment: bottom-right to bottom-left, then back to top-left (completing X)
      this.diveTarget = poolManager.vector2.claim(this.corners[3].x, this.corners[3].y);
      this.diveEndTarget = poolManager.vector2.claim(this.corners[0].x, this.corners[0].y); // Back to top-left
    }

    this.segmentStartTime = Date.now();
  }

  private performDiveMovement(
    zombie: BaseEnemy,
    zombiePos: Vector2,
    segmentElapsed: number,
    deltaTime: number
  ): void {
    // Continue diving towards target (interpolate between start and end for X pattern)
    const diveProgress = Math.min(1, segmentElapsed / (this.segmentDuration * 1000));
    const poolManager = PoolManager.getInstance();

    let currentTarget: Vector2;
    let shouldReleaseTarget = false;

    if (this.diveEndTarget && this.diveTarget) {
      currentTarget = this.interpolateDiveTarget(this.diveTarget, this.diveEndTarget, diveProgress);
      shouldReleaseTarget = true;
    } else if (this.diveTarget) {
      currentTarget = this.diveTarget;
    } else {
      return;
    }

    const zombiePosClone = zombiePos.clone();
    const pathfindingVelocity = velocityTowards(zombiePosClone, currentTarget);
    const movable = zombie.getExt(Movable);
    const pathfindingVelScaled = poolManager.vector2.claim(
      pathfindingVelocity.x * zombie.getSpeed(),
      pathfindingVelocity.y * zombie.getSpeed()
    );

    // Apply separation force to avoid clustering
    const separationForce = calculateSeparationForce(zombie);
    const finalVelocity = blendSeparationForce(pathfindingVelScaled, separationForce);

    movable.setVelocity(finalVelocity);

    // Release pooled vectors
    poolManager.vector2.release(zombiePosClone);
    poolManager.vector2.release(pathfindingVelocity);
    poolManager.vector2.release(pathfindingVelScaled);
    poolManager.vector2.release(separationForce);
    poolManager.vector2.release(finalVelocity);
    if (shouldReleaseTarget) {
      poolManager.vector2.release(currentTarget);
    }

    // Drop acid while diving
    if (this.acidDropCooldown.isReady()) {
      this.dropAcid(zombie);
      this.acidDropCooldown.reset();
    }

    // Update position directly (flying, no collision)
    const position = zombie.getPosition();
    position.x += movable.getVelocity().x * deltaTime;
    position.y += movable.getVelocity().y * deltaTime;
    zombie.setPosition(position);
  }

  private interpolateDiveTarget(start: Vector2, end: Vector2, progress: number): Vector2 {
    const poolManager = PoolManager.getInstance();
    const interpolated = poolManager.vector2.claim(
      start.x + (end.x - start.x) * progress,
      start.y + (end.y - start.y) * progress
    );
    return interpolated;
  }

  private dropAcid(zombie: BaseEnemy): void {
    const positionable = zombie.getExt(Positionable);
    const position = positionable.getPosition();
    const poolManager = PoolManager.getInstance();
    const acidPosition = poolManager.vector2.claim(position.x, position.y);

    const acid = new Acid(zombie.getGameManagers());
    acid.getExt(Positionable).setPosition(acidPosition);
    zombie.getEntityManager().addEntity(acid);

    poolManager.vector2.release(acidPosition);
  }

  private cleanup(): void {
    if (this.diveTarget) {
      PoolManager.getInstance().vector2.release(this.diveTarget);
      this.diveTarget = null;
    }
    if (this.diveEndTarget) {
      PoolManager.getInstance().vector2.release(this.diveEndTarget);
      this.diveEndTarget = null;
    }
    // Release all corner vectors
    for (const corner of this.corners) {
      PoolManager.getInstance().vector2.release(corner);
    }
    this.corners = [];
  }
}
