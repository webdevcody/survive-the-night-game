import { Broadcaster } from "@survive-the-night/game-server/src/managers/types";
import { vi } from "vitest";

export function createMockBroadcaster() {
  return {
    broadcastEvent: vi.fn(),
  } as Broadcaster;
}
