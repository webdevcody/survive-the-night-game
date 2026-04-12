import { GameEvent } from "../../types";
import { EventType, ServerSentEvents } from "../../events";
import { BufferWriter, BufferReader } from "../../../util/buffer-serialization";

export interface ProfileLoadFailedEventData {
  message?: string;
}

/**
 * Website DB / player-experience fetch failed after auth; client should not enter the world with empty progress.
 */
export class ProfileLoadFailedEvent implements GameEvent<ProfileLoadFailedEventData> {
  private data: ProfileLoadFailedEventData;
  private readonly type: EventType;

  constructor(data: ProfileLoadFailedEventData = {}) {
    this.data = data;
    this.type = ServerSentEvents.PROFILE_LOAD_FAILED;
  }

  public getType(): EventType {
    return this.type;
  }

  public serialize(): ProfileLoadFailedEventData {
    return this.data;
  }

  public getData(): ProfileLoadFailedEventData {
    return this.data;
  }

  public getMessage(): string | undefined {
    return this.data.message;
  }

  static serializeToBuffer(writer: BufferWriter, data: ProfileLoadFailedEventData): void {
    const msg = data.message ?? "";
    writer.writeUInt8(msg.length > 0 ? 1 : 0);
    if (msg.length > 0) {
      writer.writeString(msg);
    }
  }

  static deserializeFromBuffer(reader: BufferReader): ProfileLoadFailedEventData {
    const hasMessage = reader.readUInt8() === 1;
    const message = hasMessage ? reader.readString() : undefined;
    return { message };
  }
}
