import { ImageLoader } from "@/managers/asset";
import { vi } from "vitest";

export function createMockImageLoader() {
  return {
    get: vi.fn().mockReturnValue(null),
    getWithDirection: vi.fn().mockReturnValue(null),
    getFrameIndex: vi.fn().mockReturnValue(null),
    getFrameWithDirection: vi.fn().mockReturnValue(null),
  } as ImageLoader;
}
