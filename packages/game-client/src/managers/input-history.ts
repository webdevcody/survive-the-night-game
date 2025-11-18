import { Input } from "@shared/util/input";
import Vector2 from "@shared/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import { PlayerClient } from "@/entities/player";
import { ClientPositionable } from "@/extensions";
import { getConfig } from "@shared/config";

/**
 * Snapshot of input with associated state
 */
export interface InputSnapshot {
  input: Input;
  timestamp: number;
  clientState: PlayerState;
}

/**
 * Player state at a point in time
 */
export interface PlayerState {
  position: Vector2;
  velocity?: Vector2;
}

/**
 * Input history buffer for rollback/replay
 * 
 * Stores recent inputs to enable rolling back and replaying when server corrections arrive.
 * 
 * NOTE: This class is currently unused in the codebase.
 */
export class InputHistory {
  private buffer: InputSnapshot[] = [];
  private maxHistory: number = 60; // ~1 second at 60fps (conservative)

  constructor(maxHistory: number = 60) {
    this.maxHistory = maxHistory;
  }

  /**
   * Add an input to the history buffer
   */
  addInput(
    input: Input,
    player: PlayerClient
  ): void {
    const position = player.hasExt(ClientPositionable)
      ? player.getExt(ClientPositionable).getPosition()
      : PoolManager.getInstance().vector2.claim(0, 0);

    const state: PlayerState = {
      position: PoolManager.getInstance().vector2.claim(position.x, position.y),
    };

    this.buffer.push({
      input: { ...input },
      timestamp: Date.now(),
      clientState: state,
    });

    // Keep only recent history
    if (this.buffer.length > this.maxHistory) {
      this.buffer.shift();
    }
  }

  /**
   * Get the state at a specific index
   */
  getStateAtIndex(index: number): PlayerState | null {
    const snapshot = this.buffer[index];
    return snapshot ? { ...snapshot.clientState } : null;
  }

  /**
   * Get the snapshot at a specific index
   */
  getSnapshotAtIndex(index: number): InputSnapshot | null {
    return this.buffer[index] || null;
  }

  /**
   * Replay inputs from a specific index
   * This is used for rollback/replay when server corrections arrive
   */
  replayFromIndex(
    index: number,
    player: PlayerClient,
    applyInput: (player: PlayerClient, input: Input, deltaTime: number) => void
  ): void {
    if (index < 0 || index >= this.buffer.length) {
      return; // No history available for this index
    }

    // Restore state at the server's acknowledged index
    const startState = this.buffer[index].clientState;
    if (player.hasExt(ClientPositionable)) {
      player.getExt(ClientPositionable).setPosition(
        PoolManager.getInstance().vector2.claim(startState.position.x, startState.position.y)
      );
    }

    // Replay all inputs after this index
    for (let i = index + 1; i < this.buffer.length; i++) {
      const snapshot = this.buffer[i];
      // Use fixed timestep for replay to match server
      applyInput(player, snapshot.input, getConfig().simulation.FIXED_TIMESTEP);
    }
  }

  /**
   * Clear all history (useful for reconnection)
   */
  clear(): void {
    this.buffer = [];
  }

  /**
   * Get the buffer length
   */
  getLength(): number {
    return this.buffer.length;
  }
}

