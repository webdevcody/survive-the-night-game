import { EventType, ServerSentEvents } from "@/events/events";
import { GameEvent } from "@/events/types";

export class GameOverEvent implements GameEvent<void> {
  private readonly type: EventType;

  constructor() {
    this.type = ServerSentEvents.GAME_OVER;
  }

  getType(): EventType {
    return this.type;
  }

  serialize(): void {
    return;
  }

  getGameState(): void {
    return;
  }
}
