import { ServerSocketManager } from "@/managers/server-socket-manager";
import { Broadcaster } from "@/managers/types";
import { GameEvent } from "@/shared/events/types";

export class MockSocketManager implements Broadcaster {
  constructor() {}

  public broadcastEvent(event: GameEvent<any>): void {}
}

export const createMockSocketManager = () => {
  return new MockSocketManager() as unknown as ServerSocketManager;
};
