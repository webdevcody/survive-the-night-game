import { EventType, ServerSentEvents } from "../events";
import { GameEvent } from "../types";

export class PlayerPickedUpItemEvent implements GameEvent<string> {
  private type: EventType;
  private playerId: string;
  private itemKey: string;

  constructor(playerId: string, itemKey: string) {
    this.type = ServerSentEvents.PLAYER_PICKED_UP_ITEM;
    this.playerId = playerId;
    this.itemKey = itemKey;
  }

  getType(): EventType {
    return this.type;
  }

  getPlayerId(): string {
    return this.playerId;
  }

  serialize(): any {
    return {
      playerId: this.playerId,
      itemKey: this.itemKey,
    };
  }

  deserialize(data: any): PlayerPickedUpItemEvent {
    return new PlayerPickedUpItemEvent(data.playerId, data.itemKey);
  }
}
