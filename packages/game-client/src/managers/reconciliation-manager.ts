import Vector2 from "@shared/util/vector2";
import { PlayerClient } from "@/entities/player";
import { ClientPositionable } from "@/extensions";
import { InputHistory } from "./input-history";
import { FIXED_TIMESTEP } from "@shared/config/game-config";
import { Input } from "@shared/util/input";
import "@/config/client-prediction"; // Import to get window.config type declarations

/**
 * Configuration for reconciliation behavior
 */
export interface ReconciliationConfig {
  // Thresholds (in pixels)
  smallErrorThreshold: number; // Below this, trust client
  largeErrorThreshold: number; // Above this, rollback

  // Smooth correction parameters
  minLerpSpeed: number; // Lerp speed for small errors
  maxLerpSpeed: number; // Lerp speed for large errors

  // Rollback parameters
  maxHistorySize: number; // Frames to keep (~1 second)
  enableRollback: boolean; // Enable rollback system

  // Visual smoothing
  maxCorrectionVelocity: number; // pixels/second - cap correction speed
  correctionDamping: number; // Damping factor for corrections
}

/**
 * Default reconciliation configuration
 */
export const DEFAULT_RECONCILIATION_CONFIG: ReconciliationConfig = {
  smallErrorThreshold: window.config?.predictions?.smallErrorThreshold ?? 20,
  largeErrorThreshold: window.config?.predictions?.largeErrorThreshold ?? 75,
  minLerpSpeed: window.config?.predictions?.minLerpSpeed ?? 0.15,
  maxLerpSpeed: window.config?.predictions?.maxLerpSpeed ?? 0.35,
  maxHistorySize: window.config?.predictions?.maxInputHistory ?? 60,
  enableRollback: window.config?.predictions?.enableRollback ?? true,
  maxCorrectionVelocity: window.config?.predictions?.maxCorrectionVelocity ?? 120,
  correctionDamping: 0.85, // Damping factor for smooth corrections
};

/**
 * Enhanced reconciliation manager with adaptive lerp and rollback support
 *
 * Handles different types of corrections intelligently:
 * - Small errors: Trust client prediction
 * - Medium errors: Smooth lerp towards server position
 * - Large errors: Rollback and replay (if enabled and history available)
 */
export class ReconciliationManager {
  private config: ReconciliationConfig;
  private inputHistory: InputHistory;
  private isMoving: boolean = false;
  private wasMoving: boolean = false;

  constructor(config: Partial<ReconciliationConfig> = {}) {
    this.config = { ...DEFAULT_RECONCILIATION_CONFIG, ...config };
    this.inputHistory = new InputHistory(this.config.maxHistorySize);
  }

  /**
   * Get the input history (for adding inputs)
   */
  getInputHistory(): InputHistory {
    return this.inputHistory;
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
  reconcile(
    player: PlayerClient,
    serverPosition: Vector2,
    serverSequence?: number,
    applyInput?: (player: PlayerClient, input: Input, deltaTime: number) => void
  ): void {
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
    // 3. Error is very large during movement (emergency snap/rollback)

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
      // Large error during movement: Rollback and replay (if enabled and history available)
      if (config.enableRollback && serverSequence !== undefined && applyInput) {
        this.rollbackAndReplay(player, serverSequence, serverPosition, applyInput);
      } else {
        // Fallback: Snap to server position
        this.snapToServer(player, serverPosition);
      }
    }
    // Otherwise: Trust client prediction (no correction during movement)
  }

  /**
   * Get current config, reading from window.config.predictions if available
   */
  private getCurrentConfig(): ReconciliationConfig {
    if (typeof window !== "undefined" && window.config?.predictions) {
      return {
        smallErrorThreshold: window.config.predictions.smallErrorThreshold,
        largeErrorThreshold: window.config.predictions.largeErrorThreshold,
        minLerpSpeed: window.config.predictions.minLerpSpeed,
        maxLerpSpeed: window.config.predictions.maxLerpSpeed,
        maxHistorySize: window.config.predictions.maxInputHistory,
        enableRollback: window.config.predictions.enableRollback,
        maxCorrectionVelocity: window.config.predictions.maxCorrectionVelocity,
        correctionDamping: this.config.correctionDamping,
      };
    }
    return this.config;
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
   * Rollback to server's acknowledged state and replay inputs
   */
  private rollbackAndReplay(
    player: PlayerClient,
    serverSequence: number,
    serverPosition: Vector2,
    applyInput: (player: PlayerClient, input: Input, deltaTime: number) => void
  ): void {
    // Find client state at server's acknowledged sequence
    const clientStateAtSeq = this.inputHistory.getStateAtSequence(serverSequence);

    if (clientStateAtSeq) {
      // Apply correction: set position to server's position
      if (player.hasExt(ClientPositionable)) {
        player
          .getExt(ClientPositionable)
          .setPosition(new Vector2(serverPosition.x, serverPosition.y));
      }

      // Replay all inputs after this sequence
      this.inputHistory.replayFromSequence(serverSequence, player, applyInput);
    } else {
      // No history available: fallback to snap
      this.snapToServer(player, serverPosition);
    }
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

    // Apply velocity limiting to prevent sudden corrections
    const dx = correctedX - currentPos.x;
    const dy = correctedY - currentPos.y;
    const correctionVelocity = Math.hypot(dx, dy) / FIXED_TIMESTEP; // pixels per second

    if (correctionVelocity > config.maxCorrectionVelocity) {
      // Cap correction velocity
      const scale = config.maxCorrectionVelocity / correctionVelocity;
      const limitedX = currentPos.x + dx * scale;
      const limitedY = currentPos.y + dy * scale;
      player.getExt(ClientPositionable).setPosition(new Vector2(limitedX, limitedY));
    } else {
      player.getExt(ClientPositionable).setPosition(new Vector2(correctedX, correctedY));
    }
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

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ReconciliationConfig>): void {
    this.config = { ...this.config, ...config };
    this.inputHistory = new InputHistory(this.config.maxHistorySize);
  }
}
