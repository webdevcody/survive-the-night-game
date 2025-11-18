import { EventType, ServerSentEvents } from "../events";
import { GameEvent } from "../types";
import { BufferWriter, BufferReader } from "../../util/buffer-serialization";

export class ServerUpdatingEvent implements GameEvent<void> {
  private readonly type: EventType;

  constructor() {
    this.type = ServerSentEvents.SERVER_UPDATING;
  }

  getType(): EventType {
    return this.type;
  }

  serialize(): void {
    return;
  }

  static serializeToBuffer(_writer: BufferWriter, _data: void): void {
    // No payload events - zero-length buffer
  }

  static deserializeFromBuffer(_reader: BufferReader): void {
    // No payload events - return undefined
  }
}
