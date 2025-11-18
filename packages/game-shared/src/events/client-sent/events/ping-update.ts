import { EventType, ClientSentEvents } from "../../events";
import { GameEvent } from "../../types";
import { ArrayBufferWriter, BufferReader } from "../../../util/buffer-serialization";

export type PingUpdateEventData = number;

export class PingUpdateEvent implements GameEvent<PingUpdateEventData> {
  private readonly type: EventType = ClientSentEvents.PING_UPDATE;
  private readonly data: PingUpdateEventData;

  constructor(data: PingUpdateEventData) {
    this.data = data;
  }

  getType(): EventType {
    return this.type;
  }

  serialize(): PingUpdateEventData {
    return this.data;
  }

  getLatency(): number {
    return this.data;
  }

  static serializeToBuffer(writer: ArrayBufferWriter, data: PingUpdateEventData): void {
    writer.writeFloat64(data);
  }

  static deserializeFromBuffer(reader: BufferReader): PingUpdateEventData {
    return reader.readFloat64();
  }
}
