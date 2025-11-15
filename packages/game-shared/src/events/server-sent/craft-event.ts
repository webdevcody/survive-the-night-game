import { EventType, ServerSentEvents } from "../events";
import { GameEvent } from "@/events/types";

export class CraftEvent implements GameEvent<string> {
  private readonly type: EventType;
  private readonly playerId: string;

  constructor(playerId: string) {
    this.type = ServerSentEvents.CRAFT;
    this.playerId = playerId;
  }

  getType(): EventType {
    return this.type;
  }

  serialize(): string {
    return this.playerId;
  }

  getPlayerId(): string {
    return this.playerId;
  }
}

