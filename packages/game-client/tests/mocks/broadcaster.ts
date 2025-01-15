import { Broadcaster } from "@server/managers/types";
import { vi } from "vitest";

export function createMockBroadcaster() {
  return {
    broadcastEvent: vi.fn(),
  } as Broadcaster;
}
