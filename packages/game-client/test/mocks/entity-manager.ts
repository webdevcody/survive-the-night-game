import { EntityManager } from "@survive-the-night/game-server/src/managers/entity-manager";
import { vi } from "vitest";

export function createMockEntityManager() {
  return {
    getEntityById: vi.fn(),
  } as unknown as EntityManager;
}
