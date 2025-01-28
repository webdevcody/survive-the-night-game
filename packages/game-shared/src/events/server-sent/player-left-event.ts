import { ServerSentEvents, EventType } from "../events";
import { GameEvent } from "../types";

interface PlayerLeftEventData {
  playerId: string;
}

export class PlayerLeftEvent implements GameEvent<PlayerLeftEventData> {
  private type: EventType;
  private playerId: string;

  constructor(data: PlayerLeftEventData) {
    this.type = ServerSentEvents.PLAYER_LEFT;
    this.playerId = data.playerId;
  }

  getType(): EventType {
    return this.type;
  }

  getPlayerId(): string {
    return this.playerId;
  }

  serialize(): PlayerLeftEventData {
    return { playerId: this.playerId };
  }
}
