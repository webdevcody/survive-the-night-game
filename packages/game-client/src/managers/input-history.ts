import { Input } from "@shared/util/input";
import Vector2 from "@shared/util/vector2";
import { PlayerClient } from "@/entities/player";
import { ClientPositionable } from "@/extensions";
import { FIXED_TIMESTEP } from "@shared/config/game-config";

/**
 * Snapshot of input with associated state
 */
export interface InputSnapshot {
  sequenceNumber: number;
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
 * Stores recent inputs with sequence numbers to enable
 * rolling back and replaying when server corrections arrive.
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
    seq: number,
    input: Input,
    player: PlayerClient
  ): void {
    const position = player.hasExt(ClientPositionable)
      ? player.getExt(ClientPositionable).getPosition()
      : new Vector2(0, 0);

    const state: PlayerState = {
      position: new Vector2(position.x, position.y),
    };

    this.buffer.push({
      sequenceNumber: seq,
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
   * Get the state at a specific sequence number
   */
  getStateAtSequence(seq: number): PlayerState | null {
    const snapshot = this.buffer.find((s) => s.sequenceNumber === seq);
    return snapshot ? { ...snapshot.clientState } : null;
  }

  /**
   * Get the snapshot at a specific sequence number
   */
  getSnapshotAtSequence(seq: number): InputSnapshot | null {
    return this.buffer.find((s) => s.sequenceNumber === seq) || null;
  }

  /**
   * Replay inputs from a specific sequence number
   * This is used for rollback/replay when server corrections arrive
   */
  replayFromSequence(
    seq: number,
    player: PlayerClient,
    applyInput: (player: PlayerClient, input: Input, deltaTime: number) => void
  ): void {
    const startIndex = this.buffer.findIndex((s) => s.sequenceNumber === seq);
    if (startIndex === -1) {
      return; // No history available for this sequence
    }

    // Restore state at the server's acknowledged sequence
    const startState = this.buffer[startIndex].clientState;
    if (player.hasExt(ClientPositionable)) {
      player.getExt(ClientPositionable).setPosition(
        new Vector2(startState.position.x, startState.position.y)
      );
    }

    // Replay all inputs after this sequence
    for (let i = startIndex + 1; i < this.buffer.length; i++) {
      const snapshot = this.buffer[i];
      // Use fixed timestep for replay to match server
      applyInput(player, snapshot.input, FIXED_TIMESTEP);
    }
  }

  /**
   * Clear all history (useful for reconnection)
   */
  clear(): void {
    this.buffer = [];
  }

  /**
   * Get the most recent sequence number
   */
  getLastSequence(): number | null {
    return this.buffer.length > 0
      ? this.buffer[this.buffer.length - 1].sequenceNumber
      : null;
  }
}

