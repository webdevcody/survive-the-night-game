import { EventType, ClientSentEvents } from "../../events";
import { GameEvent } from "../../types";
import { ArrayBufferWriter, BufferReader } from "../../../util/buffer-serialization";

export type PingEventData = number;

export class PingEvent implements GameEvent<PingEventData> {
  private readonly type: EventType = ClientSentEvents.PING;
  private readonly data: PingEventData;

  constructor(data: PingEventData) {
    this.data = data;
  }

  getType(): EventType {
    return this.type;
  }

  serialize(): PingEventData {
    return this.data;
  }

  getTimestamp(): number {
    return this.data;
  }

  static serializeToBuffer(writer: ArrayBufferWriter, data: PingEventData): void {
    writer.writeFloat64(data);
  }

  static deserializeFromBuffer(reader: BufferReader): PingEventData {
    return reader.readFloat64();
  }
}

