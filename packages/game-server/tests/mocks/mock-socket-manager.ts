import { ServerSocketManager } from "../../src/managers/server-socket-manager";
import { Broadcaster } from "../../src/managers/types";
import { GameEvent } from "../../src/shared/events/types";

export class MockSocketManager implements Broadcaster {
  constructor() {}

  public broadcastEvent(event: GameEvent<any>): void {}
}

export const createMockSocketManager = () => {
  return new MockSocketManager() as unknown as ServerSocketManager;
};
