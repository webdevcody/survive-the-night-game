import { BufferWriter } from "@shared/util/buffer-serialization";
import {
  GAME_STATE_BIT_TIMESTAMP,
  GAME_STATE_BIT_WAVE_NUMBER,
  GAME_STATE_BIT_WAVE_STATE,
  GAME_STATE_BIT_PHASE_START_TIME,
  GAME_STATE_BIT_PHASE_DURATION,
  GAME_STATE_BIT_IS_FULL_STATE,
  GAME_STATE_BIT_REMOVED_ENTITY_IDS,
  GAME_STATE_BIT_MAP_DATA,
  GAME_STATE_BIT_VOTING_STATE,
  GAME_STATE_BIT_ZOMBIE_LIVES_STATE,
  GAME_STATE_FIELD_BITS,
} from "@shared/util/serialization-constants";
import { VotingState } from "@shared/types/voting";
import { ZombieLivesState } from "@shared/types/zombie-lives";
import { encodeWaveState } from "@shared/util/wave-state-encoding";
import { IEntity } from "@/entities/types";
import { GameStateData } from "../../../game-shared/src/events/server-sent/events/game-state-event";
import { MapData } from "../../../game-shared/src/events/server-sent/events/map-event";

/**
 * Centralized buffer manager for serializing game state to buffers.
 * Maintains a reusable buffer that gets cleared after each game loop.
 */
export class BufferManager {
  private writer: BufferWriter;
  private tempWriter: BufferWriter; // Reusable temp buffer for entity serialization
  private initialSize: number;

  constructor(initialSize: number = 2 * 1024 * 1024) {
    // 2MB initial size - will grow as needed
    this.initialSize = initialSize;
    this.writer = new BufferWriter(initialSize);
    // Temp buffer for individual entity serialization (64KB should be enough for any single entity)
    this.tempWriter = new BufferWriter(64 * 1024);
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
   * @param onlyDirty - Whether to only serialize dirty fields/extensions. When false, serializes all fields and all extensions with all their data.
   */
  writeEntity(entity: IEntity, onlyDirty: boolean = false): void {
    // Reset and reuse temp buffer for entity serialization
    this.tempWriter.reset();
    entity.serializeToBuffer(this.tempWriter, onlyDirty);
    const entityBuffer = this.tempWriter.getBuffer();
    // Write entity data with length prefix handled by writeBuffer
    this.writer.writeBuffer(entityBuffer);
  }

  /**
   * Write game state metadata to the buffer using bitset approach
   * @param gameState - Game state data (wave info, etc.)
   * @param hasRemovedEntities - Whether there are removed entities (for bitset)
   * @param mapData - Optional map data to include (only for full state updates)
   * @param votingState - Optional voting state to include (during voting phase)
   * @param zombieLivesState - Optional zombie lives state to include (during infection mode)
   */
  writeGameState(
    gameState: Partial<GameStateData>,
    hasRemovedEntities: boolean = false,
    mapData?: MapData,
    votingState?: VotingState,
    zombieLivesState?: ZombieLivesState,
  ): void {
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
    if (mapData !== undefined) {
      bitset |= GAME_STATE_BIT_MAP_DATA;
    }
    if (votingState !== undefined) {
      bitset |= GAME_STATE_BIT_VOTING_STATE;
    }
    if (zombieLivesState !== undefined) {
      bitset |= GAME_STATE_BIT_ZOMBIE_LIVES_STATE;
    }

    // Write bitset as UInt16 (to support more than 8 flags)
    this.writer.writeUInt16(bitset);

    // Iterate through bits deterministically and write only fields that are set
    // Note: REMOVED_ENTITY_IDS, MAP_DATA, VOTING_STATE, and ZOMBIE_LIVES_STATE are handled separately after the loop
    for (const bit of GAME_STATE_FIELD_BITS) {
      if (bitset & bit) {
        switch (bit) {
          case GAME_STATE_BIT_TIMESTAMP:
            this.writer.writeFloat64(gameState.timestamp!);
            break;
          case GAME_STATE_BIT_WAVE_NUMBER:
            if (gameState.waveNumber! > 255) {
              throw new Error(`waveNumber ${gameState.waveNumber} exceeds uint8 maximum (255)`);
            }
            this.writer.writeUInt8(gameState.waveNumber!);
            break;
          case GAME_STATE_BIT_WAVE_STATE:
            this.writer.writeUInt8(encodeWaveState(gameState.waveState!));
            break;
          case GAME_STATE_BIT_PHASE_START_TIME:
            this.writer.writeFloat64(gameState.phaseStartTime!);
            break;
          case GAME_STATE_BIT_PHASE_DURATION:
            this.writer.writeFloat64(gameState.phaseDuration!);
            break;
          case GAME_STATE_BIT_IS_FULL_STATE:
            this.writer.writeBoolean(gameState.isFullState!);
            break;
          case GAME_STATE_BIT_REMOVED_ENTITY_IDS:
            // This bit is handled separately in writeRemovedEntityIds
            // We don't write anything here, just track that removals exist
            break;
          case GAME_STATE_BIT_MAP_DATA:
            // This bit is handled separately in writeMapData
            // We don't write anything here, just track that map data exists
            break;
          case GAME_STATE_BIT_VOTING_STATE:
            // This bit is handled separately in writeVotingState
            // We don't write anything here, just track that voting state exists
            break;
          case GAME_STATE_BIT_ZOMBIE_LIVES_STATE:
            // This bit is handled separately in writeZombieLivesState
            // We don't write anything here, just track that zombie lives state exists
            break;
        }
      }
    }
  }

  /**
   * Write map data to the buffer (should be called after writeRemovedEntityIds)
   * @param mapData - The map data to serialize
   */
  writeMapData(mapData: MapData): void {
    // Serialize map data as JSON string
    // This is simple and works well for map data which doesn't change often
    this.writer.writeString(JSON.stringify(mapData));
  }

  /**
   * Write voting state to the buffer (should be called after writeMapData)
   * @param votingState - The voting state to serialize
   */
  writeVotingState(votingState: VotingState): void {
    // Serialize voting state as JSON string
    this.writer.writeString(JSON.stringify(votingState));
  }

  /**
   * Write zombie lives state to the buffer (should be called after writeVotingState)
   * @param zombieLivesState - The zombie lives state to serialize
   */
  writeZombieLivesState(zombieLivesState: ZombieLivesState): void {
    // Write current and max as UInt16 values (more efficient than JSON)
    this.writer.writeUInt16(zombieLivesState.current);
    this.writer.writeUInt16(zombieLivesState.max);
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
        `Removed entity IDs count ${removedIds.length} exceeds UInt16 maximum (65535)`,
      );
    }
    this.writer.writeUInt16(removedIds.length);
    for (let i = 0; i < removedIds.length; i++) {
      this.writer.writeUInt16(removedIds[i]);
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
  }
}
