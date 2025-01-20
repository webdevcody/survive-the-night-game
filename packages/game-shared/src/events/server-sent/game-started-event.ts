import { GameEvent } from "@/events/types";
import { ServerSentEvents } from "../events";

export class GameStartedEvent implements GameEvent<void> {
  constructor() {}

  public getType() {
    return ServerSentEvents.GAME_STARTED;
  }

  public serialize(): void {
    return undefined;
  }
}
