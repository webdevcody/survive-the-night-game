import { BufferWriter } from "@shared/util/buffer-serialization";
import { IEntity } from "@/entities/types";
import { GameStateData } from "@shared/events/server-sent/game-state-event";

/**
 * Centralized buffer manager for serializing game state to buffers.
 * Maintains a reusable buffer that gets cleared after each game loop.
 */
export class BufferManager {
  private writer: BufferWriter;
  private initialSize: number;

  constructor(initialSize: number = 2 * 1024 * 1024) {
    // 2MB initial size - will grow as needed
    this.initialSize = initialSize;
    this.writer = new BufferWriter(initialSize);
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
    const tempWriter = new BufferWriter(1024);
    entity.serializeToBuffer(tempWriter, onlyDirty);
    const entityBuffer = tempWriter.getBuffer();
    // Write entity data with length prefix handled by writeBuffer
    this.writer.writeBuffer(entityBuffer);
  }

  /**
   * Write game state metadata to the buffer
   * @param gameState - Game state data (wave info, day/night cycle, etc.)
   */
  writeGameState(gameState: Partial<GameStateData>): void {
    // Write timestamp
    if (gameState.timestamp !== undefined) {
      this.writer.writeBoolean(true);
      this.writer.writeFloat64(gameState.timestamp);
    } else {
      this.writer.writeBoolean(false);
    }

    // Write cycleStartTime
    if (gameState.cycleStartTime !== undefined) {
      this.writer.writeBoolean(true);
      this.writer.writeFloat64(gameState.cycleStartTime);
    } else {
      this.writer.writeBoolean(false);
    }

    // Write cycleDuration
    if (gameState.cycleDuration !== undefined) {
      this.writer.writeBoolean(true);
      this.writer.writeFloat64(gameState.cycleDuration);
    } else {
      this.writer.writeBoolean(false);
    }

    // Write waveNumber (uint8: 0-255)
    if (gameState.waveNumber !== undefined) {
      this.writer.writeBoolean(true);
      if (gameState.waveNumber > 255) {
        throw new Error(`waveNumber ${gameState.waveNumber} exceeds uint8 maximum (255)`);
      }
      this.writer.writeUInt8(gameState.waveNumber);
    } else {
      this.writer.writeBoolean(false);
    }

    // Write waveState
    if (gameState.waveState !== undefined) {
      this.writer.writeBoolean(true);
      this.writer.writeString(gameState.waveState);
    } else {
      this.writer.writeBoolean(false);
    }

    // Write phaseStartTime
    if (gameState.phaseStartTime !== undefined) {
      this.writer.writeBoolean(true);
      this.writer.writeFloat64(gameState.phaseStartTime);
    } else {
      this.writer.writeBoolean(false);
    }

    // Write phaseDuration
    if (gameState.phaseDuration !== undefined) {
      this.writer.writeBoolean(true);
      this.writer.writeFloat64(gameState.phaseDuration);
    } else {
      this.writer.writeBoolean(false);
    }

    // Write isFullState
    if (gameState.isFullState !== undefined) {
      this.writer.writeBoolean(true);
      this.writer.writeBoolean(gameState.isFullState);
    } else {
      this.writer.writeBoolean(false);
    }
  }

  /**
   * Write removed entity IDs array
   * @param removedIds - Array of entity IDs that were removed
   */
  writeRemovedEntityIds(removedIds: number[]): void {
    if (removedIds.length > 65535) {
      throw new Error(`Removed entity IDs count ${removedIds.length} exceeds UInt16 maximum (65535)`);
    }
    this.writer.writeUInt16(removedIds.length);
    for (const id of removedIds) {
      this.writer.writeUInt16(id);
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
    this.writer.writeUInt16(count);
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
}
