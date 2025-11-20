import { GameEvent } from "@/events/types";
import { EventType, ServerSentEvents } from "../../events";

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
}
