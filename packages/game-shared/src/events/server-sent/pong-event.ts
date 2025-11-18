import { ServerSentEvents, EventType } from "../events";
import { GameEvent } from "../types";
import { BufferWriter, BufferReader } from "../../util/buffer-serialization";

export class PongEvent implements GameEvent<{ timestamp: number }> {
  private type: EventType;
  private data: { timestamp: number };

  constructor(data: { timestamp: number }) {
    this.type = ServerSentEvents.PONG;
    this.data = data;
  }

  getType(): EventType {
    return this.type;
  }

  getData(): { timestamp: number } {
    return this.data;
  }

  serialize(): { timestamp: number } {
    return this.data;
  }

  static serializeToBuffer(writer: BufferWriter, data: { timestamp: number }): void {
    writer.writeFloat64(data.timestamp);
  }

  static deserializeFromBuffer(reader: BufferReader): { timestamp: number } {
    const timestamp = reader.readFloat64();
    return { timestamp };
  }
}
