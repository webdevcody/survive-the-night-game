import { BufferWriter, BufferReader } from "../../util/buffer-serialization";

export interface ChatMessageEventData {
  playerId: number;
  message: string;
}

export class ChatMessageEvent {
  private data: ChatMessageEventData;

  constructor(data: ChatMessageEventData) {
    this.data = data;
  }

  public getData(): ChatMessageEventData {
    return this.data;
  }

  public getPlayerId(): number {
    return this.data.playerId;
  }

  public getMessage(): string {
    return this.data.message;
  }

  static serializeToBuffer(writer: BufferWriter, data: ChatMessageEventData): void {
    writer.writeUInt16(data.playerId ?? 0);
    writer.writeString(data.message ?? "");
  }

  static deserializeFromBuffer(reader: BufferReader): ChatMessageEventData {
    const playerId = reader.readUInt16();
    const message = reader.readString();
    return { playerId, message };
  }
}
