import { GameEvent } from "../../types";
import { EventType, ServerSentEvents } from "../../events";
import { BufferWriter, BufferReader } from "../../../util/buffer-serialization";

export interface SessionIdleTimeoutEventData {
  message?: string;
}

/**
 * Sent when the server disconnects this socket after a period with no gameplay activity
 * (client ping/pong alone does not count).
 */
export class SessionIdleTimeoutEvent implements GameEvent<SessionIdleTimeoutEventData> {
  private data: SessionIdleTimeoutEventData;
  private readonly type: EventType;

  constructor(data: SessionIdleTimeoutEventData = {}) {
    this.data = data;
    this.type = ServerSentEvents.SESSION_IDLE_TIMEOUT;
  }

  public getType(): EventType {
    return this.type;
  }

  public serialize(): SessionIdleTimeoutEventData {
    return this.data;
  }

  public getData(): SessionIdleTimeoutEventData {
    return this.data;
  }

  public getMessage(): string | undefined {
    return this.data.message;
  }

  static serializeToBuffer(writer: BufferWriter, data: SessionIdleTimeoutEventData): void {
    const msg = data.message ?? "";
    writer.writeUInt8(msg.length > 0 ? 1 : 0);
    if (msg.length > 0) {
      writer.writeString(msg);
    }
  }

  static deserializeFromBuffer(reader: BufferReader): SessionIdleTimeoutEventData {
    const hasMessage = reader.readUInt8() === 1;
    const message = hasMessage ? reader.readString() : undefined;
    return { message };
  }
}
