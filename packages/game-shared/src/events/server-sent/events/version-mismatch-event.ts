import { GameEvent } from "../../types";
import { EventType, ServerSentEvents } from "../../events";
import { BufferWriter, BufferReader } from "../../../util/buffer-serialization";

export interface VersionMismatchEventData {
  serverVersion: string;
  clientVersion?: string;
}

export class VersionMismatchEvent implements GameEvent<VersionMismatchEventData> {
  private data: VersionMismatchEventData;
  private readonly type: EventType;

  constructor(data: VersionMismatchEventData) {
    this.data = data;
    this.type = ServerSentEvents.VERSION_MISMATCH;
  }

  public getType(): EventType {
    return this.type;
  }

  public serialize(): VersionMismatchEventData {
    return this.data;
  }

  public getData(): VersionMismatchEventData {
    return this.data;
  }

  public getServerVersion(): string {
    return this.data.serverVersion;
  }

  public getClientVersion(): string | undefined {
    return this.data.clientVersion;
  }

  static serializeToBuffer(writer: BufferWriter, data: VersionMismatchEventData): void {
    writer.writeString(data.serverVersion);
    writer.writeUInt8(data.clientVersion !== undefined ? 1 : 0);
    if (data.clientVersion !== undefined) {
      writer.writeString(data.clientVersion);
    }
  }

  static deserializeFromBuffer(reader: BufferReader): VersionMismatchEventData {
    const serverVersion = reader.readString();
    const hasClientVersion = reader.readUInt8() === 1;
    const clientVersion = hasClientVersion ? reader.readString() : undefined;
    return { serverVersion, clientVersion };
  }
}
