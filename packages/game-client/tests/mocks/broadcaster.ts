import { vi } from "vitest";
import { Broadcaster } from "@server/managers/types";

export function createMockBroadcaster() {
  return {
    broadcastEvent: vi.fn(),
  } as Broadcaster;
}
