import { Broadcaster } from "@/managers/server-socket-manager";
import { GameEvent } from "@/shared/events/types";

export class MockSocketManager implements Broadcaster {
  constructor() {}

  public broadcastEvent(event: GameEvent<any>): void {
    console.log(`MockSocketManager: Broadcasting event: ${event.getType()}`);
  }
}
