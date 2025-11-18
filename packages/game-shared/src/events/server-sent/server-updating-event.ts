import { EventType, ServerSentEvents } from "../events";
import { GameEvent } from "../types";
import { BufferWriter, BufferReader } from "../../util/buffer-serialization";

export interface ServerUpdatingEventData {
  timestamp: number;
}

export class ServerUpdatingEvent implements GameEvent<ServerUpdatingEventData> {
  private readonly type: EventType;
  private readonly data: ServerUpdatingEventData;

  constructor(timestamp: number = Date.now()) {
    this.type = ServerSentEvents.SERVER_UPDATING;
    this.data = { timestamp };
  }

  getType(): EventType {
    return this.type;
  }

  serialize(): ServerUpdatingEventData {
    return this.data;
  }

  getData(): ServerUpdatingEventData {
    return this.data;
  }

  static serializeToBuffer(writer: BufferWriter, data: ServerUpdatingEventData): void {
    writer.writeFloat64(data.timestamp);
  }

  static deserializeFromBuffer(reader: BufferReader): ServerUpdatingEventData {
    const timestamp = reader.readFloat64();
    return { timestamp };
  }
}
