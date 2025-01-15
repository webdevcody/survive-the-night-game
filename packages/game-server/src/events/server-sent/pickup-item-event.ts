import { EventType, ServerSentEvents } from "@/events/events";
import { GameEvent } from "@/events/types";

interface PlayerPickedUpItemEventData {
  playerId: string;
  itemKey: string;
}

export class PlayerPickedUpItemEvent implements GameEvent<PlayerPickedUpItemEventData> {
  private readonly type: EventType;
  private readonly playerId: string;
  private readonly itemKey: string;

  constructor(data: PlayerPickedUpItemEventData) {
    this.type = ServerSentEvents.PLAYER_PICKED_UP_ITEM;
    this.playerId = data.playerId;
    this.itemKey = data.itemKey;
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
      itemKey: this.itemKey,
    };
  }
}
