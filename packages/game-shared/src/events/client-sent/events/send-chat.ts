import { EventType, ClientSentEvents } from "../../events";
import { GameEvent } from "../../types";
import { ArrayBufferWriter, BufferReader } from "../../../util/buffer-serialization";

export interface SendChatEventData {
  message: string;
  adminPassword?: string;
}

export class SendChatEvent implements GameEvent<SendChatEventData> {
  private readonly type: EventType = ClientSentEvents.SEND_CHAT;
  private readonly data: SendChatEventData;

  constructor(data: SendChatEventData) {
    this.data = data;
  }

  getType(): EventType {
    return this.type;
  }

  serialize(): SendChatEventData {
    return this.data;
  }

  getMessage(): string {
    return this.data.message;
  }

  static serializeToBuffer(writer: ArrayBufferWriter, data: SendChatEventData): void {
    writer.writeString(data.message ?? "");
    writer.writeString(data.adminPassword ?? "");
  }

  static deserializeFromBuffer(reader: BufferReader): SendChatEventData {
    const message = reader.readString();
    const adminPassword = reader.readString();
    return { 
      message,
      adminPassword: adminPassword || undefined
    };
  }
}

