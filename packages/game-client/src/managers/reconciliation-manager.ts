import Vector2 from "@shared/util/vector2";
import { PlayerClient } from "@/entities/player";
import { ClientPositionable } from "@/extensions";
import { getConfig } from "@shared/config";

/**
 * Configuration for reconciliation behavior
 */
export interface ReconciliationConfig {
  // Thresholds (in pixels)
  smallErrorThreshold: number; // Below this, trust client
  largeErrorThreshold: number; // Above this, snap to server

  // Smooth correction parameters
  minLerpSpeed: number; // Lerp speed for small errors
  maxLerpSpeed: number; // Lerp speed for large errors
}

/**
 * Enhanced reconciliation manager with adaptive lerp
 *
 * Handles different types of corrections intelligently:
 * - Small errors: Trust client prediction
 * - Medium errors: Smooth lerp towards server position
 * - Large errors: Snap to server position
 */
export class ReconciliationManager {
  private isMoving: boolean = false;
  private wasMoving: boolean = false;

  constructor() {
    // Configuration is now accessed dynamically via getConfig()
  }

  /**
   * Set whether the player is currently moving (has movement input)
   */
  setIsMoving(moving: boolean): void {
    this.wasMoving = this.isMoving;
    this.isMoving = moving;
  }

  /**
   * Check if player just stopped moving (was moving, now not moving)
   */
  private justStoppedMoving(): boolean {
    return this.wasMoving && !this.isMoving;
  }

  /**
   * Process server update and reconcile client state
   */
  reconcile(player: PlayerClient, serverPosition: Vector2): void {
    if (!player.hasExt(ClientPositionable)) {
      return;
    }

    const config = this.getCurrentConfig();
    const clientPos = player.getExt(ClientPositionable).getPosition();
    const error = this.calculateError(clientPos, serverPosition);

    // Store server ghost position for visualization
    (player as any).setServerGhostPosition?.(new Vector2(serverPosition.x, serverPosition.y));

    // Only reconcile when:
    // 1. Player just stopped moving (smooth interpolation to server position)
    // 2. Player is not moving and there's any error (continue interpolating)
    // 3. Error is very large during movement (emergency snap)

    // Define a very small threshold below which we consider positions "synced"
    const minSyncThreshold = 0.5; // Half a pixel - effectively synced

    if (this.justStoppedMoving()) {
      // Player just stopped moving - interpolate to server position regardless of error size
      this.smoothCorrection(player, serverPosition, error);
    } else if (!this.isMoving && error > minSyncThreshold) {
      // Player is not moving - continue interpolating until fully synced
      // This ensures we eventually reach the exact server position
      this.smoothCorrection(player, serverPosition, error);
    } else if (error > config.largeErrorThreshold) {
      // Large error during movement: Snap to server position
      this.snapToServer(player, serverPosition);
    }
    // Otherwise: Trust client prediction (no correction during movement)
  }

  /**
   * Get current config from getConfig()
   */
  private getCurrentConfig(): ReconciliationConfig {
    const config = getConfig().prediction;
    return {
      smallErrorThreshold: config.smallErrorThreshold,
      largeErrorThreshold: config.largeErrorThreshold,
      minLerpSpeed: config.minLerpSpeed,
      maxLerpSpeed: config.maxLerpSpeed,
    };
  }

  /**
   * Calculate error distance between client and server positions
   */
  private calculateError(clientPos: Vector2, serverPos: Vector2): number {
    const dx = clientPos.x - serverPos.x;
    const dy = clientPos.y - serverPos.y;
    return Math.hypot(dx, dy);
  }

  /**
   * Smoothly correct position towards server position
   */
  private smoothCorrection(player: PlayerClient, serverPosition: Vector2, error: number): void {
    if (!player.hasExt(ClientPositionable)) {
      return;
    }

    const config = this.getCurrentConfig();

    // Adaptive lerp speed based on error magnitude
    const errorRatio =
      (error - config.smallErrorThreshold) /
      (config.largeErrorThreshold - config.smallErrorThreshold);
    const lerpSpeed =
      config.minLerpSpeed + (config.maxLerpSpeed - config.minLerpSpeed) * errorRatio;

    const currentPos = player.getExt(ClientPositionable).getPosition();
    const correctedX = currentPos.x + (serverPosition.x - currentPos.x) * lerpSpeed;
    const correctedY = currentPos.y + (serverPosition.y - currentPos.y) * lerpSpeed;

    player.getExt(ClientPositionable).setPosition(new Vector2(correctedX, correctedY));
  }

  /**
   * Snap player to server position immediately
   */
  private snapToServer(player: PlayerClient, serverPosition: Vector2): void {
    if (player.hasExt(ClientPositionable)) {
      player
        .getExt(ClientPositionable)
        .setPosition(new Vector2(serverPosition.x, serverPosition.y));
    }
  }

}
