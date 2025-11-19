import { EventType, ClientSentEvents } from "../../events";
import { GameEvent } from "../../types";
import { ArrayBufferWriter, BufferReader } from "../../../util/buffer-serialization";

export interface SetDisplayNameEventData {
  displayName: string;
}

export class SetDisplayNameEvent implements GameEvent<SetDisplayNameEventData> {
  private readonly type: EventType = ClientSentEvents.SET_DISPLAY_NAME;
  private readonly data: SetDisplayNameEventData;

  constructor(data: SetDisplayNameEventData) {
    this.data = data;
  }

  getType(): EventType {
    return this.type;
  }

  serialize(): SetDisplayNameEventData {
    return this.data;
  }

  getDisplayName(): string {
    return this.data.displayName;
  }

  static serializeToBuffer(writer: ArrayBufferWriter, data: SetDisplayNameEventData): void {
    writer.writeString(data.displayName);
  }

  static deserializeFromBuffer(reader: BufferReader): SetDisplayNameEventData {
    const displayName = reader.readString();
    return { displayName };
  }
}

