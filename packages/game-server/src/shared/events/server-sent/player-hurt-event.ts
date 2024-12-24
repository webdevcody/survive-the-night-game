import { EventType, ServerSentEvents } from "../events";
import { GameEvent } from "../types";

export class PlayerHurtEvent implements GameEvent<string> {
  private type: EventType;
  private playerId: string;

  constructor(playerId: string) {
    this.type = ServerSentEvents.PLAYER_HURT;
    this.playerId = playerId;
  }

  getType(): EventType {
    return this.type;
  }

  getPlayerId(): string {
    return this.playerId;
  }

  serialize(): any {
    return this.playerId;
  }

  deserialize(data: any): PlayerHurtEvent {
    return new PlayerHurtEvent(data);
  }
}
