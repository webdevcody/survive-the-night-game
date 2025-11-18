import { GameEvent } from "../types";
import { ServerSentEvents } from "../events";
import { RawEntity } from "../../types/entity";
import { WaveState } from "../../types/wave";
import { BufferReader } from "../../util/buffer-serialization";
import {
  GAME_STATE_BIT_TIMESTAMP,
  GAME_STATE_BIT_WAVE_NUMBER,
  GAME_STATE_BIT_WAVE_STATE,
  GAME_STATE_BIT_PHASE_START_TIME,
  GAME_STATE_BIT_PHASE_DURATION,
  GAME_STATE_BIT_IS_FULL_STATE,
  GAME_STATE_BIT_REMOVED_ENTITY_IDS,
  GAME_STATE_FIELD_BITS,
} from "../../util/serialization-constants";
import { entityTypeRegistry } from "../../util/entity-type-encoding";
import { decodeExtensionType } from "../../util/extension-type-encoding";

export interface EntityState extends RawEntity {
  id: number;
}

export interface GameStateData {
  entities: EntityState[];
  removedEntityIds?: number[];
  isFullState?: boolean;
  // Wave system data
  waveNumber?: number;
  waveState?: WaveState;
  phaseStartTime?: number;
  phaseDuration?: number;
  timestamp?: number;
}

export class GameStateEvent implements GameEvent<GameStateData> {
  private readonly type = ServerSentEvents.GAME_STATE_UPDATE;
  private readonly data: GameStateData;
  private buffer?: ArrayBuffer; // Store buffer for entity deserialization

  constructor(data: GameStateData) {
    this.data = data;
  }

  public getType() {
    return this.type;
  }

  public serialize(): GameStateData {
    return this.data;
  }

  public getEntities(): EntityState[] {
    return this.data.entities;
  }

  public getRemovedEntityIds(): number[] {
    return this.data.removedEntityIds || [];
  }

  public isFullState(): boolean {
    return this.data.isFullState || false;
  }

  public getTimestamp(): number | undefined {
    return this.data.timestamp;
  }

  public getWaveNumber(): number | undefined {
    return this.data.waveNumber;
  }

  public getWaveState(): WaveState | undefined {
    return this.data.waveState;
  }

  public getPhaseStartTime(): number | undefined {
    return this.data.phaseStartTime;
  }

  public getPhaseDuration(): number | undefined {
    return this.data.phaseDuration;
  }

  /**
   * Deserialize GameStateEvent from buffer
   * Note: Entities are NOT deserialized here - ClientEventListener will deserialize them directly from buffer
   */
  public static deserializeFromBuffer(buffer: ArrayBuffer): GameStateEvent {
    const reader = new BufferReader(buffer);

    // Skip entity count and entities - ClientEventListener will read them
    const entityCount = reader.readUInt16();
    // Skip all entities by reading their length prefixes
    let currentOffset = reader.getOffset(); // Should be 2 after reading entityCount
    for (let i = 0; i < entityCount; i++) {
      if (currentOffset + 2 > buffer.byteLength) {
        console.error(
          `Cannot read entity ${i} length: offset ${currentOffset} + 2 > buffer length ${buffer.byteLength}`
        );
        break;
      }
      // Read entity length (2 bytes) using DataView to avoid creating readers
      const lengthView = new DataView(buffer, currentOffset, 2);
      const entityLength = lengthView.getUint16(0, true); // little-endian

      // Validate entity length is reasonable
      if (entityLength > buffer.byteLength || entityLength < 0) {
        console.error(
          `Invalid entity length ${entityLength} for entity ${i} at offset ${currentOffset}, buffer length ${buffer.byteLength}`
        );
        break;
      }

      // Advance offset past this entity (length prefix + entity data)
      currentOffset += 2 + entityLength;
      if (currentOffset > buffer.byteLength) {
        console.error(
          `Entity ${i} extends beyond buffer: offset ${currentOffset} > buffer length ${buffer.byteLength}`
        );
        break;
      }
    }

    // Validate we're still within buffer bounds before reading game state
    if (currentOffset >= buffer.byteLength) {
      console.error(
        `Cannot read game state: offset ${currentOffset} >= buffer length ${buffer.byteLength}`
      );
      // Return minimal event with empty data
      return new GameStateEvent({ entities: [], removedEntityIds: [] });
    }

    // Create new reader at position after all entities
    const gameStateReader = new BufferReader(buffer, currentOffset);

    // Read game state metadata
    const gameStateData: Partial<GameStateData> = {
      entities: [], // Empty - entities will be deserialized by ClientEventListener
    };

    // Read bitset to determine which fields are present
    const bitset = gameStateReader.readUInt8();

    // Iterate through bits deterministically and read only fields that are set
    // Note: REMOVED_ENTITY_IDS bit is handled separately after the loop
    for (const bit of GAME_STATE_FIELD_BITS) {
      if (bit === GAME_STATE_BIT_REMOVED_ENTITY_IDS) {
        // Skip this bit in the loop - it's handled separately after
        continue;
      }

      if (bitset & bit) {
        switch (bit) {
          case GAME_STATE_BIT_TIMESTAMP:
            gameStateData.timestamp = gameStateReader.readFloat64();
            break;
          case GAME_STATE_BIT_WAVE_NUMBER:
            gameStateData.waveNumber = gameStateReader.readUInt8();
            break;
          case GAME_STATE_BIT_WAVE_STATE:
            gameStateData.waveState = gameStateReader.readString() as WaveState;
            break;
          case GAME_STATE_BIT_PHASE_START_TIME:
            gameStateData.phaseStartTime = gameStateReader.readFloat64();
            break;
          case GAME_STATE_BIT_PHASE_DURATION:
            gameStateData.phaseDuration = gameStateReader.readFloat64();
            break;
          case GAME_STATE_BIT_IS_FULL_STATE:
            gameStateData.isFullState = gameStateReader.readBoolean();
            break;
        }
      }
    }

    // Read removed entity IDs if bit is set (written after game state fields)
    if (bitset & GAME_STATE_BIT_REMOVED_ENTITY_IDS) {
      const removedEntityCount = gameStateReader.readUInt16();
      if (removedEntityCount > 0) {
        gameStateData.removedEntityIds = [];
        for (let i = 0; i < removedEntityCount; i++) {
          gameStateData.removedEntityIds!.push(gameStateReader.readUInt16());
        }
      }
    }

    const event = new GameStateEvent(gameStateData as GameStateData);
    (event as any).buffer = buffer; // Store buffer for entity deserialization
    return event;
  }

  /**
   * Get the buffer used for deserialization (if available)
   */
  public getBuffer(): ArrayBuffer | undefined {
    return this.buffer;
  }

  /**
   * Deserialize an entity from the buffer at a specific offset
   * Returns the entity data and the new offset
   */
  public deserializeEntityFromBuffer(
    offset: number
  ): { entity: RawEntity; newOffset: number } | null {
    if (!this.buffer) {
      return null;
    }
    const reader = new BufferReader(this.buffer, offset);

    // Read entity length
    const entityLength = reader.readUInt16();
    const entityStartOffset = reader.getOffset();

    // Read entity ID and type
    const id = reader.readUInt16();
    // Read entity type as 1-byte numeric ID and decode to string
    const typeId = reader.readUInt8();
    const type = entityTypeRegistry.decode(typeId);

    const entityData: any = { id, type };

    // Read custom fields
    const fieldCount = reader.readUInt8();
    for (let i = 0; i < fieldCount; i++) {
      const fieldName = reader.readString();
      const valueType = reader.readUInt32();
      let value: any;
      if (valueType === 0) {
        value = reader.readString();
      } else if (valueType === 1) {
        value = reader.readFloat64();
      } else if (valueType === 2) {
        value = reader.readBoolean();
      } else if (valueType === 3) {
        const jsonStr = reader.readString();
        try {
          value = JSON.parse(jsonStr);
        } catch {
          value = jsonStr;
        }
      } else {
        value = reader.readString();
      }
      entityData[fieldName] = value;
    }

    // Read extensions (store as placeholder - client will deserialize properly)
    const extensionCount = reader.readUInt8();
    entityData.extensions = [];
    for (let i = 0; i < extensionCount; i++) {
      const extLength = reader.readUInt16();
      const extStartOffset = reader.getOffset();
      const extType = reader.readString();
      entityData.extensions.push({ type: extType });
      // Skip extension data
      reader.atOffset(extStartOffset + extLength);
    }

    // Read removed extensions
    const removedCount = reader.readUInt8();
    if (removedCount > 0) {
      entityData.removedExtensions = [];
      for (let i = 0; i < removedCount; i++) {
        const encodedType = reader.readUInt8();
        entityData.removedExtensions.push(decodeExtensionType(encodedType));
      }
    }

    return {
      entity: entityData,
      newOffset: entityStartOffset + entityLength,
    };
  }
}
