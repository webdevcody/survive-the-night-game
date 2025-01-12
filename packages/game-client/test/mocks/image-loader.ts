import { vi } from "vitest";

export function createMockImageLoader() {
  return {
    get: vi.fn().mockReturnValue(null),
  };
}
