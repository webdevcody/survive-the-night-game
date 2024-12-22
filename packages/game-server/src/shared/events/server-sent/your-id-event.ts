import { EventType, ServerSentEvents } from "../events";
import { GameEvent } from "../types";

export class YourIdEvent implements GameEvent<string> {
  private type: EventType;
  private playerId: string;

  constructor(playerId: string) {
    this.type = ServerSentEvents.YOUR_ID;
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

  deserialize(data: any): YourIdEvent {
    return new YourIdEvent(data);
  }
}
