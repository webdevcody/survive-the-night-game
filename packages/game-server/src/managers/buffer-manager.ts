import { MonitoredBufferWriter } from "@shared/util/buffer-serialization";
import {
  GAME_STATE_BIT_TIMESTAMP,
  GAME_STATE_BIT_WAVE_NUMBER,
  GAME_STATE_BIT_WAVE_STATE,
  GAME_STATE_BIT_PHASE_START_TIME,
  GAME_STATE_BIT_PHASE_DURATION,
  GAME_STATE_BIT_IS_FULL_STATE,
  GAME_STATE_BIT_REMOVED_ENTITY_IDS,
  GAME_STATE_FIELD_BITS,
} from "@shared/util/serialization-constants";
import { IEntity } from "@/entities/types";
import { GameStateData } from "@shared/events/server-sent/game-state-event";

/**
 * Centralized buffer manager for serializing game state to buffers.
 * Maintains a reusable buffer that gets cleared after each game loop.
 */
export class BufferManager {
  private writer: MonitoredBufferWriter;
  private initialSize: number;

  constructor(initialSize: number = 2 * 1024 * 1024) {
    // 2MB initial size - will grow as needed
    this.initialSize = initialSize;
    this.writer = new MonitoredBufferWriter(initialSize);
  }

  /**
   * Clear the buffer (reset for new game loop)
   */
  clear(): void {
    this.writer.reset();
  }

  /**
   * Write an entity to the buffer
   * @param entity - The entity to serialize
   * @param onlyDirty - Whether to only serialize dirty fields/extensions
   */
  writeEntity(entity: IEntity, onlyDirty: boolean = false): void {
    // Write entity to temporary buffer first to get its length
    const tempWriter = new MonitoredBufferWriter(1024);
    entity.serializeToBuffer(tempWriter, onlyDirty);
    const entityBuffer = tempWriter.getBuffer();
    // Write entity data with length prefix handled by writeBuffer
    this.writer.writeBuffer(entityBuffer, "EntityData");
  }

  /**
   * Write game state metadata to the buffer using bitset approach
   * @param gameState - Game state data (wave info, etc.)
   * @param hasRemovedEntities - Whether there are removed entities (for bitset)
   */
  writeGameState(gameState: Partial<GameStateData>, hasRemovedEntities: boolean = false): void {
    // Build bitset to track which fields are present
    let bitset = 0;

    if (gameState.timestamp !== undefined) {
      bitset |= GAME_STATE_BIT_TIMESTAMP;
    }
    if (gameState.waveNumber !== undefined) {
      bitset |= GAME_STATE_BIT_WAVE_NUMBER;
    }
    if (gameState.waveState !== undefined) {
      bitset |= GAME_STATE_BIT_WAVE_STATE;
    }
    if (gameState.phaseStartTime !== undefined) {
      bitset |= GAME_STATE_BIT_PHASE_START_TIME;
    }
    if (gameState.phaseDuration !== undefined) {
      bitset |= GAME_STATE_BIT_PHASE_DURATION;
    }
    if (gameState.isFullState !== undefined) {
      bitset |= GAME_STATE_BIT_IS_FULL_STATE;
    }
    if (hasRemovedEntities) {
      bitset |= GAME_STATE_BIT_REMOVED_ENTITY_IDS;
    }

    // Write bitset as UInt8
    this.writer.writeUInt8(bitset, "GameStateBitset");

    // Iterate through bits deterministically and write only fields that are set
    for (const bit of GAME_STATE_FIELD_BITS) {
      if (bitset & bit) {
        switch (bit) {
          case GAME_STATE_BIT_TIMESTAMP:
            this.writer.writeFloat64(gameState.timestamp!, "Timestamp");
            break;
          case GAME_STATE_BIT_WAVE_NUMBER:
            if (gameState.waveNumber! > 255) {
              throw new Error(`waveNumber ${gameState.waveNumber} exceeds uint8 maximum (255)`);
            }
            this.writer.writeUInt8(gameState.waveNumber!, "WaveNumber");
            break;
          case GAME_STATE_BIT_WAVE_STATE:
            this.writer.writeString(gameState.waveState!, "WaveState");
            break;
          case GAME_STATE_BIT_PHASE_START_TIME:
            this.writer.writeFloat64(gameState.phaseStartTime!, "PhaseStartTime");
            break;
          case GAME_STATE_BIT_PHASE_DURATION:
            this.writer.writeFloat64(gameState.phaseDuration!, "PhaseDuration");
            break;
          case GAME_STATE_BIT_IS_FULL_STATE:
            this.writer.writeBoolean(gameState.isFullState!, "IsFullState");
            break;
          case GAME_STATE_BIT_REMOVED_ENTITY_IDS:
            // This bit is handled separately in writeRemovedEntityIds
            // We don't write anything here, just track that removals exist
            break;
        }
      }
    }
  }

  /**
   * Write removed entity IDs array
   * Only writes if there are actually removed entities (should be called after writeGameState)
   * @param removedIds - Array of entity IDs that were removed
   */
  writeRemovedEntityIds(removedIds: number[]): void {
    // Only write if there are removals (bitset bit should already be set in writeGameState)
    if (removedIds.length === 0) {
      return;
    }

    if (removedIds.length > 65535) {
      throw new Error(
        `Removed entity IDs count ${removedIds.length} exceeds UInt16 maximum (65535)`
      );
    }
    this.writer.writeUInt16(removedIds.length, "RemovedEntityIdCount");
    for (let i = 0; i < removedIds.length; i++) {
      this.writer.writeUInt16(removedIds[i], `RemovedEntityId[${i}]`);
    }
  }

  /**
   * Write entity count (for game state updates)
   * @param count - Number of entities (max 65535)
   */
  writeEntityCount(count: number): void {
    if (count > 65535) {
      throw new Error(`Entity count ${count} exceeds UInt16 maximum (65535)`);
    }
    this.writer.writeUInt16(count, "EntityCount");
  }

  /**
   * Get the current buffer
   */
  getBuffer(): Buffer {
    return this.writer.getBuffer();
  }

  /**
   * Get the current buffer length
   */
  getLength(): number {
    return this.writer.getOffset();
  }

  /**
   * Log total bytes for the current game state update
   */
  logStats(): void {
    const totalBytes = this.getLength();
    const formatBytes = (bytes: number): string => {
      if (bytes < 1024) return `${bytes}B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}KB`;
      return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
    };
    console.log(`GAME_STATE_UPDATE: ${formatBytes(totalBytes)}`);
  }
}
