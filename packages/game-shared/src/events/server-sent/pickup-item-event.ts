import { EventType, ServerSentEvents } from "../events";
import { GameEvent } from "@/events/types";

interface PlayerPickedUpItemEventData {
  playerId: string;
  itemType: string;
}

export class PlayerPickedUpItemEvent implements GameEvent<PlayerPickedUpItemEventData> {
  private readonly type: EventType;
  private readonly playerId: string;
  private readonly itemType: string;

  constructor(data: PlayerPickedUpItemEventData) {
    this.type = ServerSentEvents.PLAYER_PICKED_UP_ITEM;
    this.playerId = data.playerId;
    this.itemType = data.itemType;
  }

  getType(): EventType {
    return this.type;
  }

  getPlayerId(): string {
    return this.playerId;
  }

  serialize(): PlayerPickedUpItemEventData {
    return {
      playerId: this.playerId,
      itemType: this.itemType,
    };
  }
}
