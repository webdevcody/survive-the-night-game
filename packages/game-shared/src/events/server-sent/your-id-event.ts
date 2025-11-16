import { EventType, ServerSentEvents } from "../events";
import { GameEvent } from "@/events/types";

export class YourIdEvent implements GameEvent<number> {
  private readonly type: EventType;
  private readonly playerId: number;

  constructor(playerId: number) {
    this.type = ServerSentEvents.YOUR_ID;
    this.playerId = playerId;
  }

  getType(): EventType {
    return this.type;
  }

  getPlayerId(): number {
    return this.playerId;
  }

  serialize(): number {
    return this.playerId;
  }
}
