import { GameEvent } from "../../types";
import { EventType, ServerSentEvents } from "../../events";
import { BufferWriter, BufferReader } from "../../../util/buffer-serialization";

export interface UserBannedEventData {
  banExpirationTime: number;
  reason?: string;
}

export class UserBannedEvent implements GameEvent<UserBannedEventData> {
  private data: UserBannedEventData;
  private readonly type: EventType;

  constructor(data: UserBannedEventData) {
    this.data = data;
    this.type = ServerSentEvents.USER_BANNED;
  }

  public getType(): EventType {
    return this.type;
  }

  public serialize(): UserBannedEventData {
    return this.data;
  }

  public getData(): UserBannedEventData {
    return this.data;
  }

  public getBanExpirationTime(): number {
    return this.data.banExpirationTime;
  }

  public getReason(): string | undefined {
    return this.data.reason;
  }

  /**
   * Get remaining ban time in milliseconds
   */
  public getRemainingBanTimeMs(): number {
    return Math.max(0, this.data.banExpirationTime - Date.now());
  }

  /**
   * Get remaining ban time in minutes
   */
  public getRemainingBanTimeMinutes(): number {
    return Math.ceil(this.getRemainingBanTimeMs() / (60 * 1000));
  }

  static serializeToBuffer(writer: BufferWriter, data: UserBannedEventData): void {
    writer.writeFloat64(data.banExpirationTime);
    writer.writeUInt8(data.reason !== undefined ? 1 : 0);
    if (data.reason !== undefined) {
      writer.writeString(data.reason);
    }
  }

  static deserializeFromBuffer(reader: BufferReader): UserBannedEventData {
    const banExpirationTime = reader.readFloat64();
    const hasReason = reader.readUInt8() === 1;
    const reason = hasReason ? reader.readString() : undefined;
    return { banExpirationTime, reason };
  }
}

