import { GameEvent } from "@/events/types";
import { EventType, ServerSentEvents } from "../../events";
import { BufferWriter, BufferReader } from "../../../util/buffer-serialization";

export interface BossStepEventData {
  bossId: number;
  intensity: number;
  durationMs: number;
}

export class BossStepEvent implements GameEvent<BossStepEventData> {
  private readonly type: EventType = ServerSentEvents.BOSS_STEP;
  constructor(private readonly data: BossStepEventData) {}

  getType(): EventType {
    return this.type;
  }

  getBossId(): number {
    return this.data.bossId;
  }

  getIntensity(): number {
    return this.data.intensity;
  }

  getDurationMs(): number {
    return this.data.durationMs;
  }

  serialize(): BossStepEventData {
    return this.data;
  }

  static serializeToBuffer(writer: BufferWriter, data: BossStepEventData): void {
    writer.writeUInt16(data.bossId ?? 0);
    writer.writeFloat64(data.intensity ?? 0);
    writer.writeFloat64(data.durationMs ?? 0);
  }

  static deserializeFromBuffer(reader: BufferReader): BossStepEventData {
    const bossId = reader.readUInt16();
    const intensity = reader.readFloat64();
    const durationMs = reader.readFloat64();
    return { bossId, intensity, durationMs };
  }
}
