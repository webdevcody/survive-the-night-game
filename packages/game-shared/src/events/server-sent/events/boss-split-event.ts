import { GameEvent } from "../../types";
import { EventType, ServerSentEvents } from "../../events";
import { BufferWriter, BufferReader } from "../../../util/buffer-serialization";

export interface BossSplitEventData {
  originalId: number;
  newIds: number[];
  positions: Array<{ x: number; y: number }>;
}

export class BossSplitEvent implements GameEvent<BossSplitEventData> {
  private readonly type: EventType = ServerSentEvents.BOSS_SPLIT;

  constructor(private readonly data: BossSplitEventData) {}

  getType(): EventType {
    return this.type;
  }

  getOriginalId(): number {
    return this.data.originalId;
  }

  getNewIds(): number[] {
    return this.data.newIds;
  }

  getPositions(): Array<{ x: number; y: number }> {
    return this.data.positions;
  }

  serialize(): BossSplitEventData {
    return this.data;
  }

  static serializeToBuffer(writer: BufferWriter, data: BossSplitEventData): void {
    const newIds = Array.isArray(data.newIds) ? data.newIds : [];
    const positions = Array.isArray(data.positions) ? data.positions : [];
    
    if (newIds.length > 255) {
      throw new Error(`split payload too large (${newIds.length} entries)`);
    }
    if (positions.length !== newIds.length) {
      throw new Error(`split positions count (${positions.length}) must match newIds count (${newIds.length})`);
    }
    
    writer.writeUInt16(data.originalId ?? 0);
    writer.writeUInt8(newIds.length);
    newIds.forEach((id: number) => {
      writer.writeUInt16(id ?? 0);
    });
    positions.forEach((pos: { x: number; y: number }) => {
      writer.writeFloat64(pos?.x ?? 0);
      writer.writeFloat64(pos?.y ?? 0);
    });
  }

  static deserializeFromBuffer(reader: BufferReader): BossSplitEventData {
    const originalId = reader.readUInt16();
    const count = reader.readUInt8();
    const newIds: number[] = [];
    const positions: Array<{ x: number; y: number }> = [];
    
    for (let i = 0; i < count; i++) {
      newIds.push(reader.readUInt16());
    }
    for (let i = 0; i < count; i++) {
      const x = reader.readFloat64();
      const y = reader.readFloat64();
      positions.push({ x, y });
    }
    
    return { originalId, newIds, positions };
  }
}

