import { EventType, ServerSentEvents } from "../events";
import { GameEvent } from "@/events/types";

export class CraftEvent implements GameEvent<number> {
  private readonly type: EventType;
  private readonly playerId: number;

  constructor(playerId: number) {
    this.type = ServerSentEvents.CRAFT;
    this.playerId = playerId;
  }

  getType(): EventType {
    return this.type;
  }

  serialize(): number {
    return this.playerId;
  }

  getPlayerId(): number {
    return this.playerId;
  }
}

