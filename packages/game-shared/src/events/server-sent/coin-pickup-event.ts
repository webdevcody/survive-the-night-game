import { EventType, ServerSentEvents } from "../events";
import { GameEvent } from "@/events/types";

export class CoinPickupEvent implements GameEvent<string> {
  private readonly type: EventType;
  private readonly entityId: string;

  constructor(entityid: string) {
    this.type = ServerSentEvents.COIN_PICKUP;
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
