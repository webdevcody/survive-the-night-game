import Vector2 from "@shared/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import { PlayerClient } from "@/entities/player";
import { ClientPositionable } from "@/extensions";
import { getConfig } from "@shared/config";
import { distance } from "@shared/util/physics";

/**
 * Reconciliation manager with continuous gentle correction
 *
 * Handles server reconciliation using a hybrid approach:
 * - Large errors (>50px): Snap to server position immediately
 * - Stopped moving: Smooth lerp to server position (fast)
 * - While moving: Gentle continuous correction (slow, subtle)
 *
 * This prevents drift buildup during movement (especially direction changes)
 * while maintaining responsive feel.
 */
export class ReconciliationManager {
  private isMoving: boolean = false;
  private wasMoving: boolean = false;

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

    const config = getConfig().prediction;
    const clientPos = player.getExt(ClientPositionable).getPosition();
    const error = this.calculateError(clientPos, serverPosition);

    // Store server ghost position for visualization
    const poolManager = PoolManager.getInstance();
    (player as any).setServerGhostPosition?.(
      poolManager.vector2.claim(serverPosition.x, serverPosition.y)
    );

    // Reconciliation strategy:
    // 1. Large error (> errorThreshold): Snap immediately (emergency correction)
    // 2. Stopped or just stopped: Smooth fast lerp (converge quickly)
    // 3. Moving with error: Gentle continuous correction (prevent drift accumulation)

    const minSyncThreshold = 0.5; // Half a pixel - effectively synced

    if (error > config.errorThreshold) {
      // Emergency correction: Large misprediction detected
      this.snapToServer(player, serverPosition);
    } else if (this.justStoppedMoving() || (!this.isMoving && error > minSyncThreshold)) {
      // Fast convergence when not moving
      this.smoothCorrection(player, serverPosition, config.lerpSpeed);
    } else if (this.isMoving && error > config.movementCorrectionThreshold) {
      // Gentle correction during movement to prevent drift buildup
      // This is key for handling direction changes smoothly
      this.smoothCorrection(player, serverPosition, config.movementCorrectionSpeed);
    }
    // Otherwise: error is negligible, no correction needed
  }

  /**
   * Calculate error distance between client and server positions
   */
  private calculateError(clientPos: Vector2, serverPos: Vector2): number {
    return distance(clientPos, serverPos);
  }

  /**
   * Smoothly correct position towards server position
   * @param lerpSpeed - Speed of correction (0-1), higher = faster
   */
  private smoothCorrection(player: PlayerClient, serverPosition: Vector2, lerpSpeed: number): void {
    if (!player.hasExt(ClientPositionable)) {
      return;
    }

    const currentPos = player.getExt(ClientPositionable).getPosition();
    const correctedX = currentPos.x + (serverPosition.x - currentPos.x) * lerpSpeed;
    const correctedY = currentPos.y + (serverPosition.y - currentPos.y) * lerpSpeed;

    const poolManager = PoolManager.getInstance();
    player
      .getExt(ClientPositionable)
      .setPosition(poolManager.vector2.claim(correctedX, correctedY));
  }

  /**
   * Snap player to server position immediately
   */
  private snapToServer(player: PlayerClient, serverPosition: Vector2): void {
    if (player.hasExt(ClientPositionable)) {
      player
        .getExt(ClientPositionable)
        .setPosition(PoolManager.getInstance().vector2.claim(serverPosition.x, serverPosition.y));
    }
  }
}
