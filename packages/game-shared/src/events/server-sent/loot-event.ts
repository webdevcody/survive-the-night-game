import { EventType, ServerSentEvents } from "../events";
import { GameEvent } from "@/events/types";

export class LootEvent implements GameEvent<number> {
  private readonly type: EventType;
  private readonly entityId: number;

  constructor(entityid: number) {
    this.type = ServerSentEvents.LOOT;
    this.entityId = entityid;
  }

  getType(): EventType {
    return this.type;
  }

  getEntityId(): number {
    return this.entityId;
  }

  serialize(): number {
    return this.entityId;
  }
}
