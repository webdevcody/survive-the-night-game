import { GameEvent } from "../../types";
import { EventType, ServerSentEvents } from "../../events";
import { BufferWriter, BufferReader } from "../../../util/buffer-serialization";

export interface LightningBoltEventData {
  timestamp: number;
  playerId?: number;
}

export class LightningBoltEvent implements GameEvent<LightningBoltEventData> {
  private data: LightningBoltEventData;
  private readonly type: EventType;

  constructor(data: LightningBoltEventData) {
    this.data = data;
    this.type = ServerSentEvents.LIGHTNING_BOLT;
  }

  public getType(): EventType {
    return this.type;
  }

  public serialize(): LightningBoltEventData {
    return this.data;
  }

  public getData(): LightningBoltEventData {
    return this.data;
  }

  public getTimestamp(): number {
    return this.data.timestamp;
  }

  public getPlayerId(): number | undefined {
    return this.data.playerId;
  }

  static serializeToBuffer(writer: BufferWriter, data: LightningBoltEventData): void {
    writer.writeFloat64(data.timestamp ?? Date.now());
    writer.writeUInt16(data.playerId ?? 0);
  }

  static deserializeFromBuffer(reader: BufferReader): LightningBoltEventData {
    const timestamp = reader.readFloat64();
    const playerId = reader.readUInt16();
    return { timestamp, playerId: playerId === 0 ? undefined : playerId };
  }
}
