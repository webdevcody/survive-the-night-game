import { EventType, ServerSentEvents } from "../events";
import { GameEvent } from "@/events/types";

interface PlayerDroppedItemEventData {
  playerId: string;
  itemType: string;
}

export class PlayerDroppedItemEvent implements GameEvent<PlayerDroppedItemEventData> {
  private readonly type: EventType;
  private readonly playerId: string;
  private readonly itemType: string;

  constructor(data: PlayerDroppedItemEventData) {
    this.type = ServerSentEvents.PLAYER_DROPPED_ITEM;
    this.playerId = data.playerId;
    this.itemType = data.itemType;
  }

  getType(): EventType {
    return this.type;
  }

  getPlayerId(): string {
    return this.playerId;
  }

  serialize(): PlayerDroppedItemEventData {
    return {
      playerId: this.playerId,
      itemType: this.itemType,
    };
  }
}
