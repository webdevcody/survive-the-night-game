import { EventType, ClientSentEvents } from "../../events";
import { GameEvent } from "../../types";
import { ArrayBufferWriter, BufferReader } from "../../../util/buffer-serialization";

export interface NoPayloadEventData {}

export class NoPayloadEvent implements GameEvent<NoPayloadEventData> {
  private readonly type: EventType;

  constructor(type: EventType) {
    this.type = type;
  }

  getType(): EventType {
    return this.type;
  }

  serialize(): NoPayloadEventData {
    return {};
  }

  static serializeToBuffer(_writer: ArrayBufferWriter, _data: NoPayloadEventData): void {
    // No payload - empty buffer
  }

  static deserializeFromBuffer(_reader: BufferReader): NoPayloadEventData {
    return {};
  }
}
