import { GameEvent } from "../types";
import { ServerSentEvents } from "../events";

export class PlayerRevivedEvent implements GameEvent<{ playerId: string }> {
  private readonly type = ServerSentEvents.PLAYER_REVIVED;

  constructor(private playerId: string) {}

  getType() {
    return this.type;
  }

  serialize() {
    return { playerId: this.playerId };
  }
}
