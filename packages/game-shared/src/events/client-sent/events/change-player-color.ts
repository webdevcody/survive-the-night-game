import { EventType, ClientSentEvents } from "../../events";
import { GameEvent } from "../../types";
import { ArrayBufferWriter, BufferReader } from "../../../util/buffer-serialization";

export interface ChangePlayerColorEventData {
  color: string;
}

export class ChangePlayerColorEvent implements GameEvent<ChangePlayerColorEventData> {
  private readonly type: EventType = ClientSentEvents.CHANGE_PLAYER_COLOR;
  private readonly data: ChangePlayerColorEventData;

  constructor(data: ChangePlayerColorEventData) {
    this.data = data;
  }

  getType(): EventType {
    return this.type;
  }

  serialize(): ChangePlayerColorEventData {
    return this.data;
  }

  getColor(): string {
    return this.data.color;
  }

  static serializeToBuffer(writer: ArrayBufferWriter, data: ChangePlayerColorEventData): void {
    writer.writeString(data.color);
  }

  static deserializeFromBuffer(reader: BufferReader): ChangePlayerColorEventData {
    const color = reader.readString();
    return { color };
  }
}
