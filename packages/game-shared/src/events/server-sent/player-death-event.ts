import { EventType, ServerSentEvents } from "../events";
import { GameEvent } from "@/events/types";

export class PlayerDeathEvent implements GameEvent<string> {
  private readonly type: EventType;
  private readonly playerId: string;

  constructor(playerId: string) {
    this.type = ServerSentEvents.PLAYER_DEATH;
    this.playerId = playerId;
  }

  getType(): EventType {
    return this.type;
  }

  getPlayerId(): string {
    return this.playerId;
  }

  serialize(): string {
    return this.playerId;
  }
}
