import Vector2 from "@shared/util/vector2";
import { PlayerClient } from "@/entities/player";
import { ClientPositionable } from "@/extensions";
import { InputHistory } from "./input-history";
import { FIXED_TIMESTEP } from "@shared/config/game-config";
import { Input } from "@shared/util/input";

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
  smallErrorThreshold: 20, // ~1 tile
  largeErrorThreshold: 75, // ~5 tiles

  minLerpSpeed: 0.15, // Smooth for small errors
  maxLerpSpeed: 0.35, // Faster for larger errors

  maxHistorySize: 60, // 1 second at 60fps
  enableRollback: true,

  maxCorrectionVelocity: 120, // pixels/second max correction
  correctionDamping: 0.85, // Slight damping
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

    const clientPos = player.getExt(ClientPositionable).getPosition();
    const error = this.calculateError(clientPos, serverPosition);

    // Store server ghost position for visualization
    (player as any).setServerGhostPosition?.(new Vector2(serverPosition.x, serverPosition.y));

    if (error > this.config.largeErrorThreshold) {
      // Large error: Rollback and replay (if enabled and history available)
      if (this.config.enableRollback && serverSequence !== undefined && applyInput) {
        this.rollbackAndReplay(player, serverSequence, serverPosition, applyInput);
      } else {
        // Fallback: Snap to server position
        this.snapToServer(player, serverPosition);
      }
    } else if (error > this.config.smallErrorThreshold) {
      // Medium error: Smooth correction
      this.smoothCorrection(player, serverPosition, error);
    }
    // Small error: Trust client prediction (no correction)
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
      // Calculate correction offset (difference between server and client at that sequence)
      const correctionOffset = {
        x: serverPosition.x - clientStateAtSeq.position.x,
        y: serverPosition.y - clientStateAtSeq.position.y,
      };

      // Apply correction: set position to server's position
      if (player.hasExt(ClientPositionable)) {
        player.getExt(ClientPositionable).setPosition(
          new Vector2(serverPosition.x, serverPosition.y)
        );
      }

      // Replay all inputs after this sequence
      this.inputHistory.replayFromSequence(serverSequence, player, applyInput);

      // Apply correction offset to all replayed states (optional - can help with accuracy)
      // Note: This is a simplified approach. A more sophisticated system would
      // apply the offset during replay, but for now we just snap to server position.
    } else {
      // No history available: fallback to snap
      this.snapToServer(player, serverPosition);
    }
  }

  /**
   * Smoothly correct position towards server position
   */
  private smoothCorrection(
    player: PlayerClient,
    serverPosition: Vector2,
    error: number
  ): void {
    if (!player.hasExt(ClientPositionable)) {
      return;
    }

    // Adaptive lerp speed based on error magnitude
    const errorRatio =
      (error - this.config.smallErrorThreshold) /
      (this.config.largeErrorThreshold - this.config.smallErrorThreshold);
    const lerpSpeed =
      this.config.minLerpSpeed +
      (this.config.maxLerpSpeed - this.config.minLerpSpeed) * errorRatio;

    const currentPos = player.getExt(ClientPositionable).getPosition();
    const correctedX =
      currentPos.x + (serverPosition.x - currentPos.x) * lerpSpeed;
    const correctedY =
      currentPos.y + (serverPosition.y - currentPos.y) * lerpSpeed;

    // Apply velocity limiting to prevent sudden corrections
    const dx = correctedX - currentPos.x;
    const dy = correctedY - currentPos.y;
    const correctionVelocity = Math.hypot(dx, dy) / FIXED_TIMESTEP; // pixels per second

    if (correctionVelocity > this.config.maxCorrectionVelocity) {
      // Cap correction velocity
      const scale = this.config.maxCorrectionVelocity / correctionVelocity;
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
      player.getExt(ClientPositionable).setPosition(
        new Vector2(serverPosition.x, serverPosition.y)
      );
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

