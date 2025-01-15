import { EventType, ServerSentEvents } from "../events";
import { GameEvent } from "../types";

export class LootEvent implements GameEvent<string> {
  private readonly type: EventType;
  private readonly entityId: string;

  constructor(entityid: string) {
    this.type = ServerSentEvents.LOOT;
    this.entityId = entityid;
  }

  getType(): EventType {
    return this.type;
  }

  getEntityId(): string {
    return this.entityId;
  }

  serialize(): string {
    return this.entityId;
  }
}
