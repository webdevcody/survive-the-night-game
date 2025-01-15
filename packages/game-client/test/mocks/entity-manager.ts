import { EntityManager } from "@server/managers/entity-manager";
import { vi } from "vitest";

export function createMockEntityManager() {
  return {
    getEntityById: vi.fn(),
  } as unknown as EntityManager;
}
