import { ServerSentEvents, EventType } from "../events";
import { GameEvent } from "../types";

interface PlayerLeftEventData {
  playerId: string;
  displayName: string;
}

export class PlayerLeftEvent implements GameEvent<PlayerLeftEventData> {
  private type: EventType;
  private playerId: string;
  private displayName: string;

  constructor(data: PlayerLeftEventData) {
    this.type = ServerSentEvents.PLAYER_LEFT;
    this.playerId = data.playerId;
    this.displayName = data.displayName;
  }

  getType(): EventType {
    return this.type;
  }

  getPlayerId(): string {
    return this.playerId;
  }

  getDisplayName(): string {
    return this.displayName;
  }

  serialize(): PlayerLeftEventData {
    return { playerId: this.playerId, displayName: this.displayName };
  }
}
