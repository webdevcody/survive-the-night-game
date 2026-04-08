import { GameEvent } from "../../types";
import { EventType, ServerSentEvents } from "../../events";
import { BufferWriter, BufferReader } from "../../../util/buffer-serialization";

export interface AuthRequiredEventData {
  message?: string;
}

export class AuthRequiredEvent implements GameEvent<AuthRequiredEventData> {
  private data: AuthRequiredEventData;
  private readonly type: EventType;

  constructor(data: AuthRequiredEventData = {}) {
    this.data = data;
    this.type = ServerSentEvents.AUTH_REQUIRED;
  }

  public getType(): EventType {
    return this.type;
  }

  public serialize(): AuthRequiredEventData {
    return this.data;
  }

  public getData(): AuthRequiredEventData {
    return this.data;
  }

  public getMessage(): string | undefined {
    return this.data.message;
  }

  static serializeToBuffer(writer: BufferWriter, data: AuthRequiredEventData): void {
    const msg = data.message ?? "";
    writer.writeUInt8(msg.length > 0 ? 1 : 0);
    if (msg.length > 0) {
      writer.writeString(msg);
    }
  }

  static deserializeFromBuffer(reader: BufferReader): AuthRequiredEventData {
    const hasMessage = reader.readUInt8() === 1;
    const message = hasMessage ? reader.readString() : undefined;
    return { message };
  }
}
