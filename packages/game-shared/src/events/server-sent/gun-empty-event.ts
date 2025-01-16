import { EventType, ServerSentEvents } from "../events";
import { GameEvent } from "@/events/types";

export class GunEmptyEvent implements GameEvent<string> {
  private readonly type: EventType;
  private readonly entityId: string;

  constructor(entityid: string) {
    this.type = ServerSentEvents.GUN_EMPTY;
    this.entityId = entityid;
  }

  getType(): EventType {
    return this.type;
  }

  serialize(): string {
    return this.entityId;
  }

  getEntityId(): string {
    return this.entityId;
  }
}
