import { Broadcaster } from "@/managers/types";
import { GameEvent } from "@/shared/events/types";

export class MockSocketManager implements Broadcaster {
  constructor() {}

  public broadcastEvent(event: GameEvent<any>): void {}
}
