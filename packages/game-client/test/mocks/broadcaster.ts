import { Broadcaster } from "@survive-the-night/game-server/src/managers/server-socket-manager";
import { vi } from "vitest";

export function createMockBroadcaster() {
  return {
    broadcastEvent: vi.fn(),
  } as Broadcaster;
}
