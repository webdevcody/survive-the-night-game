import { GameEvent } from "../../types";
import { EventType, ServerSentEvents } from "../../events";
import { BufferWriter, BufferReader } from "../../../util/buffer-serialization";

export interface DuplicateActiveSessionEventData {
  message?: string;
}

/**
 * Sent when a second connection attempts to claim the account while a lease is still active,
 * or when a heartbeat shows this socket no longer owns the distributed session lease.
 */
export class DuplicateActiveSessionEvent implements GameEvent<DuplicateActiveSessionEventData> {
  private data: DuplicateActiveSessionEventData;
  private readonly type: EventType;

  constructor(data: DuplicateActiveSessionEventData = {}) {
    this.data = data;
    this.type = ServerSentEvents.DUPLICATE_ACTIVE_SESSION;
  }

  public getType(): EventType {
    return this.type;
  }

  public serialize(): DuplicateActiveSessionEventData {
    return this.data;
  }

  public getData(): DuplicateActiveSessionEventData {
    return this.data;
  }

  public getMessage(): string | undefined {
    return this.data.message;
  }

  static serializeToBuffer(writer: BufferWriter, data: DuplicateActiveSessionEventData): void {
    const msg = data.message ?? "";
    writer.writeUInt8(msg.length > 0 ? 1 : 0);
    if (msg.length > 0) {
      writer.writeString(msg);
    }
  }

  static deserializeFromBuffer(reader: BufferReader): DuplicateActiveSessionEventData {
    const hasMessage = reader.readUInt8() === 1;
    const message = hasMessage ? reader.readString() : undefined;
    return { message };
  }
}
