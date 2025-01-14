import { Broadcaster } from "../../src/managers/types";
import { GameEvent } from "../../src/shared/events/types";

export class MockSocketManager implements Broadcaster {
  constructor() {}

  public broadcastEvent(event: GameEvent<any>): void {}
}
