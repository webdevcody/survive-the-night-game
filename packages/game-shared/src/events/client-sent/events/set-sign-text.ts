import { EventType, ClientSentEvents } from "../../events";
import { GameEvent } from "../../types";
import { ArrayBufferWriter, BufferReader } from "../../../util/buffer-serialization";
import { normalizeSignMessage } from "../../../util/sign-message";

export interface SetSignTextEventData {
  slotIndex: number;
  message: string;
}

export class SetSignTextEvent implements GameEvent<SetSignTextEventData> {
  private readonly type: EventType = ClientSentEvents.SET_SIGN_TEXT;
  private readonly data: SetSignTextEventData;

  constructor(data: SetSignTextEventData) {
    this.data = {
      slotIndex: data.slotIndex,
      message: normalizeSignMessage(data.message ?? ""),
    };
  }

  getType(): EventType {
    return this.type;
  }

  serialize(): SetSignTextEventData {
    return this.data;
  }

  static serializeToBuffer(writer: ArrayBufferWriter, data: SetSignTextEventData): void {
    writer.writeUInt8(Math.max(0, Math.min(255, data.slotIndex ?? 0)));
    writer.writeString(normalizeSignMessage(data.message ?? ""));
  }

  static deserializeFromBuffer(reader: BufferReader): SetSignTextEventData {
    const slotIndex = reader.readUInt8();
    const message = normalizeSignMessage(reader.readString());
    return { slotIndex, message };
  }
}
