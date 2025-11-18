import { GameEvent } from "@/events/types";
import { EventType, ServerSentEvents } from "../events";
import { BufferWriter, BufferReader } from "../../util/buffer-serialization";

export interface BossSummonEventData {
  bossId: number;
  summons: Array<{ x: number; y: number }>;
}

export class BossSummonEvent implements GameEvent<BossSummonEventData> {
  private readonly type: EventType = ServerSentEvents.BOSS_SUMMON;

  constructor(private readonly data: BossSummonEventData) {}

  getType(): EventType {
    return this.type;
  }

  getBossId(): number {
    return this.data.bossId;
  }

  getSummons(): Array<{ x: number; y: number }> {
    return this.data.summons;
  }

  serialize(): BossSummonEventData {
    return this.data;
  }

  static serializeToBuffer(writer: BufferWriter, data: BossSummonEventData): void {
    const summons = Array.isArray(data.summons) ? data.summons : [];
    if (summons.length > 255) {
      throw new Error(`summon payload too large (${summons.length} entries)`);
    }
    writer.writeUInt16(data.bossId ?? 0);
    writer.writeUInt8(summons.length);
    summons.forEach((summon: { x: number; y: number }) => {
      writer.writeFloat64(summon?.x ?? 0);
      writer.writeFloat64(summon?.y ?? 0);
    });
  }

  static deserializeFromBuffer(reader: BufferReader): BossSummonEventData {
    const bossId = reader.readUInt16();
    const count = reader.readUInt8();
    const summons: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < count; i++) {
      const x = reader.readFloat64();
      const y = reader.readFloat64();
      summons.push({ x, y });
    }
    return { bossId, summons };
  }
}
